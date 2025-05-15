<?php
// Incluir archivos necesarios
require_once '../../../db/funciones.php';
require_once '../../../db/conexion.php';

// Verificar autenticación
if (!estaAutenticado()) {
    header("Location: ../../../login.php");
    exit;
}

// Verificar permiso
if (!tienePermiso('mantenimientos.preventivo.ver')) {
    header("Location: ../../../dashboard.php?error=no_autorizado");
    exit;
}

// Obtener equipos para el formulario
$conexion = new Conexion();
$equipos = $conexion->select("SELECT id, nombre, codigo FROM equipos ORDER BY nombre");

// Obtener componentes para el formulario
$componentes = $conexion->select("SELECT id, nombre, codigo FROM componentes ORDER BY nombre");

// Título de la página
$titulo = "Calendario de Mantenimiento Preventivo";

// Definir CSS y JS adicionales para este módulo
$css_adicional = [
    'assets/plugins/datatables/css/datatables.min.css',
    'assets/css/mantenimiento/preventivo/preventivo.css',
    'assets/plugins/fullcalendar/main.min.css',
    'componentes/image-viewer/image-viewer.css',
    'componentes/toast/toast.css'
];

$js_adicional = [
    'assets/js/jquery-3.7.1.min.js',
    'assets/js/jquery.validate.min.js',
    'assets/plugins/datatables/js/datatables.min.js',
    'assets/plugins/fullcalendar/main.min.js',
    'assets/plugins/fullcalendar/locales/es.js',
    'componentes/ajax/ajax-utils.js',
    'componentes/image-viewer/image-viewer.js',
    'componentes/toast/toast.js',
    'assets/js/mantenimiento/preventivo/calendario.js'
];

// Incluir el header
$baseUrl = '../../../';
include_once '../../../includes/header.php';
include_once '../../../includes/navbar.php';
include_once '../../../includes/topbar.php';
?>

<div id="main-content" class="main-content">
    <!-- Cabecera compacta -->
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h1 class="page-title"><?php echo $titulo; ?></h1>
        <div class="d-flex">
            <a href="<?php echo $baseUrl; ?>modulos/mantenimiento/preventivo/index.php" class="btn btn-sm btn-outline-primary me-2">
                <i class="bi bi-table"></i> Ver Tabla
            </a>
            <?php if (tienePermiso('mantenimientos.preventivo.generar')): ?>
                <button type="button" id="btn-generar-mantenimientos" class="btn-nuevo">
                    <i class="bi bi-gear-fill"></i> Generar Mantenimientos
                </button>
            <?php endif; ?>
        </div>
    </div>

    <!-- Filtros -->
    <div class="filtros-container">
        <div class="filtros-header">Filtros</div>
        <div class="filtros-content">
            <div class="filtro-grupo">
                <label for="filtro-tipo" class="filtro-label">Tipo</label>
                <select id="filtro-tipo" class="filtro-select">
                    <option value="">Todos</option>
                    <option value="equipo">Equipos</option>
                    <option value="componente">Componentes</option>
                </select>
            </div>
            <div class="filtro-grupo">
                <label for="filtro-equipo" class="filtro-label">Equipo</label>
                <select id="filtro-equipo" class="filtro-select">
                    <option value="">Todos</option>
                    <?php foreach ($equipos as $equipo): ?>
                        <option value="<?php echo $equipo['id']; ?>"><?php echo htmlspecialchars($equipo['codigo'] . ' - ' . $equipo['nombre']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="filtro-grupo">
                <label for="filtro-componente" class="filtro-label">Componente</label>
                <select id="filtro-componente" class="filtro-select">
                    <option value="">Todos</option>
                    <?php foreach ($componentes as $componente): ?>
                        <option value="<?php echo $componente['id']; ?>"><?php echo htmlspecialchars($componente['codigo'] . ' - ' . $componente['nombre']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="filtro-grupo">
                <label for="filtro-estado" class="filtro-label">Estado</label>
                <select id="filtro-estado" class="filtro-select">
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="completado">Completado</option>
                </select>
            </div>
            <div class="filtros-actions">
                <button id="btn-aplicar-filtros" class="btn-aplicar">
                    <i class="bi bi-funnel"></i> Aplicar
                </button>
                <button id="btn-limpiar-filtros" class="btn-limpiar">
                    <i class="bi bi-x"></i> Limpiar
                </button>
            </div>
        </div>
    </div>

    <!-- Layout de dos columnas -->
    <div class="calendario-layout">
        <!-- Contenedor del calendario -->
        <div class="calendario-container">
            <div id="calendario-mantenimientos"></div>
        </div>

        <!-- Panel de detalles -->
        <div id="preventivo-detalle" class="preventivo-detail-container">
            <div class="detail-header">
                <h2 class="detail-title">Detalles del Mantenimiento</h2>
                <p class="detail-subtitle">Seleccione un mantenimiento para ver información</p>
            </div>
            <div class="detail-content">
                <div class="detail-empty">
                    <div class="detail-empty-icon">
                        <i class="bi bi-tools"></i>
                    </div>
                    <div class="detail-empty-text">
                        Seleccione un mantenimiento en el calendario para ver sus detalles
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal para completar mantenimiento -->
    <div class="modal fade" id="modal-completar-mantenimiento" tabindex="-1" aria-labelledby="modal-completar-titulo" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modal-completar-titulo">Completar Mantenimiento Preventivo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                    <form id="form-completar-mantenimiento">
                        <input type="hidden" id="mantenimiento-id" name="id">

                        <div class="form-group mb-3">
                            <label for="mantenimiento-orometro" class="form-label">Orómetro Actual <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input type="number" step="0.01" min="0" class="form-control" id="mantenimiento-orometro" name="orometro_actual" required>
                                <span class="input-group-text" id="unidad-orometro">hrs</span>
                            </div>
                            <div class="form-text">Ingrese el valor actual del orómetro.</div>
                        </div>

                        <div class="form-group mb-3">
                            <label for="mantenimiento-observaciones" class="form-label">Observaciones</label>
                            <textarea class="form-control" id="mantenimiento-observaciones" name="observaciones" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" id="btn-guardar-completar" class="btn btn-success">
                        <i class="bi bi-check-lg"></i> Completar
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Componente de visualización de imágenes -->
    <?php include_once '../../../componentes/image-viewer/image-viewer.php'; ?>

    <!-- Componente de notificaciones toast -->
    <?php include_once '../../../componentes/toast/toast.php'; ?>

    <?php
    // Incluir el footer
    include_once '../../../includes/footer.php';
    ?>