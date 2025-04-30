<?php
// Incluir archivos necesarios
require_once '../../../db/funciones.php';
require_once '../../../db/conexion.php';

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso no permitido']);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(['error' => 'No autenticado']);
    exit;
}

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Verificar permiso según la operación (crear o editar)
$id = isset($_POST['id']) && !empty($_POST['id']) ? intval($_POST['id']) : null;
if ($id && !tienePermiso('equipos.editar')) {
    http_response_code(403);
    echo json_encode(['error' => 'No tiene permisos para editar componentes']);
    exit;
} elseif (!$id && !tienePermiso('equipos.crear')) {
    http_response_code(403);
    echo json_encode(['error' => 'No tiene permisos para crear componentes']);
    exit;
}

// Validar campos requeridos
$camposRequeridos = ['codigo', 'nombre', 'equipo_id', 'tipo', 'estado'];
foreach ($camposRequeridos as $campo) {
    if (!isset($_POST[$campo]) || empty($_POST[$campo])) {
        http_response_code(400);
        echo json_encode(['error' => 'El campo ' . $campo . ' es requerido']);
        exit;
    }
}

// Sanitizar y preparar datos
$datos = [
    'codigo' => sanitizar($_POST['codigo']),
    'nombre' => sanitizar($_POST['nombre']),
    'equipo_id' => intval($_POST['equipo_id']),
    'tipo' => sanitizar($_POST['tipo']),
    'marca' => isset($_POST['marca']) ? sanitizar($_POST['marca']) : null,
    'modelo' => isset($_POST['modelo']) ? sanitizar($_POST['modelo']) : null,
    'numero_serie' => isset($_POST['numero_serie']) ? sanitizar($_POST['numero_serie']) : null,
    'estado' => sanitizar($_POST['estado']),
    'orometro_actual' => isset($_POST['orometro_actual']) && is_numeric($_POST['orometro_actual']) ? floatval($_POST['orometro_actual']) : 0,
    'limite' => isset($_POST['limite']) && is_numeric($_POST['limite']) ? floatval($_POST['limite']) : null,
    'notificacion' => isset($_POST['notificacion']) && is_numeric($_POST['notificacion']) ? floatval($_POST['notificacion']) : null,
    'mantenimiento' => isset($_POST['mantenimiento']) && is_numeric($_POST['mantenimiento']) ? floatval($_POST['mantenimiento']) : null,
    'observaciones' => isset($_POST['observaciones']) ? sanitizar($_POST['observaciones']) : null
];

// Validar tipo y estado
$validTipos = ['horas', 'kilometros'];
if (!in_array($datos['tipo'], $validTipos)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de componente inválido']);
    exit;
}
$validEstados = ['activo', 'mantenimiento', 'averiado', 'vendido', 'descanso'];
if (!in_array($datos['estado'], $validEstados)) {
    http_response_code(400);
    echo json_encode(['error' => 'Estado de componente inválido']);
    exit;
}

// Validar campos numéricos
if (isset($datos['limite']) && ($datos['limite'] < 0 || $datos['limite'] > 1000000)) {
    http_response_code(400);
    echo json_encode(['error' => 'El límite debe estar entre 0 y 1,000,000']);
    exit;
}
if (isset($datos['notificacion']) && ($datos['notificacion'] < 0 || $datos['notificacion'] > 1000)) {
    http_response_code(400);
    echo json_encode(['error' => 'La notificación debe estar entre 0 y 1,000']);
    exit;
}
if (isset($datos['mantenimiento']) && $datos['mantenimiento'] < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'El mantenimiento debe ser mayor o igual a 0']);
    exit;
}

// Calcular proximo_orometro
if (isset($datos['mantenimiento']) && $datos['mantenimiento'] > 0) {
    $datos['proximo_orometro'] = $datos['orometro_actual'] + $datos['mantenimiento'];
} else {
    $datos['proximo_orometro'] = null;
}

// Conexión a la base de datos
$conexion = new Conexion();

// Verificar si el equipo existe
$equipoExiste = $conexion->selectOne("SELECT id FROM equipos WHERE id = ?", [$datos['equipo_id']]);
if (!$equipoExiste) {
    http_response_code(400);
    echo json_encode(['error' => 'El equipo seleccionado no existe']);
    exit;
}

// Verificar si el código ya existe (excepto para el mismo componente en caso de edición)
$sqlVerificarCodigo = "SELECT id FROM componentes WHERE codigo = ? AND id != ?";
$componenteExistente = $conexion->selectOne($sqlVerificarCodigo, [$datos['codigo'], $id ?: 0]);

if ($componenteExistente) {
    http_response_code(400);
    echo json_encode(['error' => 'El código ya está en uso por otro componente']);
    exit;
}

// Procesar imagen si se ha subido
$imagenGuardada = null;
$imageBasePath = __DIR__ . '/../../../Uploads/componentes/';
$imageUrlPrefix = 'Uploads/componentes/';
if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
    $directorioDestino = $imageBasePath;

    // Crear directorio si no existe
    if (!file_exists($directorioDestino)) {
        mkdir($directorioDestino, 0755, true);
    }

    // Generar nombre único para la imagen
    $extension = pathinfo($_FILES['imagen']['name'], PATHINFO_EXTENSION);
    $nombreArchivo = 'componente_' . time() . '_' . uniqid() . '.' . $extension;
    $rutaCompleta = $directorioDestino . $nombreArchivo;

    // Mover archivo subido
    if (move_uploaded_file($_FILES['imagen']['tmp_name'], $rutaCompleta)) {
        $imagenGuardada = $imageUrlPrefix . $nombreArchivo;
        $datos['imagen'] = $imagenGuardada;
    }
}

// Iniciar transacción
$conexion->getConexion()->beginTransaction();

try {
    if ($id) {
        // Actualizar componente existente

        // Si no se subió una nueva imagen, mantener la existente
        if (!isset($datos['imagen'])) {
            unset($datos['imagen']);
        } else {
            // Eliminar imagen anterior si existe
            $componenteAnterior = $conexion->selectOne("SELECT imagen FROM componentes WHERE id = ?", [$id]);
            if ($componenteAnterior && !empty($componenteAnterior['imagen']) && file_exists('../../../' . $componenteAnterior['imagen'])) {
                unlink('../../../' . $componenteAnterior['imagen']);
            }
        }

        // Actualizar en la base de datos
        $conexion->update('componentes', $datos, 'id = ?', [$id]);
        $mensaje = 'Componente actualizado correctamente';
    } else {
        // Crear nuevo componente
        $id = $conexion->insert('componentes', $datos);
        $mensaje = 'Componente creado correctamente';
    }

    // Confirmar transacción
    $conexion->getConexion()->commit();

    // Preparar respuesta
    $response = [
        'success' => true,
        'mensaje' => $mensaje,
        'id' => $id
    ];

    // Enviar respuesta
    header('Content-Type: application/json');
    echo json_encode($response);
} catch (Exception $e) {
    // Revertir transacción en caso de error
    $conexion->getConexion()->rollBack();

    // Eliminar imagen subida si hubo error
    if ($imagenGuardada && file_exists('../../../' . $imagenGuardada)) {
        unlink('../../../' . $imagenGuardada);
    }

    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar el componente: ' . $e->getMessage()]);
}
