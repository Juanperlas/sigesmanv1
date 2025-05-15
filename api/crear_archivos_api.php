<?php
// Incluir archivos necesarios
require_once '../db/funciones.php';
require_once '../db/conexion.php';

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso no permitido']);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

// Verificar que se proporcionaron los datos necesarios
if (!isset($_POST['modulo']) || empty($_POST['modulo']) || !isset($_POST['archivos']) || !is_array($_POST['archivos'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$modulo = sanitizar($_POST['modulo']);
$archivos = $_POST['archivos'];

// Validar que el módulo no contenga caracteres peligrosos
if (preg_match('/[^a-zA-Z0-9\/\-_]/', $modulo)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Módulo no válido']);
    exit;
}

// Ruta base de la API
$rutaBase = __DIR__;

// Ruta completa del módulo
$rutaModulo = $rutaBase . '/' . $modulo;

// Verificar si el directorio existe, si no, crearlo
if (!is_dir($rutaModulo)) {
    if (!mkdir($rutaModulo, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'No se pudo crear el directorio del módulo']);
        exit;
    }
}

// Archivos creados y errores
$archivosCreados = [];
$errores = [];

// Crear cada archivo solicitado
foreach ($archivos as $archivo) {
    // Validar nombre de archivo
    if (preg_match('/[^a-zA-Z0-9\._-]/', $archivo)) {
        $errores[] = "Nombre de archivo no válido: $archivo";
        continue;
    }

    // Ruta completa del archivo
    $rutaArchivo = $rutaModulo . '/' . $archivo;

    // Verificar si el archivo ya existe
    if (file_exists($rutaArchivo)) {
        $archivosCreados[] = $archivo . ' (ya existía)';
        continue;
    }

    // Contenido del archivo según su nombre
    $contenido = '';
    switch ($archivo) {
        case 'generar.php':
            $contenido = generarContenidoGenerar($modulo);
            break;
        case 'listar.php':
            $contenido = generarContenidoListar($modulo);
            break;
        case 'obtener.php':
            $contenido = generarContenidoObtener($modulo);
            break;
        case 'completar.php':
            $contenido = generarContenidoCompletar($modulo);
            break;
        default:
            $errores[] = "No hay plantilla para el archivo: $archivo";
            continue;
    }

    // Crear el archivo
    if (file_put_contents($rutaArchivo, $contenido)) {
        $archivosCreados[] = $archivo;
    } else {
        $errores[] = "No se pudo crear el archivo: $archivo";
    }
}

// Preparar respuesta
$response = [
    'success' => count($archivosCreados) > 0,
    'message' => count($errores) > 0 ? implode(', ', $errores) : 'Archivos creados correctamente',
    'archivos_creados' => $archivosCreados,
    'errores' => $errores
];

// Devolver respuesta en formato JSON
header('Content-Type: application/json');
echo json_encode($response);

/**
 * Genera el contenido para el archivo generar.php
 * @param string $modulo Ruta del módulo
 * @return string Contenido del archivo
 */
function generarContenidoGenerar($modulo)
{
    return '<?php
// Incluir archivos necesarios
require_once "../../../db/funciones.php";
require_once "../../../db/conexion.php";

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER["HTTP_X_REQUESTED_WITH"]) &&
    strtolower($_SERVER["HTTP_X_REQUESTED_WITH"]) === "xmlhttprequest";

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Acceso no permitido"]);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autenticado"]);
    exit;
}

// Verificar permiso
if (!tienePermiso("mantenimientos.preventivo.acceder")) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No tiene permisos para acceder a este recurso"]);
    exit;
}

// Inicializar respuesta
$response = [
    "success" => false,
    "message" => "",
    "total_generados" => 0,
    "equipos_generados" => 0,
    "componentes_generados" => 0
];

try {
    // Obtener conexión a la base de datos
    $conexion = new Conexion();
    $conn = $conexion->getConexion();
    
    // Iniciar transacción
    $conn->beginTransaction();
    
    // 1. Verificar equipos que necesitan mantenimiento preventivo
    $equiposGenerados = verificarYGenerarMantenimientoEquipos($conexion);
    
    // 2. Verificar componentes que necesitan mantenimiento preventivo
    $componentesGenerados = verificarYGenerarMantenimientoComponentes($conexion);
    
    // Confirmar transacción
    $conn->commit();
    
    // Preparar respuesta
    $response["success"] = true;
    $response["total_generados"] = $equiposGenerados + $componentesGenerados;
    $response["equipos_generados"] = $equiposGenerados;
    $response["componentes_generados"] = $componentesGenerados;
    $response["message"] = "Verificación de mantenimientos preventivos completada";
    
} catch (PDOException $e) {
    // Revertir transacción en caso de error
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    
    $response["success"] = false;
    $response["message"] = "Error al generar mantenimientos preventivos: " . $e->getMessage();
    
    // Registrar error en log
    error_log("Error en generar.php: " . $e->getMessage());
}

// Devolver respuesta en formato JSON
header("Content-Type: application/json");
echo json_encode($response);

/**
 * Verifica y genera mantenimientos preventivos para equipos
 * @param Conexion $conexion Conexión a la base de datos
 * @return int Número de mantenimientos generados
 */
function verificarYGenerarMantenimientoEquipos($conexion) {
    $generados = 0;
    
    // Obtener equipos que necesitan mantenimiento preventivo
    $sql = "SELECT e.* FROM equipos e 
            LEFT JOIN mantenimiento_preventivo mp ON mp.equipo_id = e.id AND mp.estado = \'pendiente\'
            WHERE e.estado = \'activo\' 
            AND (mp.id IS NULL OR (e.orometro_actual + e.notificacion >= e.proximo_orometro))
            AND e.mantenimiento > 0";
    
    $equipos = $conexion->select($sql);
    
    foreach ($equipos as $equipo) {
        // Verificar si ya existe un mantenimiento pendiente para este equipo
        $sqlVerificar = "SELECT COUNT(*) as total FROM mantenimiento_preventivo 
                         WHERE equipo_id = ? AND estado = \'pendiente\'";
        $resultado = $conexion->selectOne($sqlVerificar, [$equipo["id"]]);
        
        if ($resultado["total"] == 0) {
            // No existe mantenimiento pendiente, crear uno nuevo
            $proximoOrometro = $equipo["orometro_actual"] + $equipo["mantenimiento"];
            $descripcion = "Mantenimiento preventivo programado para el equipo {$equipo["nombre"]} (Código: {$equipo["codigo"]})";
            
            $datos = [
                "equipo_id" => $equipo["id"],
                "descripcion_razon" => $descripcion,
                "fecha_hora_programada" => date("Y-m-d H:i:s", strtotime("+7 days")),
                "orometro_programado" => $proximoOrometro
            ];
            
            $id = $conexion->insert("mantenimiento_preventivo", $datos);
            
            if ($id) {
                $generados++;
                
                // Actualizar próximo orómetro del equipo
                $conexion->update(
                    "equipos",
                    ["proximo_orometro" => $proximoOrometro],
                    "id = ?",
                    [$equipo["id"]]
                );
            }
        }
    }
    
    return $generados;
}

/**
 * Verifica y genera mantenimientos preventivos para componentes
 * @param Conexion $conexion Conexión a la base de datos
 * @return int Número de mantenimientos generados
 */
function verificarYGenerarMantenimientoComponentes($conexion) {
    $generados = 0;
    
    // Obtener componentes que necesitan mantenimiento preventivo
    $sql = "SELECT c.* FROM componentes c 
            LEFT JOIN mantenimiento_preventivo mp ON mp.componente_id = c.id AND mp.estado = \'pendiente\'
            WHERE c.estado = \'activo\' 
            AND (mp.id IS NULL OR (c.orometro_actual + c.notificacion >= c.proximo_orometro))
            AND c.mantenimiento > 0";
    
    $componentes = $conexion->select($sql);
    
    foreach ($componentes as $componente) {
        // Verificar si ya existe un mantenimiento pendiente para este componente
        $sqlVerificar = "SELECT COUNT(*) as total FROM mantenimiento_preventivo 
                         WHERE componente_id = ? AND estado = \'pendiente\'";
        $resultado = $conexion->selectOne($sqlVerificar, [$componente["id"]]);
        
        if ($resultado["total"] == 0) {
            // No existe mantenimiento pendiente, crear uno nuevo
            $proximoOrometro = $componente["orometro_actual"] + $componente["mantenimiento"];
            $descripcion = "Mantenimiento preventivo programado para el componente {$componente["nombre"]} (Código: {$componente["codigo"]})";
            
            $datos = [
                "componente_id" => $componente["id"],
                "descripcion_razon" => $descripcion,
                "fecha_hora_programada" => date("Y-m-d H:i:s", strtotime("+7 days")),
                "orometro_programado" => $proximoOrometro
            ];
            
            $id = $conexion->insert("mantenimiento_preventivo", $datos);
            
            if ($id) {
                $generados++;
                
                // Actualizar próximo orómetro del componente
                $conexion->update(
                    "componentes",
                    ["proximo_orometro" => $proximoOrometro],
                    "id = ?",
                    [$componente["id"]]
                );
            }
        }
    }
    
    return $generados;
}
?>';
}

/**
 * Genera el contenido para el archivo listar.php
 * @param string $modulo Ruta del módulo
 * @return string Contenido del archivo
 */
function generarContenidoListar($modulo)
{
    return '<?php
// Incluir archivos necesarios
require_once "../../../db/funciones.php";
require_once "../../../db/conexion.php";

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER["HTTP_X_REQUESTED_WITH"]) &&
    strtolower($_SERVER["HTTP_X_REQUESTED_WITH"]) === "xmlhttprequest";

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Acceso no permitido"]);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autenticado"]);
    exit;
}

// Verificar permiso
if (!tienePermiso("mantenimientos.preventivo.ver")) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No tiene permisos para ver mantenimientos preventivos"]);
    exit;
}

// Parámetros de DataTables
$draw = isset($_POST["draw"]) ? intval($_POST["draw"]) : 1;
$start = isset($_POST["start"]) ? intval($_POST["start"]) : 0;
$length = isset($_POST["length"]) ? intval($_POST["length"]) : 10;
$search = isset($_POST["search"]["value"]) ? $_POST["search"]["value"] : "";

// Columna y dirección de ordenamiento
$orderColumn = isset($_POST["order"][0]["column"]) ? intval($_POST["order"][0]["column"]) : 0;
$orderDir = isset($_POST["order"][0]["dir"]) ? $_POST["order"][0]["dir"] : "asc";

// Mapeo de columnas para ordenamiento
$columns = [
    "mp.fecha_hora_programada",
    "tipo",
    "codigo",
    "nombre",
    "mp.descripcion_razon",
    "orometro_actual",
    "mp.orometro_programado",
    "mp.estado"
];

// Filtros adicionales
$filtros = [];
$params = [];

// Filtro por estado
if (isset($_POST["estado"]) && $_POST["estado"] !== "") {
    $filtros[] = "mp.estado = ?";
    $params[] = $_POST["estado"];
}

// Filtro por tipo (equipo o componente)
if (isset($_POST["tipo"]) && $_POST["tipo"] !== "") {
    if ($_POST["tipo"] === "equipo") {
        $filtros[] = "mp.equipo_id IS NOT NULL";
    } else if ($_POST["tipo"] === "componente") {
        $filtros[] = "mp.componente_id IS NOT NULL";
    }
}

// Filtro por fecha desde
if (isset($_POST["fecha_desde"]) && $_POST["fecha_desde"] !== "") {
    $filtros[] = "DATE(mp.fecha_hora_programada) >= ?";
    $params[] = $_POST["fecha_desde"];
}

// Filtro por fecha hasta
if (isset($_POST["fecha_hasta"]) && $_POST["fecha_hasta"] !== "") {
    $filtros[] = "DATE(mp.fecha_hora_programada) <= ?";
    $params[] = $_POST["fecha_hasta"];
}

// Filtro de búsqueda global
if ($search !== "") {
    $filtros[] = "(
        e.codigo LIKE ? OR 
        e.nombre LIKE ? OR 
        c.codigo LIKE ? OR 
        c.nombre LIKE ? OR 
        mp.descripcion_razon LIKE ?
    )";
    $searchParam = "%$search%";
    $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
}

// Construir la condición WHERE
$where = "";
if (!empty($filtros)) {
    $where = "WHERE " . implode(" AND ", $filtros);
}

try {
    // Conexión a la base de datos
    $conexion = new Conexion();
    
    // Consulta para contar registros totales (sin filtros)
    $sqlTotal = "SELECT COUNT(*) as total FROM mantenimiento_preventivo";
    $resultadoTotal = $conexion->selectOne($sqlTotal);
    $totalRecords = $resultadoTotal["total"];
    
    // Consulta para contar registros filtrados
    $sqlFiltered = "
        SELECT COUNT(*) as total 
        FROM mantenimiento_preventivo mp
        LEFT JOIN equipos e ON mp.equipo_id = e.id
        LEFT JOIN componentes c ON mp.componente_id = c.id
        $where
    ";
    
    $resultadoFiltered = $conexion->selectOne($sqlFiltered, $params);
    $totalFiltered = $resultadoFiltered["total"];
    
    // Consulta principal para obtener los datos
    $sql = "
        SELECT 
            mp.id,
            mp.equipo_id,
            mp.componente_id,
            mp.descripcion_razon as descripcion,
            mp.fecha_hora_programada,
            mp.orometro_programado as proximo_orometro,
            mp.estado,
            mp.fecha_realizado,
            mp.observaciones,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN \'equipo\'
                ELSE \'componente\'
            END as tipo,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN e.codigo
                ELSE c.codigo
            END as codigo_equipo,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN e.nombre
                ELSE c.nombre
            END as nombre_equipo,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN e.orometro_actual
                ELSE c.orometro_actual
            END as orometro_actual_valor,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN e.tipo_orometro
                ELSE c.tipo_orometro
            END as tipo_orometro,
            DATEDIFF(mp.fecha_hora_programada, NOW()) as dias_restantes
        FROM mantenimiento_preventivo mp
        LEFT JOIN equipos e ON mp.equipo_id = e.id
        LEFT JOIN componentes c ON mp.componente_id = c.id
        $where
    ";
    
    // Aplicar ordenamiento
    if (isset($columns[$orderColumn])) {
        $sql .= " ORDER BY {$columns[$orderColumn]} $orderDir";
    } else {
        $sql .= " ORDER BY mp.fecha_hora_programada ASC";
    }
    
    // Aplicar paginación
    $sql .= " LIMIT $start, $length";
    
    // Ejecutar consulta
    $mantenimientos = $conexion->select($sql, $params);
    
    // Preparar datos para la respuesta
    $data = [];
    foreach ($mantenimientos as $row) {
        // Calcular días restantes y clase CSS
        $diasRestantes = $row["dias_restantes"];
        $esFechaFutura = $diasRestantes >= 0;
        
        if ($esFechaFutura) {
            if ($diasRestantes <= 3) {
                $diasRestantesClase = "text-danger fw-bold";
            } else if ($diasRestantes <= 7) {
                $diasRestantesClase = "text-warning fw-bold";
            } else {
                $diasRestantesClase = "text-success";
            }
        } else {
            $diasRestantesClase = "text-danger fw-bold";
        }
        
        // Calcular progreso del orómetro
        $orometroActual = floatval($row["orometro_actual_valor"]);
        $proximoOrometro = floatval($row["proximo_orometro"]);
        
        // Evitar división por cero
        if ($proximoOrometro > 0) {
            $progreso = min(($orometroActual / $proximoOrometro) * 100, 100);
        } else {
            $progreso = 0;
        }
        
        // Determinar clase para la barra de progreso
        if ($progreso >= 90) {
            $progresoClase = "bg-danger";
        } else if ($progreso >= 75) {
            $progresoClase = "bg-warning";
        } else {
            $progresoClase = "bg-success";
        }
        
        // Determinar clase para el estado
        switch ($row["estado"]) {
            case "pendiente":
                $estadoClase = "estado-pendiente";
                break;
            case "completado":
                $estadoClase = "estado-completado";
                break;
            case "cancelado":
                $estadoClase = "estado-cancelado";
                break;
            default:
                $estadoClase = "";
        }
        
        // Formatear fecha
        $fechaFormateada = date("d/m/Y", strtotime($row["fecha_hora_programada"]));
        
        // Formatear orómetro
        $unidad = $row["tipo_orometro"] === "horas" ? "hrs" : "km";
        $orometroActualFormateado = number_format($orometroActual, 2) . " " . $unidad;
        $proximoOrometroFormateado = number_format($proximoOrometro, 2) . " " . $unidad;
        
        // Agregar datos a la respuesta
        $data[] = [
            "id" => $row["id"],
            "equipo_id" => $row["equipo_id"],
            "componente_id" => $row["componente_id"],
            "tipo" => $row["tipo"],
            "codigo_equipo" => $row["codigo_equipo"],
            "nombre_equipo" => $row["nombre_equipo"],
            "descripcion" => $row["descripcion"],
            "fecha_programada" => $row["fecha_hora_programada"],
            "fecha_formateada" => $fechaFormateada,
            "orometro_actual" => $orometroActualFormateado,
            "orometro_actual_valor" => $orometroActual,
            "proximo_orometro" => $proximoOrometroFormateado,
            "proximo_orometro_valor" => $proximoOrometro,
            "estado" => $row["estado"],
            "estado_clase" => $estadoClase,
            "dias_restantes" => $diasRestantes,
            "dias_restantes_clase" => $diasRestantesClase,
            "es_fecha_futura" => $esFechaFutura,
            "progreso" => $progreso,
            "progreso_clase" => $progresoClase
        ];
    }
    
    // Preparar respuesta para DataTables
    $response = [
        "draw" => $draw,
        "recordsTotal" => $totalRecords,
        "recordsFiltered" => $totalFiltered,
        "data" => $data
    ];
    
} catch (Exception $e) {
    // Preparar respuesta de error
    $response = [
        "draw" => $draw,
        "recordsTotal" => 0,
        "recordsFiltered" => 0,
        "data" => [],
        "error" => "Error al obtener los datos: " . $e->getMessage()
    ];
    
    // Registrar error en log
    error_log("Error en listar.php: " . $e->getMessage());
}

// Devolver respuesta en formato JSON
header("Content-Type: application/json");
echo json_encode($response);
?>';
}

/**
 * Genera el contenido para el archivo obtener.php
 * @param string $modulo Ruta del módulo
 * @return string Contenido del archivo
 */
function generarContenidoObtener($modulo)
{
    return '<?php
// Incluir archivos necesarios
require_once "../../../db/funciones.php";
require_once "../../../db/conexion.php";

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER["HTTP_X_REQUESTED_WITH"]) &&
    strtolower($_SERVER["HTTP_X_REQUESTED_WITH"]) === "xmlhttprequest";

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Acceso no permitido"]);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autenticado"]);
    exit;
}

// Verificar permiso
if (!tienePermiso("mantenimientos.preventivo.ver")) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No tiene permisos para ver mantenimientos preventivos"]);
    exit;
}

// Verificar que se proporcionó un ID
if (!isset($_GET["id"]) || empty($_GET["id"])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "ID de mantenimiento no proporcionado"]);
    exit;
}

$id = intval($_GET["id"]);

try {
    // Conexión a la base de datos
    $conexion = new Conexion();
    
    // Obtener datos del mantenimiento preventivo
    $sql = "
        SELECT 
            mp.*,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN \'equipo\'
                ELSE \'componente\'
            END as tipo,
            DATEDIFF(mp.fecha_hora_programada, NOW()) as dias_restantes
        FROM mantenimiento_preventivo mp
        WHERE mp.id = ?
    ";
    
    $mantenimiento = $conexion->selectOne($sql, [$id]);
    
    if (!$mantenimiento) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Mantenimiento no encontrado"]);
        exit;
    }
    
    // Determinar si es equipo o componente
    $tipo = $mantenimiento["tipo"];
    $equipo = null;
    $componente = null;
    $unidadOrometro = "";
    
    if ($tipo === "equipo") {
        // Obtener datos del equipo
        $sqlEquipo = "
            SELECT 
                e.*,
                ce.nombre as categoria_nombre
            FROM equipos e
            LEFT JOIN categorias_equipos ce ON e.categoria_id = ce.id
            WHERE e.id = ?
        ";
        
        $equipo = $conexion->selectOne($sqlEquipo, [$mantenimiento["equipo_id"]]);
        $unidadOrometro = $equipo["tipo_orometro"] === "horas" ? "hrs" : "km";
        
        // Si no tiene imagen, usar una por defecto
        if (empty($equipo["imagen"])) {
            $equipo["imagen"] = getAssetUrl("assets/img/equipos/default.png");
        } else {
            $equipo["imagen"] = getAssetUrl($equipo["imagen"]);
        }
    } else {
        // Obtener datos del componente
        $sqlComponente = "
            SELECT 
                c.*,
                e.nombre as equipo_nombre,
                e.codigo as equipo_codigo
            FROM componentes c
            LEFT JOIN equipos e ON c.equipo_id = e.id
            WHERE c.id = ?
        ";
        
        $componente = $conexion->selectOne($sqlComponente, [$mantenimiento["componente_id"]]);
        $unidadOrometro = $componente["tipo_orometro"] === "horas" ? "hrs" : "km";
        
        // Si no tiene imagen, usar una por defecto
        if (empty($componente["imagen"])) {
            $componente["imagen"] = getAssetUrl("assets/img/componentes/default.png");
        } else {
            $componente["imagen"] = getAssetUrl($componente["imagen"]);
        }
    }
    
    // Calcular días restantes y clase CSS
    $diasRestantes = $mantenimiento["dias_restantes"];
    $esFechaFutura = $diasRestantes >= 0;
    
    // Calcular progreso del orómetro
    $orometroActual = 0;
    $proximoOrometro = floatval($mantenimiento["orometro_programado"]);
    
    if ($tipo === "equipo" && $equipo) {
        $orometroActual = floatval($equipo["orometro_actual"]);
    } else if ($tipo === "componente" && $componente) {
        $orometroActual = floatval($componente["orometro_actual"]);
    }
    
    // Evitar división por cero
    if ($proximoOrometro > 0) {
        $progreso = min(($orometroActual / $proximoOrometro) * 100, 100);
    } else {
        $progreso = 0;
    }
    
    // Formatear fecha
    $fechaFormateada = date("d/m/Y", strtotime($mantenimiento["fecha_hora_programada"]));
    
    // Preparar respuesta
    $response = [
        "success" => true,
        "data" => [
            "mantenimiento" => $mantenimiento,
            "tipo" => $tipo,
            "equipo" => $equipo,
            "componente" => $componente,
            "unidad_orometro" => $unidadOrometro,
            "dias_restantes" => $diasRestantes,
            "es_fecha_futura" => $esFechaFutura,
            "progreso" => $progreso,
            "fecha_formateada" => $fechaFormateada
        ]
    ];
    
} catch (Exception $e) {
    // Preparar respuesta de error
    $response = [
        "success" => false,
        "message" => "Error al obtener los datos del mantenimiento: " . $e->getMessage()
    ];
    
    // Registrar error en log
    error_log("Error en obtener.php: " . $e->getMessage());
}

// Devolver respuesta en formato JSON
header("Content-Type: application/json");
echo json_encode($response);
?>';
}

/**
 * Genera el contenido para el archivo completar.php
 * @param string $modulo Ruta del módulo
 * @return string Contenido del archivo
 */
function generarContenidoCompletar($modulo)
{
    return '<?php
// Incluir archivos necesarios
require_once "../../../db/funciones.php";
require_once "../../../db/conexion.php";

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER["HTTP_X_REQUESTED_WITH"]) &&
    strtolower($_SERVER["HTTP_X_REQUESTED_WITH"]) === "xmlhttprequest";

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Acceso no permitido"]);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autenticado"]);
    exit;
}

// Verificar permiso
if (!tienePermiso("mantenimientos.preventivo.editar")) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No tiene permisos para completar mantenimientos"]);
    exit;
}

// Verificar método de solicitud
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit;
}

// Verificar que se proporcionaron los datos necesarios
if (!isset($_POST["id"]) || empty($_POST["id"]) || !isset($_POST["orometro_actual"]) || $_POST["orometro_actual"] === "") {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

$id = intval($_POST["id"]);
$orometroActual = floatval($_POST["orometro_actual"]);
$observaciones = isset($_POST["observaciones"]) ? sanitizar($_POST["observaciones"]) : "";

try {
    // Conexión a la base de datos
    $conexion = new Conexion();
    $conn = $conexion->getConexion();
    
    // Iniciar transacción
    $conn->beginTransaction();
    
    // Obtener datos del mantenimiento preventivo
    $sql = "
        SELECT 
            mp.*,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN \'equipo\'
                ELSE \'componente\'
            END as tipo
        FROM mantenimiento_preventivo mp
        WHERE mp.id = ?
    ";
    
    $mantenimiento = $conexion->selectOne($sql, [$id]);
    
    if (!$mantenimiento) {
        throw new Exception("Mantenimiento no encontrado");
    }
    
    if ($mantenimiento["estado"] !== "pendiente") {
        throw new Exception("Este mantenimiento ya ha sido completado o cancelado");
    }
    
    // Determinar si es equipo o componente
    $tipo = $mantenimiento["tipo"];
    $equipoId = $mantenimiento["equipo_id"];
    $componenteId = $mantenimiento["componente_id"];
    
    // 1. Actualizar el estado del mantenimiento a completado
    $datosMantenimiento = [
        "estado" => "completado",
        "fecha_realizado" => date("Y-m-d H:i:s"),
        "observaciones" => $observaciones
    ];
    
    $conexion->update("mantenimiento_preventivo", $datosMantenimiento, "id = ?", [$id]);
    
    // 2. Actualizar el orómetro actual del equipo o componente
    if ($tipo === "equipo") {
        // Obtener datos del equipo
        $equipo = $conexion->selectOne("SELECT * FROM equipos WHERE id = ?", [$equipoId]);
        
        if (!$equipo) {
            throw new Exception("Equipo no encontrado");
        }
        
        // Actualizar orómetro del equipo
        $datosEquipo = [
            "anterior_orometro" => $equipo["orometro_actual"],
            "orometro_actual" => $orometroActual
        ];
        
        $conexion->update("equipos", $datosEquipo, "id = ?", [$equipoId]);
        
        // 3. Generar nuevo mantenimiento preventivo
        $proximoOrometro = $orometroActual + $equipo["mantenimiento"];
        $descripcion = "Mantenimiento preventivo programado para el equipo {$equipo["nombre"]} (Código: {$equipo["codigo"]})";
        
        $datosNuevoMantenimiento = [
            "equipo_id" => $equipoId,
            "descripcion_razon" => $descripcion,
            "fecha_hora_programada" => date("Y-m-d H:i:s", strtotime("+30 days")),
            "orometro_programado" => $proximoOrometro
        ];
        
        $nuevoMantenimientoId = $conexion->insert("mantenimiento_preventivo", $datosNuevoMantenimiento);
        
        // 4. Actualizar próximo orómetro del equipo
        $datosProximoOrometro = [
            "proximo_orometro" => $proximoOrometro
        ];
        
        $conexion->update("equipos", $datosProximoOrometro, "id = ?", [$equipoId]);
        
    } else {
        // Obtener datos del componente
        $componente = $conexion->selectOne("SELECT * FROM componentes WHERE id = ?", [$componenteId]);
        
        if (!$componente) {
            throw new Exception("Componente no encontrado");
        }
        
        // Actualizar orómetro del componente
        $datosComponente = [
            "anterior_orometro" => $componente["orometro_actual"],
            "orometro_actual" => $orometroActual
        ];
        
        $conexion->update("componentes", $datosComponente, "id = ?", [$componenteId]);
        
        // 3. Generar nuevo mantenimiento preventivo
        $proximoOrometro = $orometroActual + $componente["mantenimiento"];
        $descripcion = "Mantenimiento preventivo programado para el componente {$componente["nombre"]} (Código: {$componente["codigo"]})";
        
        $datosNuevoMantenimiento = [
            "componente_id" => $componenteId,
            "descripcion_razon" => $descripcion,
            "fecha_hora_programada" => date("Y-m-d H:i:s", strtotime("+30 days")),
            "orometro_programado" => $proximoOrometro
        ];
        
        $nuevoMantenimientoId = $conexion->insert("mantenimiento_preventivo", $datosNuevoMantenimiento);
        
        // 4. Actualizar próximo orómetro del componente
        $datosProximoOrometro = [
            "proximo_orometro" => $proximoOrometro
        ];
        
        $conexion->update("componentes", $datosProximoOrometro, "id = ?", [$componenteId]);
    }
    
    // 5. Registrar en historial de mantenimiento
    $datosHistorial = [
        "tipo_mantenimiento" => "preventivo",
        "mantenimiento_id" => $id,
        "equipo_id" => $equipoId,
        "componente_id" => $componenteId,
        "descripcion" => $mantenimiento["descripcion_razon"],
        "fecha_realizado" => date("Y-m-d H:i:s"),
        "orometro_realizado" => $orometroActual,
        "observaciones" => $observaciones
    ];
    
    $conexion->insert("historial_mantenimiento", $datosHistorial);
    
    // Confirmar transacción
    $conn->commit();
    
    // Preparar respuesta
    $response = [
        "success" => true,
        "message" => "Mantenimiento completado correctamente",
        "nuevo_mantenimiento_id" => $nuevoMantenimientoId
    ];
    
} catch (Exception $e) {
    // Revertir transacción en caso de error
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    
    // Preparar respuesta de error
    $response = [
        "success" => false,
        "message" => "Error al completar el mantenimiento: " . $e->getMessage()
    ];
    
    // Registrar error en log
    error_log("Error en completar.php: " . $e->getMessage());
}

// Devolver respuesta en formato JSON
header("Content-Type: application/json");
echo json_encode($response);
?>';
}
