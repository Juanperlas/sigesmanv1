<?php
// Incluir archivos necesarios
require_once '../../../db/funciones.php';
require_once '../../../db/conexion.php';

// Establecer cabeceras para respuesta JSON
header('Content-Type: application/json');

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

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Verificar permiso según la operación (crear o editar)
$id = isset($_POST['id']) && !empty($_POST['id']) ? intval($_POST['id']) : null;
if ($id && !tienePermiso('mantenimientos.preventivo.editar')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No tiene permisos para editar mantenimientos preventivos']);
    exit;
} elseif (!$id && !tienePermiso('mantenimientos.preventivo.crear')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No tiene permisos para crear mantenimientos preventivos']);
    exit;
}

// Validar que se proporcione equipo o componente, pero no ambos
if (
    (!isset($_POST['equipo_id']) || empty($_POST['equipo_id'])) && 
    (!isset($_POST['componente_id']) || empty($_POST['componente_id']))
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Debe especificar un equipo o un componente']);
    exit;
}

if (
    (isset($_POST['equipo_id']) && !empty($_POST['equipo_id'])) && 
    (isset($_POST['componente_id']) && !empty($_POST['componente_id']))
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No puede especificar un equipo y un componente simultáneamente']);
    exit;
}

// Validar campos requeridos
$camposRequeridos = ['descripcion_razon', 'orometro_programado'];
foreach ($camposRequeridos as $campo) {
    if (!isset($_POST[$campo]) || $_POST[$campo] === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El campo ' . $campo . ' es requerido']);
        exit;
    }
}

// Sanitizar y preparar datos
$datos = [
    'descripcion_razon' => sanitizar($_POST['descripcion_razon']),
    'orometro_programado' => isset($_POST['orometro_programado']) && is_numeric($_POST['orometro_programado']) 
        ? floatval($_POST['orometro_programado']) 
        : null,
    'fecha_hora_programada' => isset($_POST['fecha_hora_programada']) && !empty($_POST['fecha_hora_programada']) 
        ? $_POST['fecha_hora_programada'] 
        : null,
    'estado' => 'pendiente', // Por defecto, siempre pendiente al crear
    'observaciones' => isset($_POST['observaciones']) ? sanitizar($_POST['observaciones']) : null
];

// Asignar equipo o componente
if (isset($_POST['equipo_id']) && !empty($_POST['equipo_id'])) {
    $datos['equipo_id'] = intval($_POST['equipo_id']);
    $datos['componente_id'] = null;
} else {
    $datos['componente_id'] = intval($_POST['componente_id']);
    $datos['equipo_id'] = null;
}

try {
    // Conexión a la base de datos
    $conexion = new Conexion();

    // Verificar si el equipo o componente existe
    if (isset($datos['equipo_id'])) {
        $equipoExiste = $conexion->selectOne("SELECT id FROM equipos WHERE id = ?", [$datos['equipo_id']]);
        if (!$equipoExiste) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El equipo seleccionado no existe']);
            exit;
        }
    } else {
        $componenteExiste = $conexion->selectOne("SELECT id FROM componentes WHERE id = ?", [$datos['componente_id']]);
        if (!$componenteExiste) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El componente seleccionado no existe']);
            exit;
        }
    }

    // Validar que el orómetro programado sea mayor al actual
    if (isset($datos['equipo_id'])) {
        $orometroActual = $conexion->selectOne(
            "SELECT orometro_actual FROM equipos WHERE id = ?", 
            [$datos['equipo_id']]
        );
        
        if ($orometroActual && $datos['orometro_programado'] <= $orometroActual['orometro_actual']) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => 'El orómetro programado debe ser mayor al orómetro actual del equipo'
            ]);
            exit;
        }
    } else {
        $orometroActual = $conexion->selectOne(
            "SELECT orometro_actual FROM componentes WHERE id = ?", 
            [$datos['componente_id']]
        );
        
        if ($orometroActual && $datos['orometro_programado'] <= $orometroActual['orometro_actual']) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => 'El orómetro programado debe ser mayor al orómetro actual del componente'
            ]);
            exit;
        }
    }

    // Iniciar transacción
    $conexion->getConexion()->beginTransaction();

    if ($id) {
        // Actualizar mantenimiento existente
        $mantenimientoActual = $conexion->selectOne(
            "SELECT estado FROM mantenimiento_preventivo WHERE id = ?", 
            [$id]
        );
        
        if (!$mantenimientoActual) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Mantenimiento preventivo no encontrado']);
            exit;
        }
        
        // No permitir cambiar el estado desde aquí
        unset($datos['estado']);
        
        // Actualizar en la base de datos
        $conexion->update('mantenimiento_preventivo', $datos, 'id = ?', [$id]);
        $mensaje = 'Mantenimiento preventivo actualizado correctamente';
    } else {
        // Crear nuevo mantenimiento preventivo
        $id = $conexion->insert('mantenimiento_preventivo', $datos);
        $mensaje = 'Mantenimiento preventivo creado correctamente';
    }

    // Confirmar transacción
    $conexion->getConexion()->commit();

    // Preparar respuesta
    $response = [
        'success' => true,
        'message' => $mensaje,
        'id' => $id
    ];

    // Enviar respuesta
    echo json_encode($response);
} catch (Exception $e) {
    // Revertir transacción en caso de error
    if (isset($conexion) && $conexion->getConexion()) {
        $conexion->getConexion()->rollBack();
    }

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar el mantenimiento preventivo: ' . $e->getMessage()]);
}