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

// Verificar permiso
if (!tienePermiso('mantenimientos.preventivo.completar')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No tiene permisos para completar mantenimientos preventivos']);
    exit;
}

// Verificar que se recibió un ID
if (!isset($_POST['id']) || empty($_POST['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de mantenimiento no proporcionado']);
    exit;
}

$id = intval($_POST['id']);
$observaciones = isset($_POST['observaciones']) ? sanitizar($_POST['observaciones']) : '';

try {
    // Conexión a la base de datos
    $conexion = new Conexion();

    // Verificar si el mantenimiento existe y obtener sus datos
    $mantenimiento = $conexion->selectOne(
        "SELECT * FROM mantenimiento_preventivo WHERE id = ?", 
        [$id]
    );
    
    if (!$mantenimiento) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Mantenimiento preventivo no encontrado']);
        exit;
    }
    
    // Verificar que el mantenimiento esté pendiente
    if ($mantenimiento['estado'] !== 'pendiente') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Este mantenimiento ya ha sido completado']);
        exit;
    }

    // Iniciar transacción
    $conexion->getConexion()->beginTransaction();

    // 1. Actualizar el estado del mantenimiento a completado
    $datosMantenimiento = [
        'estado' => 'completado',
        'fecha_realizado' => date('Y-m-d H:i:s'),
        'observaciones' => $observaciones
    ];
    
    $conexion->update('mantenimiento_preventivo', $datosMantenimiento, 'id = ?', [$id]);

    // 2. Actualizar el orómetro anterior del equipo o componente
    if ($mantenimiento['equipo_id']) {
        // Obtener orómetro actual del equipo
        $equipo = $conexion->selectOne(
            "SELECT orometro_actual FROM equipos WHERE id = ?", 
            [$mantenimiento['equipo_id']]
        );
        
        if ($equipo) {
            // Actualizar anterior_orometro con el valor actual
            $conexion->update(
                'equipos', 
                ['anterior_orometro' => $equipo['orometro_actual']], 
                'id = ?', 
                [$mantenimiento['equipo_id']]
            );
        }
    } else if ($mantenimiento['componente_id']) {
        // Obtener orómetro actual del componente
        $componente = $conexion->selectOne(
            "SELECT orometro_actual FROM componentes WHERE id = ?", 
            [$mantenimiento['componente_id']]
        );
        
        if ($componente) {
            // Actualizar anterior_orometro con el valor actual
            $conexion->update(
                'componentes', 
                ['anterior_orometro' => $componente['orometro_actual']], 
                'id = ?', 
                [$mantenimiento['componente_id']]
            );
        }
    }

    // 3. Registrar en el historial de mantenimiento
    $datosHistorial = [
        'tipo_mantenimiento' => 'preventivo',
        'mantenimiento_id' => $id,
        'equipo_id' => $mantenimiento['equipo_id'],
        'componente_id' => $mantenimiento['componente_id'],
        'descripcion' => $mantenimiento['descripcion_razon'],
        'fecha_realizado' => date('Y-m-d H:i:s'),
        'orometro_realizado' => $mantenimiento['orometro_programado'],
        'observaciones' => $observaciones
    ];
    
    $conexion->insert('historial_mantenimiento', $datosHistorial);

    // Confirmar transacción
    $conexion->getConexion()->commit();

    // Preparar respuesta
    $response = [
        'success' => true,
        'message' => 'Mantenimiento preventivo completado correctamente',
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
    echo json_encode(['success' => false, 'message' => 'Error al completar el mantenimiento preventivo: ' . $e->getMessage()]);
}