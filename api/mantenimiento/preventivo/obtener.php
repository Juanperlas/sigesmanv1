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
if (!tienePermiso('mantenimientos.preventivo.ver')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No tiene permisos para ver mantenimientos preventivos']);
    exit;
}

// Verificar que se recibió un ID
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de mantenimiento no proporcionado']);
    exit;
}

$id = intval($_GET['id']);

try {
    // Obtener datos del mantenimiento preventivo
    $conexion = new Conexion();
    $mantenimiento = $conexion->selectOne(
        "SELECT mp.*, 
         e.codigo as equipo_codigo, e.nombre as equipo_nombre, e.tipo_orometro as equipo_tipo_orometro,
         e.orometro_actual as equipo_orometro_actual, e.imagen as equipo_imagen,
         c.codigo as componente_codigo, c.nombre as componente_nombre, c.tipo_orometro as componente_tipo_orometro,
         c.orometro_actual as componente_orometro_actual, c.imagen as componente_imagen
         FROM mantenimiento_preventivo mp
         LEFT JOIN equipos e ON mp.equipo_id = e.id
         LEFT JOIN componentes c ON mp.componente_id = c.id
         WHERE mp.id = ?",
        [$id]
    );

    if (!$mantenimiento) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Mantenimiento preventivo no encontrado']);
        exit;
    }

    // Determinar si es equipo o componente
    $esEquipo = !empty($mantenimiento['equipo_id']);
    $codigo = $esEquipo ? $mantenimiento['equipo_codigo'] : $mantenimiento['componente_codigo'];
    $nombre = $esEquipo ? $mantenimiento['equipo_nombre'] : $mantenimiento['componente_nombre'];
    $tipoOrometro = $esEquipo ? $mantenimiento['equipo_tipo_orometro'] : $mantenimiento['componente_tipo_orometro'];
    $orometroActual = $esEquipo ? $mantenimiento['equipo_orometro_actual'] : $mantenimiento['componente_orometro_actual'];
    $imagen = $esEquipo ? $mantenimiento['equipo_imagen'] : $mantenimiento['componente_imagen'];
    $unidad = $tipoOrometro == 'horas' ? 'hrs' : 'km';

    // Verificar si hay imagen
    $imagen = !empty($imagen) && file_exists('../../../' . $imagen)
        ? getAssetUrl($imagen)
        : getAssetUrl('assets/img/equipos/' . ($esEquipo ? 'equipos' : 'componentes') . '/default.png');

    // Calcular tiempo restante para mantenimiento
    $tiempoRestante = $mantenimiento['orometro_programado'] - $orometroActual;
    
    // Obtener límite diario para estimar días
    $limiteQuery = $esEquipo 
        ? "SELECT limite FROM equipos WHERE id = ?" 
        : "SELECT limite FROM componentes WHERE id = ?";
    $limiteId = $esEquipo ? $mantenimiento['equipo_id'] : $mantenimiento['componente_id'];
    $limiteResult = $conexion->selectOne($limiteQuery, [$limiteId]);
    $limiteDiario = $limiteResult && $limiteResult['limite'] > 0 ? $limiteResult['limite'] : null;
    
    // Calcular días estimados si hay límite diario
    $diasEstimados = null;
    if ($limiteDiario && $tiempoRestante > 0) {
        $diasEstimados = ceil($tiempoRestante / $limiteDiario);
    }

    // Preparar respuesta
    $response = [
        'success' => true,
        'data' => [
            'id' => $mantenimiento['id'],
            'equipo_id' => $mantenimiento['equipo_id'],
            'componente_id' => $mantenimiento['componente_id'],
            'tipo' => $esEquipo ? 'equipo' : 'componente',
            'codigo' => $codigo,
            'nombre' => $nombre,
            'tipo_orometro' => $tipoOrometro,
            'unidad' => $unidad,
            'orometro_programado' => $mantenimiento['orometro_programado'],
            'orometro_actual' => $orometroActual,
            'tiempo_restante' => $tiempoRestante,
            'dias_estimados' => $diasEstimados,
            'fecha_programada' => $mantenimiento['fecha_hora_programada'],
            'fecha_programada_formateada' => !empty($mantenimiento['fecha_hora_programada']) 
                ? date('d/m/Y H:i', strtotime($mantenimiento['fecha_hora_programada'])) 
                : null,
            'fecha_realizado' => $mantenimiento['fecha_realizado'],
            'fecha_realizado_formateada' => !empty($mantenimiento['fecha_realizado']) 
                ? date('d/m/Y H:i', strtotime($mantenimiento['fecha_realizado'])) 
                : null,
            'estado' => $mantenimiento['estado'],
            'descripcion' => $mantenimiento['descripcion_razon'],
            'observaciones' => $mantenimiento['observaciones'],
            'imagen' => $imagen,
            'limite_diario' => $limiteDiario
        ]
    ];

    // Enviar respuesta
    header('Content-Type: application/json');
    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener el mantenimiento preventivo: ' . $e->getMessage()]);
}