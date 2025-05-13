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
if (!tienePermiso('mantenimientos.preventivo.ver')) {
    http_response_code(403);
    echo json_encode(['error' => 'No tiene permisos para ver mantenimientos preventivos']);
    exit;
}

// Parámetros de DataTables
$draw = isset($_POST['draw']) ? intval($_POST['draw']) : 1;
$start = isset($_POST['start']) ? intval($_POST['start']) : 0;
$length = isset($_POST['length']) ? intval($_POST['length']) : 10;
$search = isset($_POST['search']['value']) ? $_POST['search']['value'] : '';
$orderColumn = isset($_POST['order'][0]['column']) ? intval($_POST['order'][0]['column']) : 1;
$orderDir = isset($_POST['order'][0]['dir']) ? $_POST['order'][0]['dir'] : 'asc';

// Mapeo de columnas para ordenamiento
$columns = [
    0 => 'mp.id',
    1 => 'e.codigo',
    2 => 'e.nombre',
    3 => 'c.codigo',
    4 => 'c.nombre',
    5 => 'mp.orometro_programado',
    6 => 'mp.fecha_hora_programada',
    7 => 'mp.estado'
];

// Filtros adicionales
$equipoId = isset($_POST['equipo_id']) ? intval($_POST['equipo_id']) : null;
$componenteId = isset($_POST['componente_id']) ? intval($_POST['componente_id']) : null;
$estado = isset($_POST['estado']) ? $_POST['estado'] : '';
$fechaDesde = isset($_POST['fecha_desde']) ? $_POST['fecha_desde'] : '';
$fechaHasta = isset($_POST['fecha_hasta']) ? $_POST['fecha_hasta'] : '';

// Construir la consulta SQL
$conexion = new Conexion();

// Consulta base para contar total de registros
$sqlCount = "SELECT COUNT(*) as total FROM mantenimiento_preventivo";
$totalRecords = $conexion->selectOne($sqlCount);
$totalRecords = $totalRecords['total'];

// Construir la consulta con filtros
$sql = "SELECT mp.*, 
        e.codigo as equipo_codigo, e.nombre as equipo_nombre, e.tipo_orometro as equipo_tipo_orometro,
        c.codigo as componente_codigo, c.nombre as componente_nombre, c.tipo_orometro as componente_tipo_orometro
        FROM mantenimiento_preventivo mp
        LEFT JOIN equipos e ON mp.equipo_id = e.id
        LEFT JOIN componentes c ON mp.componente_id = c.id
        WHERE 1=1";

$params = [];

// Aplicar búsqueda
if (!empty($search)) {
    $sql .= " AND (e.codigo LIKE ? OR e.nombre LIKE ? OR c.codigo LIKE ? OR c.nombre LIKE ? OR mp.descripcion_razon LIKE ?)";
    $searchParam = "%$search%";
    $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
}

// Aplicar filtro de equipo
if (!empty($equipoId)) {
    $sql .= " AND mp.equipo_id = ?";
    $params[] = $equipoId;
}

// Aplicar filtro de componente
if (!empty($componenteId)) {
    $sql .= " AND mp.componente_id = ?";
    $params[] = $componenteId;
}

// Aplicar filtro de estado
if (!empty($estado)) {
    $sql .= " AND mp.estado = ?";
    $params[] = $estado;
}

// Aplicar filtro de fecha desde
if (!empty($fechaDesde)) {
    $sql .= " AND DATE(mp.fecha_hora_programada) >= ?";
    $params[] = $fechaDesde;
}

// Aplicar filtro de fecha hasta
if (!empty($fechaHasta)) {
    $sql .= " AND DATE(mp.fecha_hora_programada) <= ?";
    $params[] = $fechaHasta;
}

// Consulta para contar registros filtrados
$sqlFilteredCount = $sql;
$totalFiltered = count($conexion->select($sqlFilteredCount, $params));

// Aplicar ordenamiento y paginación
if (isset($columns[$orderColumn])) {
    $sql .= " ORDER BY " . $columns[$orderColumn] . " " . $orderDir;
} else {
    $sql .= " ORDER BY mp.fecha_hora_programada ASC";
}

$sql .= " LIMIT " . $start . ", " . $length;

// Ejecutar la consulta
$mantenimientos = $conexion->select($sql, $params);

// Preparar datos para DataTables
$data = [];
foreach ($mantenimientos as $mantenimiento) {
    // Determinar si es equipo o componente
    $esEquipo = !empty($mantenimiento['equipo_id']);
    $codigo = $esEquipo ? $mantenimiento['equipo_codigo'] : $mantenimiento['componente_codigo'];
    $nombre = $esEquipo ? $mantenimiento['equipo_nombre'] : $mantenimiento['componente_nombre'];
    $tipoOrometro = $esEquipo ? $mantenimiento['equipo_tipo_orometro'] : $mantenimiento['componente_tipo_orometro'];
    $unidad = $tipoOrometro == 'horas' ? 'hrs' : 'km';
    
    // Formatear fecha
    $fechaProgramada = !empty($mantenimiento['fecha_hora_programada']) 
        ? date('d/m/Y H:i', strtotime($mantenimiento['fecha_hora_programada'])) 
        : '-';
    
    // Formatear fecha de realización
    $fechaRealizado = !empty($mantenimiento['fecha_realizado']) 
        ? date('d/m/Y H:i', strtotime($mantenimiento['fecha_realizado'])) 
        : '-';
    
    $data[] = [
        'id' => $mantenimiento['id'],
        'equipo_id' => $mantenimiento['equipo_id'],
        'componente_id' => $mantenimiento['componente_id'],
        'tipo' => $esEquipo ? 'equipo' : 'componente',
        'codigo' => $codigo,
        'nombre' => $nombre,
        'tipo_orometro' => $tipoOrometro,
        'unidad' => $unidad,
        'orometro_programado' => $mantenimiento['orometro_programado'],
        'orometro_actual' => $esEquipo 
            ? obtenerOrometroActual('equipo', $mantenimiento['equipo_id']) 
            : obtenerOrometroActual('componente', $mantenimiento['componente_id']),
        'fecha_programada' => $fechaProgramada,
        'fecha_realizado' => $fechaRealizado,
        'estado' => $mantenimiento['estado'],
        'descripcion' => $mantenimiento['descripcion_razon'],
        'observaciones' => $mantenimiento['observaciones']
    ];
}

// Función para obtener el orómetro actual
function obtenerOrometroActual($tipo, $id) {
    $conexion = new Conexion();
    $tabla = $tipo == 'equipo' ? 'equipos' : 'componentes';
    $resultado = $conexion->selectOne("SELECT orometro_actual FROM $tabla WHERE id = ?", [$id]);
    return $resultado ? $resultado['orometro_actual'] : 0;
}

// Preparar respuesta para DataTables
$response = [
    'draw' => $draw,
    'recordsTotal' => $totalRecords,
    'recordsFiltered' => $totalFiltered,
    'data' => $data
];

// Enviar respuesta
header('Content-Type: application/json');
echo json_encode($response);