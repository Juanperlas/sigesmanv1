<?php
// Incluir archivos necesarios
require_once "../../../db/funciones.php";
require_once "../../../db/conexion.php";

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER["HTTP_X_REQUESTED_WITH"]) &&
    strtolower($_SERVER["HTTP_X_REQUESTED_WITH"]) === "xmlhttprequest";

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Acceso no permitido"]);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autenticado"]);
    exit;
}

// Verificar permiso
if (!tienePermiso("mantenimientos.preventivo.editar")) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "No tiene permisos para completar mantenimientos"]);
    exit;
}

// Verificar método de solicitud
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit;
}

// Verificar que se proporcionaron los datos necesarios
if (!isset($_POST["id"]) || empty($_POST["id"]) || !isset($_POST["orometro_actual"]) || $_POST["orometro_actual"] === "") {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

$id = intval($_POST["id"]);
$orometroActual = floatval($_POST["orometro_actual"]);
$observaciones = isset($_POST["observaciones"]) ? sanitizar($_POST["observaciones"]) : "";

try {
    // Conexión a la base de datos
    $conexion = new Conexion();
    $conn = $conexion->getConexion();

    // Iniciar transacción
    $conn->beginTransaction();

    // Obtener datos del mantenimiento preventivo
    $sql = "
        SELECT 
            mp.*,
            CASE 
                WHEN mp.equipo_id IS NOT NULL THEN 'equipo'
                ELSE 'componente'
            END as tipo
        FROM mantenimiento_preventivo mp
        WHERE mp.id = ?
    ";

    $mantenimiento = $conexion->selectOne($sql, [$id]);

    if (!$mantenimiento) {
        throw new Exception("Mantenimiento no encontrado");
    }

    if ($mantenimiento["estado"] !== "pendiente") {
        throw new Exception("Este mantenimiento ya ha sido completado o cancelado");
    }

    // Determinar si es equipo o componente
    $tipo = $mantenimiento["tipo"];
    $equipoId = $mantenimiento["equipo_id"];
    $componenteId = $mantenimiento["componente_id"];

    // 1. Actualizar el estado del mantenimiento a completado
    $datosMantenimiento = [
        "estado" => "completado",
        "fecha_realizado" => date("Y-m-d H:i:s"),
        "observaciones" => $observaciones
    ];

    $conexion->update("mantenimiento_preventivo", $datosMantenimiento, "id = ?", [$id]);

    // 2. Actualizar el orómetro actual del equipo o componente
    if ($tipo === "equipo") {
        // Obtener datos del equipo
        $equipo = $conexion->selectOne("SELECT * FROM equipos WHERE id = ?", [$equipoId]);

        if (!$equipo) {
            throw new Exception("Equipo no encontrado");
        }

        // Actualizar orómetro del equipo
        $datosEquipo = [
            "anterior_orometro" => $orometroActual,
            "orometro_actual" => $orometroActual
        ];

        $conexion->update("equipos", $datosEquipo, "id = ?", [$equipoId]);

        // 3. Generar nuevo mantenimiento preventivo
        $proximoOrometro = $orometroActual + $equipo["mantenimiento"];
        $descripcion = "Mantenimiento preventivo programado para el equipo {$equipo["nombre"]} (Código: {$equipo["codigo"]})";

        // Calcular fecha programada basada en el límite diario
        $fechaProgramada = calcularFechaProgramada($orometroActual, $proximoOrometro, $equipo["limite"]);

        $datosNuevoMantenimiento = [
            "equipo_id" => $equipoId,
            "descripcion_razon" => $descripcion,
            "fecha_hora_programada" => $fechaProgramada,
            "orometro_programado" => $proximoOrometro
        ];

        $nuevoMantenimientoId = $conexion->insert("mantenimiento_preventivo", $datosNuevoMantenimiento);

        // 4. Actualizar próximo orómetro del equipo
        $datosProximoOrometro = [
            "proximo_orometro" => $proximoOrometro
        ];

        $conexion->update("equipos", $datosProximoOrometro, "id = ?", [$equipoId]);
    } else {
        // Obtener datos del componente
        $componente = $conexion->selectOne("SELECT * FROM componentes WHERE id = ?", [$componenteId]);

        if (!$componente) {
            throw new Exception("Componente no encontrado");
        }

        // Actualizar orómetro del componente
        $datosComponente = [
            "anterior_orometro" => $orometroActual,
            "orometro_actual" => $orometroActual
        ];

        $conexion->update("componentes", $datosComponente, "id = ?", [$componenteId]);

        // 3. Generar nuevo mantenimiento preventivo
        $proximoOrometro = $orometroActual + $componente["mantenimiento"];
        $descripcion = "Mantenimiento preventivo programado para el componente {$componente["nombre"]} (Código: {$componente["codigo"]})";

        // Calcular fecha programada basada en el límite diario
        $fechaProgramada = calcularFechaProgramada($orometroActual, $proximoOrometro, $componente["limite"]);

        $datosNuevoMantenimiento = [
            "componente_id" => $componenteId,
            "descripcion_razon" => $descripcion,
            "fecha_hora_programada" => $fechaProgramada,
            "orometro_programado" => $proximoOrometro
        ];

        $nuevoMantenimientoId = $conexion->insert("mantenimiento_preventivo", $datosNuevoMantenimiento);

        // 4. Actualizar próximo orómetro del componente
        $datosProximoOrometro = [
            "proximo_orometro" => $proximoOrometro
        ];

        $conexion->update("componentes", $datosProximoOrometro, "id = ?", [$componenteId]);
    }

    // 5. Registrar en historial de mantenimiento
    $datosHistorial = [
        "tipo_mantenimiento" => "preventivo",
        "mantenimiento_id" => $id,
        "equipo_id" => $equipoId,
        "componente_id" => $componenteId,
        "descripcion" => $mantenimiento["descripcion_razon"],
        "fecha_realizado" => date("Y-m-d H:i:s"),
        "orometro_realizado" => $orometroActual,
        "observaciones" => $observaciones
    ];

    $conexion->insert("historial_mantenimiento", $datosHistorial);

    // Confirmar transacción
    $conn->commit();

    // Preparar respuesta
    $response = [
        "success" => true,
        "message" => "Mantenimiento completado correctamente",
        "nuevo_mantenimiento_id" => $nuevoMantenimientoId
    ];
} catch (Exception $e) {
    // Revertir transacción en caso de error
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }

    // Preparar respuesta de error
    $response = [
        "success" => false,
        "message" => "Error al completar el mantenimiento: " . $e->getMessage()
    ];

    // Registrar error en log
    error_log("Error en completar.php: " . $e->getMessage());
}

// Devolver respuesta en formato JSON
header("Content-Type: application/json");
echo json_encode($response);

/**
 * Calcula la fecha programada para el mantenimiento basada en el límite diario
 * @param float $orometroActual Orómetro actual
 * @param float $proximoOrometro Próximo orómetro
 * @param float $limiteDiario Límite diario (trabajo por día)
 * @return string Fecha programada en formato Y-m-d H:i:s
 */
function calcularFechaProgramada($orometroActual, $proximoOrometro, $limiteDiario)
{
    // Si no hay límite diario definido, usar un valor por defecto
    if (empty($limiteDiario) || $limiteDiario <= 0) {
        $limiteDiario = 8; // 8 horas o 8 km por día por defecto
    }

    // Calcular la diferencia de orómetros
    $diferenciaOrometros = $proximoOrometro - $orometroActual;

    // Calcular días necesarios (redondeando hacia arriba)
    $diasNecesarios = ceil($diferenciaOrometros / $limiteDiario);

    // Si son menos de 1 día, establecer mínimo 1 día
    $diasNecesarios = max(1, $diasNecesarios);

    // Calcular fecha programada
    return date("Y-m-d H:i:s", strtotime("+{$diasNecesarios} days"));
}
