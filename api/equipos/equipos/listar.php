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
    echo json_encode(['error' => 'No tiene permisos para ver equipos']);
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
    1 => 'e.codigo',
    2 => 'e.nombre',
    3 => 'e.tipo_equipo',
    4 => 'e.marca',
    5 => 'e.estado',
    6 => 'e.orometro_actual',
    7 => 'e.ubicacion'
];

// Filtro de estado
$estado = isset($_POST['estado']) ? $_POST['estado'] : '';

// Construir la consulta SQL
$conexion = new Conexion();

// Consulta base para contar total de registros
$sqlCount = "SELECT COUNT(*) as total FROM equipos";
$totalRecords = $conexion->selectOne($sqlCount);
$totalRecords = $totalRecords['total'];

// Construir la consulta con filtros
$sql = "SELECT e.*, c.nombre as categoria_nombre
        FROM equipos e
        LEFT JOIN categorias_equipos c ON e.categoria_id = c.id
        WHERE 1=1";

$params = [];

// Aplicar búsqueda
if (!empty($search)) {
    $sql .= " AND (e.codigo LIKE ? OR e.nombre LIKE ? OR e.marca LIKE ? OR e.modelo LIKE ? OR e.ubicacion LIKE ?)";
    $searchParam = "%$search%";
    $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
}

// Aplicar filtro de estado
if (!empty($estado)) {
    $sql .= " AND e.estado = ?";
    $params[] = $estado;
}

// Consulta para contar registros filtrados
$sqlFilteredCount = $sql;
$totalFiltered = count($conexion->select($sqlFilteredCount, $params));

// Aplicar ordenamiento y paginación
if (isset($columns[$orderColumn])) {
    $sql .= " ORDER BY " . $columns[$orderColumn] . " " . $orderDir;
} else {
    $sql .= " ORDER BY e.nombre ASC";
}
$sql .= " LIMIT " . $start . ", " . $length;

// Ejecutar la consulta
$equipos = $conexion->select($sql, $params);

// Preparar datos para DataTables
$data = [];
foreach ($equipos as $equipo) {
    $imagen = !empty($equipo['imagen']) ? getAssetUrl($equipo['imagen']) : getAssetUrl('assets/img/equipos/equipos/default.png');

    $data[] = [
        'id' => $equipo['id'],
        'imagen' => $imagen,
        'codigo' => $equipo['codigo'],
        'nombre' => $equipo['nombre'],
        'tipo_equipo' => $equipo['tipo_equipo'],
        'marca' => $equipo['marca'],
        'modelo' => $equipo['modelo'],
        'estado' => $equipo['estado'],
        'orometro_actual' => $equipo['orometro_actual'],
        'ubicacion' => $equipo['ubicacion'] ?: '',
        'categoria_nombre' => $equipo['categoria_nombre']
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
?>