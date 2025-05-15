<?php
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
                WHEN mp.equipo_id IS NOT NULL THEN 'equipo'
                ELSE 'componente'
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
    $diasRestantesCalculados = null;

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

        // Calcular días restantes basados en el límite diario
        if ($equipo["limite"] > 0) {
            $orometroActual = floatval($equipo["orometro_actual"]);
            $proximoOrometro = floatval($mantenimiento["orometro_programado"]);
            $limiteDiario = floatval($equipo["limite"]);

            $diferenciaOrometros = $proximoOrometro - $orometroActual;
            $diasRestantesCalculados = ceil($diferenciaOrometros / $limiteDiario);
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

        // Calcular días restantes basados en el límite diario
        if ($componente["limite"] > 0) {
            $orometroActual = floatval($componente["orometro_actual"]);
            $proximoOrometro = floatval($mantenimiento["orometro_programado"]);
            $limiteDiario = floatval($componente["limite"]);

            $diferenciaOrometros = $proximoOrometro - $orometroActual;
            $diasRestantesCalculados = ceil($diferenciaOrometros / $limiteDiario);
        }
    }

    // Usar días restantes calculados si están disponibles, de lo contrario usar los de la base de datos
    $diasRestantes = $diasRestantesCalculados !== null ? $diasRestantesCalculados : $mantenimiento["dias_restantes"];
    $esFechaFutura = $diasRestantes >= 0;

    // Calcular progreso del orómetro
    $orometroActual = 0;
    $proximoOrometro = floatval($mantenimiento["orometro_programado"]);
    $anteriorOrometro = 0;

    if ($tipo === "equipo" && $equipo) {
        $orometroActual = floatval($equipo["orometro_actual"]);
        $anteriorOrometro = floatval($equipo["anterior_orometro"]);
    } else if ($tipo === "componente" && $componente) {
        $orometroActual = floatval($componente["orometro_actual"]);
        $anteriorOrometro = floatval($componente["anterior_orometro"]);
    }

    // Calcular progreso
    $totalRecorrido = $proximoOrometro - $anteriorOrometro;
    $avanceActual = $orometroActual - $anteriorOrometro;

    // Evitar división por cero
    if ($totalRecorrido > 0) {
        $progreso = min(($avanceActual / $totalRecorrido) * 100, 100);
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
            "fecha_formateada" => $fechaFormateada,
            "anterior_orometro" => $anteriorOrometro,
            "orometro_actual" => $orometroActual,
            "proximo_orometro" => $proximoOrometro
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
