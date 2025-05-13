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
    'componentes/image-upload/image-upload.css',
    'componentes/image-viewer/image-viewer.css',
    'componentes/toast/toast.css',
    'assets/plugins/fullcalendar/main.min.css'
];

$js_adicional = [
    'assets/js/jquery-3.7.1.min.js',
    'assets/js/jquery.validate.min.js',
    'assets/plugins/datatables/js/datatables.min.js',
    'assets/plugins/fullcalendar/main.min.js',
    'assets/plugins/fullcalendar/locales/es.js',
    'componentes/ajax/ajax-utils.js',
    'componentes/image-upload/image-upload.js',
    'componentes/image-viewer/image-viewer.js',
    'componentes/toast/toast.js',
    'assets/js/mantenimiento/preventivo/preventivo.js',
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
        <a href="<?php echo $baseUrl; ?>modulos/mantenimiento/preventivo/" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-arrow-left"></i> Volver a Mantenimiento Preventivo
        </a>
    </div>

    <!-- Filtros -->
    <div class="filtros-container">
        <div class="filtros-header">Filtros del Calendario</div>
        <div class="filtros-content">
            <div class="filtro-grupo">
                <label for="cal-filtro-equipo" class="filtro-label">Equipo</label>
                <select id="cal-filtro-equipo" class="filtro-select">
                    <option value="">Todos</option>
                    <?php foreach ($equipos as $equipo): ?>
                        <option value="<?php echo $equipo['id']; ?>"><?php echo htmlspecialchars($equipo['codigo'] . ' - ' . $equipo['nombre']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="filtro-grupo">
                <label for="cal-filtro-componente" class="filtro-label">Componente</label>
                <select id="cal-filtro-componente" class="filtro-select">
                    <option value="">Todos</option>
                    <?php foreach ($componentes as $componente): ?>
                        <option value="<?php echo $componente['id']; ?>"><?php echo htmlspecialchars($componente['codigo'] . ' - ' . $componente['nombre']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="filtro-grupo">
                <label for="cal-filtro-estado" class="filtro-label">Estado</label>
                <select id="cal-filtro-estado" class="filtro-select">
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="completado">Completado</option>
                </select>
            </div>
            <div class="filtros-actions">
                <button id="cal-btn-aplicar-filtros" class="btn-aplicar">
                    <i class="bi bi-funnel"></i> Aplicar
                </button>
                <button id="cal-btn-limpiar-filtros" class="btn-limpiar">
                    <i class="bi bi-x"></i> Limpiar
                </button>
                <?php if (tienePermiso('mantenimientos.preventivo.crear')): ?>
                    <button type="button" id="btn-nuevo-mantenimiento" class="btn-nuevo">
                        <i class="bi bi-plus-circle"></i> Nuevo Mantenimiento
                    </button>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Calendario -->
    <div class="card-form mb-2">
        <div class="card-form-header">
            <i class="bi bi-calendar3 me-2"></i>Calendario de Mantenimientos Preventivos
            <div class="float-end">
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-sm btn-outline-primary" id="btn-vista-mes">
                        <i class="bi bi-calendar-month"></i> Mes
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-primary" id="btn-vista-semana">
                        <i class="bi bi-calendar-week"></i> Semana
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-primary" id="btn-vista-dia">
                        <i class="bi bi-calendar-day"></i> Día
                    </button>
                </div>
            </div>
        </div>
        <div class="card-form-body">
            <div id="calendario-mantenimientos"></div>
        </div>
    </div>

    <!-- Leyenda del calendario -->
    <div class="card-form mb-2">
        <div class="card-form-header">
            <i class="bi bi-info-circle me-2"></i>Leyenda
        </div>
        <div class="card-form-body">
            <div class="row">
                <div class="col-md-3">
                    <div class="leyenda-item">
                        <span class="leyenda-color" style="background-color: #4361ee;"></span>
                        <span class="leyenda-texto">Mantenimiento Pendiente</span>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="leyenda-item">
                        <span class="leyenda-color" style="background-color: #c8c8c8;"></span>
                        <span class="leyenda-texto">Mantenimiento Completado</span>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="leyenda-item">
                        <span class="leyenda-color leyenda-dashed" style="border: 2px dashed #4361ee;"></span>
                        <span class="leyenda-texto">Fecha Estimada (por orómetro)</span>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="leyenda-item">
                        <span class="leyenda-color" style="background-color: #ff6b6b;"></span>
                        <span class="leyenda-texto">Mantenimiento Vencido</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal para crear/editar mantenimiento -->
    <div class="modal fade" id="modal-mantenimiento" tabindex="-1" aria-labelledby="modal-mantenimiento-titulo" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modal-mantenimiento-titulo">Nuevo Mantenimiento Preventivo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                    <form id="form-mantenimiento" enctype="multipart/form-data">
                        <input type="hidden" id="mantenimiento-id" name="id">

                        <div class="row g-1">
                            <!-- Columna izquierda -->
                            <div class="col-md-12">
                                <!-- Tarjeta de selección de equipo/componente -->
                                <div class="card-form mb-2">
                                    <div class="card-form-header">
                                        <i class="bi bi-gear-fill me-2"></i>Selección de Equipo/Componente
                                    </div>
                                    <div class="card-form-body">
                                        <div class="row g-1">
                                            <div class="col-md-12">
                                                <div class="form-group mb-2">
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="radio" name="tipo_seleccion" id="tipo-equipo" value="equipo" checked>
                                                        <label class="form-check-label" for="tipo-equipo">Equipo</label>
                                                    </div>
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="radio" name="tipo_seleccion" id="tipo-componente" value="componente">
                                                        <label class="form-check-label" for="tipo-componente">Componente</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-12" id="contenedor-equipo">
                                                <div class="form-group mb-2">
                                                    <label for="mantenimiento-equipo" class="form-label form-label-sm">Equipo <span class="text-danger">*</span></label>
                                                    <select class="form-select form-select-sm" id="mantenimiento-equipo" name="equipo_id">
                                                        <option value="">Seleccione...</option>
                                                        <?php foreach ($equipos as $equipo): ?>
                                                            <option value="<?php echo $equipo['id']; ?>"><?php echo htmlspecialchars($equipo['codigo'] . ' - ' . $equipo['nombre']); ?></option>
                                                        <?php endforeach; ?>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-12 d-none" id="contenedor-componente">
                                                <div class="form-group mb-2">
                                                    <label for="mantenimiento-componente" class="form-label form-label-sm">Componente <span class="text-danger">*</span></label>
                                                    <select class="form-select form-select-sm" id="mantenimiento-componente" name="componente_id">
                                                        <option value="">Seleccione...</option>
                                                        <?php foreach ($componentes as $componente): ?>
                                                            <option value="<?php echo $componente['id']; ?>"><?php echo htmlspecialchars($componente['codigo'] . ' - ' . $componente['nombre']); ?></option>
                                                        <?php endforeach; ?>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tarjeta de información de mantenimiento -->
                                <div class="card-form mb-2">
                                    <div class="card-form-header">
                                        <i class="bi bi-tools me-2"></i>Información del Mantenimiento
                                    </div>
                                    <div class="card-form-body">
                                        <div class="row g-1">
                                            <div class="col-md-12">
                                                <div class="form-group mb-2">
                                                    <label for="mantenimiento-descripcion" class="form-label form-label-sm">Descripción/Razón <span class="text-danger">*</span></label>
                                                    <textarea class="form-control form-control-sm" id="mantenimiento-descripcion" name="descripcion_razon" rows="2" required></textarea>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="form-group mb-2">
                                                    <label for="mantenimiento-orometro" class="form-label form-label-sm">Orómetro Programado <span class="text-danger">*</span></label>
                                                    <div class="input-group input-group-sm">
                                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="mantenimiento-orometro" name="orometro_programado" required>
                                                        <span class="input-group-text unidad-orometro">hrs</span>
                                                    </div>
                                                    <small class="text-muted">Orómetro actual: <span id="orometro-actual">0</span> <span class="unidad-orometro">hrs</span></small>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="form-group mb-2">
                                                    <label for="mantenimiento-fecha" class="form-label form-label-sm">Fecha Programada (opcional)</label>
                                                    <input type="datetime-local" class="form-control form-control-sm" id="mantenimiento-fecha" name="fecha_hora_programada">
                                                    <small class="text-muted">Si no se especifica, se calculará automáticamente.</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tarjeta de observaciones -->
                                <div class="card-form mb-2">
                                    <div class="card-form-header">
                                        <i class="bi bi-chat-left-text me-2"></i>Observaciones
                                    </div>
                                    <div class="card-form-body">
                                        <div class="form-group">
                                            <textarea class="form-control form-control-sm" id="mantenimiento-observaciones" name="observaciones" rows="2" placeholder="Ingrese observaciones adicionales sobre el mantenimiento..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" id="btn-guardar-mantenimiento" class="btn btn-sm btn-primary">Guardar</button>
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal para ver detalles del mantenimiento -->
    <div class="modal fade" id="modal-detalle-mantenimiento" tabindex="-1" aria-labelledby="modal-detalle-titulo" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modal-detalle-titulo">Detalles del Mantenimiento Preventivo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-1">
                        <!-- Información del mantenimiento -->
                        <div class="col-md-3 text-center mb-2">
                            <div class="componente-imagen-container">
                                <img id="detalle-imagen" src="<?php echo $baseUrl; ?>assets/img/equipos/default.png" alt="Imagen del equipo/componente" class="img-fluid rounded mb-1">
                                <button type="button" id="btn-ver-imagen" class="btn btn-sm btn-outline-primary">
                                    <i class="bi bi-search-plus me-1"></i> Ampliar
                                </button>
                            </div>
                            <div class="mt-1">
                                <span id="detalle-estado" class="badge rounded-pill bg-success">Pendiente</span>
                            </div>
                            <!-- Tiempo restante para mantenimiento -->
                            <div id="detalle-tiempo-restante" class="mt-1"></div>
                        </div>
                        <div class="col-md-9">
                            <h4 id="detalle-nombre" class="fs-5 mb-2">Nombre del Equipo/Componente</h4>
                            <!-- Tarjetas de información -->
                            <div class="detalle-card mb-2">
                                <div class="detalle-card-header">
                                    <i class="bi bi-info-circle me-2"></i>Información Básica
                                </div>
                                <div class="detalle-card-body">
                                    <div class="row g-1">
                                        <div class="col-md-4">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Código:</span>
                                                <span id="detalle-codigo" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Tipo:</span>
                                                <span id="detalle-tipo" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Tipo Orómetro:</span>
                                                <span id="detalle-tipo-orometro" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="detalle-card mb-2">
                                <div class="detalle-card-header">
                                    <i class="bi bi-tools me-2"></i>Información del Mantenimiento
                                </div>
                                <div class="detalle-card-body">
                                    <div class="row g-1">
                                        <div class="col-md-6">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Orómetro Programado:</span>
                                                <span id="detalle-orometro-programado" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Orómetro Actual:</span>
                                                <span id="detalle-orometro-actual" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Fecha Programada:</span>
                                                <span id="detalle-fecha-programada" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Fecha Realizado:</span>
                                                <span id="detalle-fecha-realizado" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="detalle-card mb-2">
                                <div class="detalle-card-header">
                                    <i class="bi bi-chat-left-text me-2"></i>Descripción y Observaciones
                                </div>
                                <div class="detalle-card-body">
                                    <div class="detalle-item mb-2">
                                        <span class="detalle-label">Descripción/Razón:</span>
                                        <p id="detalle-descripcion" class="detalle-valor mb-0">-</p>
                                    </div>
                                    <div class="detalle-item">
                                        <span class="detalle-label">Observaciones:</span>
                                        <p id="detalle-observaciones" class="detalle-valor mb-0">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Formulario para completar mantenimiento -->
                    <div id="contenedor-completar" class="mt-3 d-none">
                        <div class="card-form">
                            <div class="card-form-header">
                                <i class="bi bi-check-circle me-2"></i>Completar Mantenimiento
                            </div>
                            <div class="card-form-body">
                                <form id="form-completar">
                                    <input type="hidden" id="completar-id" name="id">
                                    <div class="form-group">
                                        <label for="completar-observaciones" class="form-label form-label-sm">Observaciones:</label>
                                        <textarea class="form-control form-control-sm" id="completar-observaciones" name="observaciones" rows="3" placeholder="Ingrese observaciones sobre el mantenimiento realizado..."></textarea>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <?php if (tienePermiso('mantenimientos.preventivo.editar')): ?>
                        <button type="button" id="btn-editar-desde-detalle" class="btn btn-sm btn-primary">
                            <i class="bi bi-pencil me-1"></i> Editar
                        </button>
                    <?php endif; ?>
                    <?php if (tienePermiso('mantenimientos.preventivo.completar')): ?>
                        <button type="button" id="btn-completar-mantenimiento" class="btn btn-sm btn-success">
                            <i class="bi bi-check-circle me-1"></i> Completar
                        </button>
                        <button type="button" id="btn-guardar-completar" class="btn btn-sm btn-success d-none">
                            <i class="bi bi-save me-1"></i> Guardar Completado
                        </button>
                    <?php endif; ?>
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de confirmación para completar -->
    <div class="modal fade" id="modal-confirmar-completar" tabindex="-1" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">
                        <i class="bi bi-check-circle-fill me-2"></i>Confirmar Completado
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body text-center p-4">
                    <div class="mb-4">
                        <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                    </div>
                    <h4 class="mb-3">¿Está seguro que desea marcar este mantenimiento como completado?</h4>
                    <p class="text-muted mb-0">Esta acción registrará el mantenimiento como completado y actualizará el historial.</p>
                    <div class="alert alert-warning mt-3">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        <strong>Nota:</strong> Esta acción no se puede deshacer.
                    </div>
                </div>
                <div class="modal-footer justify-content-center">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="bi bi-x-circle me-2"></i>Cancelar
                    </button>
                    <button type="button" id="btn-confirmar-completar" class="btn btn-success">
                        <i class="bi bi-check-circle me-2"></i>Confirmar Completado
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