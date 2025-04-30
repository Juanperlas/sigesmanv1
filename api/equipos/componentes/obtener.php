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

// Verificar permiso
if (!tienePermiso('equipos.ver')) {
    http_response_code(403);
    echo json_encode(['error' => 'No tiene permisos para ver componentes']);
    exit;
}

// Verificar que se recibió un ID
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de componente no proporcionado']);
    exit;
}

$id = intval($_GET['id']);

// Obtener datos del componente
$conexion = new Conexion();
$componente = $conexion->selectOne(
    "SELECT c.*, e.codigo as equipo_codigo, e.nombre as equipo_nombre
     FROM componentes c
     LEFT JOIN equipos e ON c.equipo_id = e.id
     WHERE c.id = ?",
    [$id]
);

if (!$componente) {
    http_response_code(404);
    echo json_encode(['error' => 'Componente con ID ' . $id . ' no encontrado']);
    exit;
}

// Calcular próximo orómetro basado en mantenimiento
$proximoOrometro = $componente['proximo_orometro'];
if (empty($proximoOrometro) && !empty($componente['mantenimiento']) && $componente['mantenimiento'] > 0) {
    $proximoOrometro = $componente['orometro_actual'] + $componente['mantenimiento'];
}

// Verificar si hay imagen
$imagen = !empty($componente['imagen']) && file_exists('../../../' . $componente['imagen'])
    ? getAssetUrl($componente['imagen'])
    : getAssetUrl('assets/img/placeholder-componente.png');

// Obtener último mantenimiento
$ultimoMantenimiento = $conexion->selectOne(
    "SELECT 
        hm.id,
        hm.tipo_mantenimiento,
        hm.descripcion,
        hm.fecha_realizado,
        hm.orometro_realizado,
        hm.observaciones
     FROM historial_mantenimiento hm
     WHERE hm.componente_id = ?
     ORDER BY hm.fecha_realizado DESC
     LIMIT 1",
    [$id]
);

// Preparar respuesta
$response = [
    'componente' => [
        'id' => $componente['id'],
        'codigo' => $componente['codigo'],
        'nombre' => $componente['nombre'],
        'equipo_id' => $componente['equipo_id'],
        'equipo_codigo' => $componente['equipo_codigo'],
        'equipo_nombre' => $componente['equipo_nombre'],
        'marca' => $componente['marca'],
        'modelo' => $componente['modelo'],
        'numero_serie' => $componente['numero_serie'],
        'tipo' => $componente['tipo'],
        'estado' => $componente['estado'],
        'orometro_actual' => $componente['orometro_actual'],
        'proximo_orometro' => $proximoOrometro,
        'limite' => $componente['limite'],
        'notificacion' => $componente['notificacion'],
        'mantenimiento' => $componente['mantenimiento'],
        'observaciones' => $componente['observaciones'],
        'imagen' => $imagen
    ],
    'ultimo_mantenimiento' => $ultimoMantenimiento
];

// Enviar respuesta
header('Content-Type: application/json');
echo json_encode($response);
