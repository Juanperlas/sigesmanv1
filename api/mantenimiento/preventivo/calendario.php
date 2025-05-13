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

// Parámetros de filtrado
$start = isset($_GET['start']) ? $_GET['start'] : date('Y-m-d', strtotime('-1 month'));
$end = isset($_GET['end']) ? $_GET['end'] : date('Y-m-d', strtotime('+2 months'));
$equipoId = isset($_GET['equipo_id']) ? intval($_GET['equipo_id']) : null;
$componenteId = isset($_GET['componente_id']) ? intval($_GET['componente_id']) : null;
$estado = isset($_GET['estado']) ? $_GET['estado'] : null;

try {
    // Conexión a la base de datos
    $conexion = new Conexion();

    // Construir la consulta SQL
    $sql = "SELECT mp.*, 
            e.codigo as equipo_codigo, e.nombre as equipo_nombre, e.tipo_orometro as equipo_tipo_orometro,
            c.codigo as componente_codigo, c.nombre as componente_nombre, c.tipo_orometro as componente_tipo_orometro
            FROM mantenimiento_preventivo mp
            LEFT JOIN equipos e ON mp.equipo_id = e.id
            LEFT JOIN componentes c ON mp.componente_id = c.id
            WHERE 1=1";

    $params = [];

    // Filtrar por fecha
    if ($start) {
        $sql .= " AND (mp.fecha_hora_programada >= ? OR mp.fecha_hora_programada IS NULL)";
        $params[] = $start;
    }
    
    if ($end) {
        $sql .= " AND (mp.fecha_hora_programada <= ? OR mp.fecha_hora_programada IS NULL)";
        $params[] = $end;
    }

    // Filtrar por equipo
    if ($equipoId) {
        $sql .= " AND mp.equipo_id = ?";
        $params[] = $equipoId;
    }

    // Filtrar por componente
    if ($componenteId) {
        $sql .= " AND mp.componente_id = ?";
        $params[] = $componenteId;
    }

    // Filtrar por estado
    if ($estado) {
        $sql .= " AND mp.estado = ?";
        $params[] = $estado;
    }

    // Ordenar por fecha
    $sql .= " ORDER BY mp.fecha_hora_programada ASC";

    // Ejecutar la consulta
    $mantenimientos = $conexion->select($sql, $params);

    // Preparar eventos para el calendario
    $eventos = [];
    foreach ($mantenimientos as $mantenimiento) {
        // Determinar si es equipo o componente
        $esEquipo = !empty($mantenimiento['equipo_id']);
        $codigo = $esEquipo ? $mantenimiento['equipo_codigo'] : $mantenimiento['componente_codigo'];
        $nombre = $esEquipo ? $mantenimiento['equipo_nombre'] : $mantenimiento['componente_nombre'];
        $tipoOrometro = $esEquipo ? $mantenimiento['equipo_tipo_orometro'] : $mantenimiento['componente_tipo_orometro'];
        $unidad = $tipoOrometro == 'horas' ? 'hrs' : 'km';
        
        // Determinar color según estado
        $color = '#4361ee'; // Azul para preventivo
        $textColor = '#ffffff';
        
        if ($mantenimiento['estado'] === 'completado') {
            $color = '#c8c8c8'; // Gris para completado
            $textColor = '#333333';
        }
        
        // Determinar fecha del evento
        $fechaEvento = $mantenimiento['fecha_hora_programada'];
        
        // Si no hay fecha programada, calcular fecha estimada
        if (empty($fechaEvento)) {
            // Obtener orómetro actual y límite diario
            if ($esEquipo) {
                $equipo = $conexion->selectOne(
                    "SELECT orometro_actual, limite FROM equipos WHERE id = ?", 
                    [$mantenimiento['equipo_id']]
                );
                
                if ($equipo && $equipo['limite'] > 0) {
                    $orometroActual = $equipo['orometro_actual'];
                    $limiteDiario = $equipo['limite'];
                    
                    // Calcular días estimados
                    $tiempoRestante = $mantenimiento['orometro_programado'] - $orometroActual;
                    $diasEstimados = ceil($tiempoRestante / $limiteDiario);
                    
                    // Calcular fecha estimada
                    $fechaEvento = date('Y-m-d', strtotime("+$diasEstimados days"));
                } else {
                    // Si no hay límite, usar fecha actual
                    $fechaEvento = date('Y-m-d');
                }
            } else {
                $componente = $conexion->selectOne(
                    "SELECT orometro_actual, limite FROM componentes WHERE id = ?", 
                    [$mantenimiento['componente_id']]
                );
                
                if ($componente && $componente['limite'] > 0) {
                    $orometroActual = $componente['orometro_actual'];
                    $limiteDiario = $componente['limite'];
                    
                    // Calcular días estimados
                    $tiempoRestante = $mantenimiento['orometro_programado'] - $orometroActual;
                    $diasEstimados = ceil($tiempoRestante / $limiteDiario);
                    
                    // Calcular fecha estimada
                    $fechaEvento = date('Y-m-d', strtotime("+$diasEstimados days"));
                } else {
                    // Si no hay límite, usar fecha actual
                    $fechaEvento = date('Y-m-d');
                }
            }
        }
        
        // Crear evento para el calendario
        $evento = [
            'id' => $mantenimiento['id'],
            'title' => ($esEquipo ? 'Equipo: ' : 'Componente: ') . $codigo . ' - ' . $nombre,
            'start' => $fechaEvento,
            'backgroundColor' => $color,
            'borderColor' => $color,
            'textColor' => $textColor,
            'extendedProps' => [
                'tipo' => 'preventivo',
                'estado' => $mantenimiento['estado'],
                'orometro' => $mantenimiento['orometro_programado'] . ' ' . $unidad,
                'descripcion' => $mantenimiento['descripcion_razon'],
                'observaciones' => $mantenimiento['observaciones'],
                'esEquipo' => $esEquipo,
                'equipoId' => $mantenimiento['equipo_id'],
                'componenteId' => $mantenimiento['componente_id'],
                'fechaEstimada' => empty($mantenimiento['fecha_hora_programada'])
            ],
            'allDay' => true
        ];
        
        $eventos[] = $evento;
    }

    // Enviar respuesta
    header('Content-Type: application/json');
    echo json_encode($eventos);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al obtener eventos del calendario: ' . $e->getMessage()]);
}