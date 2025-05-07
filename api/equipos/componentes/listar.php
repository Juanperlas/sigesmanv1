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
if (!tienePermiso('componentes.ver')) {
    http_response_code(403);
    echo json_encode(['error' => 'No tiene permisos para ver componentes']);
    exit;
}

// Parámetros de DataTables
$draw = isset($_POST['draw']) ? intval($_POST['draw']) : 1;
$start = isset($_POST['start']) ? intval($_POST['start']) : 0;
$length = isset($_POST['length']) ? intval($_POST['length']) : 10;
$search = isset($_POST['search']['value']) ? $_POST['search']['value'] : '';
$orderColumn = isset($_POST['order'][0]['column']) ? intval($_POST['order'][0]['column']) : 2;
$orderDir = isset($_POST['order'][0]['dir']) ? $_POST['order'][0]['dir'] : 'asc';

// Mapeo de columnas para ordenamiento
$columns = [
    0 => 'c.id',
    1 => 'c.codigo',
    2 => 'c.nombre',
    3 => 'e.nombre',
    4 => 'c.marca',
    5 => 'c.estado',
    6 => 'c.orometro_actual'
];

// Filtros específicos
$equipo_id = isset($_POST['equipo_id']) ? $_POST['equipo_id'] : '';
$estado = isset($_POST['estado']) ? $_POST['estado'] : '';

// Construir la consulta SQL
$conexion = new Conexion();

// Consulta base para contar total de registros
$sqlCount = "SELECT COUNT(*) as total FROM componentes";
$totalRecords = $conexion->selectOne($sqlCount);
$totalRecords = $totalRecords['total'];

// Construir la consulta con filtros
$sql = "SELECT c.*, e.nombre as equipo_nombre, e.codigo as equipo_codigo
        FROM componentes c
        LEFT JOIN equipos e ON c.equipo_id = e.id
        WHERE 1=1";

$params = [];

// Aplicar búsqueda
if (!empty($search)) {
    $sql .= " AND (c.codigo LIKE ? OR c.nombre LIKE ? OR c.marca LIKE ? OR c.modelo LIKE ? OR e.nombre LIKE ?)";
    $searchParam = "%$search%";
    $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
}

// Aplicar filtro de equipo
if (!empty($equipo_id)) {
    $sql .= " AND c.equipo_id = ?";
    $params[] = $equipo_id;
}

// Aplicar filtro de estado
if (!empty($estado)) {
    $sql .= " AND c.estado = ?";
    $params[] = $estado;
}

// Consulta para contar registros filtrados
$sqlFilteredCount = $sql;
$totalFiltered = count($conexion->select($sqlFilteredCount, $params));

// Aplicar ordenamiento y paginación
if (isset($columns[$orderColumn])) {
    $sql .= " ORDER BY " . $columns[$orderColumn] . " " . $orderDir;
} else {
    $sql .= " ORDER BY c.id DESC";
}

$sql .= " LIMIT " . $start . ", " . $length;

// Ejecutar la consulta
$componentes = $conexion->select($sql, $params);

// Preparar datos para DataTables
$data = [];
foreach ($componentes as $componente) {
    $imagen = !empty($componente['imagen']) ? getAssetUrl($componente['imagen']) : getAssetUrl('assets/img/equipos/componentes/default.png');

    $data[] = [
        'id' => $componente['id'],
        'imagen' => $imagen,
        'codigo' => $componente['codigo'],
        'nombre' => $componente['nombre'],
        'equipo_id' => $componente['equipo_id'],
        'equipo_nombre' => $componente['equipo_codigo'] . ' - ' . $componente['equipo_nombre'],
        'tipo' => $componente['tipo_orometro'], 
        'marca' => $componente['marca'],
        'modelo' => $componente['modelo'],
        'estado' => $componente['estado'],
        'orometro_actual' => $componente['orometro_actual'],
        'proximo_orometro' => $componente['proximo_orometro'],
        'mantenimiento' => $componente['mantenimiento']
    ];
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
