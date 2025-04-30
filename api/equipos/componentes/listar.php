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

// Parámetros de DataTables
$draw = isset($_POST['draw']) ? intval($_POST['draw']) : 1;
$start = isset($_POST['start']) ? intval($_POST['start']) : 0;
$length = isset($_POST['length']) ? intval($_POST['length']) : 10;
$search = isset($_POST['search']['value']) ? $_POST['search']['value'] : '';
$orderColumn = isset($_POST['order'][0]['column']) ? intval($_POST['order'][0]['column']) : 0;
$orderDir = isset($_POST['order'][0]['dir']) ? $_POST['order'][0]['dir'] : 'asc';

// Mapeo de columnas para ordenamiento
$columns = [
    'c.id',
    'c.imagen',
    'c.codigo',
    'c.nombre',
    'e.nombre',
    'CONCAT(COALESCE(c.marca, ""), " ", COALESCE(c.modelo, ""))',
    'c.estado',
    'c.orometro_actual',
    'c.tipo'
];

// Filtros adicionales
$equipoId = isset($_POST['equipoId']) ? intval($_POST['equipoId']) : 0;
$tipo = isset($_POST['tipo']) ? $_POST['tipo'] : '';
$estado = isset($_POST['estado']) ? $_POST['estado'] : '';

// Construir la consulta SQL
$conexion = new Conexion();

// Consulta base para contar total de registros
$sqlCount = "SELECT COUNT(*) as total FROM componentes";
$totalRecords = $conexion->selectOne($sqlCount);
$totalRecords = $totalRecords['total'];

// Construir la consulta con filtros
$sql = "SELECT c.*, e.codigo as equipo_codigo, e.nombre as equipo_nombre
        FROM componentes c
        LEFT JOIN equipos e ON c.equipo_id = e.id
        WHERE 1=1";

$params = [];

// Aplicar filtros
if (!empty($search)) {
    $sql .= " AND (c.codigo LIKE ? OR c.nombre LIKE ? OR c.marca LIKE ? OR c.modelo LIKE ? OR e.nombre LIKE ?)";
    $searchParam = "%$search%";
    $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
}

if ($equipoId > 0) {
    $sql .= " AND c.equipo_id = ?";
    $params[] = $equipoId;
}

if (!empty($tipo)) {
    $sql .= " AND c.tipo = ?";
    $params[] = $tipo;
}

if (!empty($estado)) {
    $sql .= " AND c.estado = ?";
    $params[] = $estado;
}

// Consulta para contar registros filtrados
$sqlFilteredCount = $sql;
$totalFiltered = count($conexion->select($sqlFilteredCount, $params));

// Aplicar ordenamiento y paginación
$sql .= " ORDER BY " . $columns[$orderColumn] . " " . $orderDir;
$sql .= " LIMIT " . $start . ", " . $length;

// Ejecutar la consulta
$componentes = $conexion->select($sql, $params);

// Preparar datos para DataTables
$data = [];
foreach ($componentes as $componente) {
    // Determinar clase de estado para el badge
    $estadoClass = '';
    switch ($componente['estado']) {
        case 'activo':
            $estadoClass = 'bg-success';
            break;
        case 'mantenimiento':
            $estadoClass = 'bg-warning';
            break;
        case 'averiado':
            $estadoClass = 'bg-danger';
            break;
        case 'vendido':
            $estadoClass = 'bg-secondary';
            break;
        case 'descanso':
            $estadoClass = 'bg-info';
            break;
        default:
            $estadoClass = 'bg-secondary';
    }

    // Formatear orómetro según tipo
    $orometro = number_format($componente['orometro_actual'], 2);
    $orometro .= $componente['tipo'] == 'horas' ? ' hrs' : ' km';

    // Verificar si hay imagen
    $imagen = !empty($componente['imagen']) && file_exists('../../../' . $componente['imagen'])
        ? getAssetUrl($componente['imagen'])
        : getAssetUrl('assets/img/placeholder-componente.png');

    // Preparar acciones
    $acciones = '<div class="btn-group btn-group-sm">';
    $acciones .= '<button type="button" class="btn btn-info btn-ver-componente" data-id="' . $componente['id'] . '" title="Ver detalles"><i class="fas fa-eye"></i></button>';
    if (tienePermiso('equipos.editar')) {
        $acciones .= '<button type="button" class="btn btn-primary btn-editar-componente" data-id="' . $componente['id'] . '" title="Editar"><i class="fas fa-edit"></i></button>';
    }
    if (tienePermiso('equipos.eliminar')) {
        $acciones .= '<button type="button" class="btn btn-danger btn-eliminar-componente" data-id="' . $componente['id'] . '" title="Eliminar"><i class="fas fa-trash"></i></button>';
    }
    $acciones .= '</div>';

    // Preparar fila de datos
    $data[] = [
        'id' => $componente['id'],
        'imagen' => '<img src="' . $imagen . '" class="img-thumbnail componente-thumbnail" alt="' . $componente['nombre'] . '">',
        'codigo' => '<span class="fw-bold">' . $componente['codigo'] . '</span>',
        'nombre' => $componente['nombre'],
        'equipo' => $componente['equipo_codigo'] . ' - ' . $componente['equipo_nombre'],
        'marca_modelo' => (!empty($componente['marca']) ? $componente['marca'] : '-') . ' ' . (!empty($componente['modelo']) ? $componente['modelo'] : ''),
        'estado' => '<span class="badge ' . $estadoClass . ' rounded-pill">' . ucfirst($componente['estado']) . '</span>',
        'orometro' => $orometro,
        'proximo_orometro' => number_format($componente['proximo_orometro'], 2) . ($componente['tipo'] == 'horas' ? ' hrs' : ' km'),
        'tipo' => ucfirst($componente['tipo']),
        'acciones' => $acciones
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
