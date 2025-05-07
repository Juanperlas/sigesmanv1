<?php
// Incluir archivos necesarios
require_once '../../../db/funciones.php';
require_once '../../../db/conexion.php';

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

// Verificar permiso
if (!tienePermiso('componentes.ver')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No tiene permisos para ver componentes']);
    exit;
}

// Verificar que se recibió un ID de equipo
if (!isset($_GET['equipo_id']) || empty($_GET['equipo_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de equipo no proporcionado']);
    exit;
}

$equipo_id = intval($_GET['equipo_id']);

try {
    // Obtener datos de los componentes del equipo
    $conexion = new Conexion();
    
    // Verificar si el equipo existe
    $equipo = $conexion->selectOne("SELECT id, codigo, nombre FROM equipos WHERE id = ?", [$equipo_id]);
    
    if (!$equipo) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Equipo no encontrado']);
        exit;
    }
    
    // Obtener todos los componentes del equipo
    $componentes = $conexion->select(
        "SELECT * FROM componentes WHERE equipo_id = ? ORDER BY codigo ASC",
        [$equipo_id]
    );
    
    // Preparar datos de respuesta
    $data = [];
    foreach ($componentes as $componente) {
        // Verificar si hay imagen
        $imagen = !empty($componente['imagen']) && file_exists('../../../' . $componente['imagen'])
            ? getAssetUrl($componente['imagen'])
            : getAssetUrl('assets/img/equipos/componentes/default.png');
            
        $data[] = [
            'id' => $componente['id'],
            'codigo' => $componente['codigo'],
            'nombre' => $componente['nombre'],
            'marca' => $componente['marca'],
            'modelo' => $componente['modelo'],
            'numero_serie' => $componente['numero_serie'],
            'tipo_orometro' => $componente['tipo_orometro'],
            'anterior_orometro' => $componente['anterior_orometro'],
            'orometro_actual' => $componente['orometro_actual'],
            'proximo_orometro' => $componente['proximo_orometro'],
            'estado' => $componente['estado'],
            'limite' => $componente['limite'],
            'notificacion' => $componente['notificacion'],
            'mantenimiento' => $componente['mantenimiento'],
            'observaciones' => $componente['observaciones'],
            'imagen' => $imagen
        ];
    }

    // Preparar respuesta
    $response = [
        'success' => true,
        'equipo' => [
            'id' => $equipo['id'],
            'codigo' => $equipo['codigo'],
            'nombre' => $equipo['nombre']
        ],
        'componentes' => $data,
        'total' => count($data)
    ];

    // Enviar respuesta
    header('Content-Type: application/json');
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener los componentes: ' . $e->getMessage()]);
}