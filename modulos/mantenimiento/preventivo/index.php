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
if (!tienePermiso('mantenimientos.preventivo.acceder')) {
    header("Location: ../../../dashboard.php?error=no_autorizado");
    exit;
}

// Obtener equipos para el formulario
$conexion = new Conexion();
$equipos = $conexion->select("SELECT id, nombre, codigo FROM equipos ORDER BY nombre");

// Obtener componentes para el formulario
$componentes = $conexion->select("SELECT id, nombre, codigo FROM componentes ORDER BY nombre");

// Título de la página
$titulo = "Mantenimiento Preventivo";

// Definir CSS y JS adicionales para este módulo
$css_adicional = [
    'assets/plugins/datatables/css/datatables.min.css',
    'assets/plugins/datepicker/css/bootstrap-datepicker.min.css',
    'assets/css/mantenimiento/preventivo/preventivo.css',
    'componentes/image-upload/image-upload.css',
    'componentes/image-viewer/image-viewer.css',
    'componentes/toast/toast.css'
];

$js_adicional = [
    'assets/js/jquery-3.7.1.min.js',
    'assets/js/jquery.validate.min.js',
    'assets/plugins/datatables/js/datatables.min.js',
    'assets/plugins/datepicker/js/bootstrap-datepicker.min.js',
    'assets/plugins/datepicker/js/locales/bootstrap-datepicker.es.min.js',
    'componentes/ajax/ajax-utils.js',
    'componentes/image-upload/image-upload.js',
    'componentes/image-viewer/image-viewer.js',
    'componentes/toast/toast.js',
    'assets/js/mantenimiento/preventivo/preventivo.js'
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

        <!-- Botones de navegación -->
        <div class="btn-group">
            <a href="index.php" class="btn btn-sm btn-primary active">
                <i class="bi bi-list-ul"></i> Listado
            </a>
            <a href="calendario.php" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-calendar3"></i> Calendario
            </a>
        </div>
    </div>

    <!-- Filtros -->
    <div class="filtros-container">
        <div class="filtros-header">Filtros</div>
        <div class="filtros-content">
            <div class="filtro-grupo">
                <label for="filtro-estado" class="filtro-label">Estado</label>
                <select id="filtro-estado" class="filtro-select">
                    <option value="pendiente">Pendiente</option>
                    <option value="completado">Completado</option>
                    <option value="">Todos</option>
                </select>
            </div>
            <div class="filtro-grupo">
                <label for="filtro-tipo" class="filtro-label">Tipo</label>
                <select id="filtro-tipo" class="filtro-select">
                    <option value="">Todos</option>
                    <option value="equipo">Equipos</option>
                    <option value="componente">Componentes</option>
                </select>
            </div>
            <div class="filtro-grupo">
                <label for="filtro-fecha-desde" class="filtro-label">Fecha Desde</label>
                <input type="text" id="filtro-fecha-desde" class="filtro-select datepicker" placeholder="DD/MM/AAAA">
            </div>
            <div class="filtro-grupo">
                <label for="filtro-fecha-hasta" class="filtro-label">Fecha Hasta</label>
                <input type="text" id="filtro-fecha-hasta" class="filtro-select datepicker" placeholder="DD/MM/AAAA">
            </div>
            <div class="filtros-actions">
                <button id="btn-actualizar-fechas" class="btn-verificar" style="background-color: #4CAF50;">
                    <i class="bi bi-calendar-check"></i> Actualizar Fechas
                </button>
                <button id="btn-aplicar-filtros" class="btn-aplicar">
                    <i class="bi bi-funnel"></i> Aplicar
                </button>
                <button id="btn-limpiar-filtros" class="btn-limpiar">
                    <i class="bi bi-x"></i> Limpiar
                </button>
            </div>
        </div>
    </div>

    <!-- Contenedor de verificación -->
    <div id="verificacion-container" class="alert alert-info" style="display: none;">
        <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Verificando...</span>
            </div>
            <div>Verificando mantenimientos preventivos pendientes...</div>
        </div>
    </div>

    <!-- Contenedor de resultados de verificación -->
    <div id="verificacion-resultados" class="alert alert-warning" style="display: none;">
        <div class="d-flex justify-content-between align-items-center">
            <div id="verificacion-mensaje">Se encontraron equipos/componentes sin mantenimientos preventivos programados.</div>
            <div>
                <button id="btn-crear-faltantes" class="btn btn-sm btn-warning">
                    <i class="bi bi-plus-circle"></i> Crear Registros
                </button>
                <button id="btn-ignorar-faltantes" class="btn btn-sm btn-outline-secondary ms-2">
                    <i class="bi bi-x-circle"></i> Ignorar
                </button>
            </div>
        </div>
    </div>

    <!-- Mensaje de todo actualizado -->
    <div id="todo-actualizado" class="alert alert-success" style="display: none;">
        <i class="bi bi-check-circle-fill me-2"></i> Todos los mantenimientos preventivos están actualizados.
    </div>

    <!-- Layout de dos columnas -->
    <div class="mantenimientos-layout">
        <!-- Tabla de mantenimientos -->
        <div class="mantenimientos-table-container">
            <div class="table-container">
                <table id="mantenimientos-table" class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th width="50">Imagen</th>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Código</th>
                            <th>Orómetro Actual</th>
                            <th>Próximo Orómetro</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="9" class="text-center">Cargando datos...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Panel de detalles -->
        <div id="mantenimiento-detalle" class="mantenimientos-detail-container">
            <div class="detail-header">
                <h2 class="detail-title">Detalles del Mantenimiento</h2>
                <p class="detail-subtitle">Seleccione un mantenimiento para ver información</p>
            </div>
            <div class="detail-content">
                <div class="detail-empty">
                    <div class="detail-empty-icon">
                        <i class="bi bi-info-circle"></i>
                    </div>
                    <div class="detail-empty-text">
                        Seleccione un mantenimiento para ver sus detalles
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal para completar mantenimiento -->
    <div class="modal fade" id="modal-completar" tabindex="-1" aria-labelledby="modal-completar-titulo" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modal-completar-titulo">Completar Mantenimiento</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                    <form id="form-completar">
                        <input type="hidden" id="completar-id">
                        <input type="hidden" id="completar-tipo">

                        <div class="row">
                            <div class="col-md-8">
                                <!-- Información del mantenimiento -->
                                <div class="card-form mb-3">
                                    <div class="card-form-header">
                                        <i class="bi bi-tools me-2"></i>Información del Mantenimiento
                                    </div>
                                    <div class="card-form-body">
                                        <div class="row g-2">
                                            <div class="col-md-6">
                                                <div class="form-group mb-2">
                                                    <label for="completar-orometro-actual" class="form-label form-label-sm">Orómetro Actual <span class="text-danger">*</span></label>
                                                    <div class="input-group input-group-sm">
                                                        <input type="number" class="form-control form-control-sm" id="completar-orometro-actual" step="0.01" min="0" required>
                                                        <span class="input-group-text" id="completar-unidad-orometro">hrs</span>
                                                    </div>
                                                    <div class="form-text">Ingrese el valor actual del orómetro al momento de realizar el mantenimiento.</div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="form-group mb-2">
                                                    <label for="completar-fecha" class="form-label form-label-sm">Fecha de Realización <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control form-control-sm datepicker" id="completar-fecha" required>
                                                </div>
                                            </div>
                                            <div class="col-12">
                                                <div class="form-group mb-2">
                                                    <label for="completar-observaciones" class="form-label form-label-sm">Observaciones</label>
                                                    <textarea class="form-control form-control-sm" id="completar-observaciones" rows="3"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <!-- Imagen del mantenimiento -->
                                <div class="card-form mb-2">
                                    <div class="card-form-header">
                                        <i class="bi bi-image me-2"></i>Imagen del Mantenimiento
                                    </div>
                                    <div class="card-form-body text-center">
                                        <div class="image-upload-container" id="container-mantenimiento-imagen">
                                            <div class="image-upload-preview">
                                                <img src="<?php echo $baseUrl; ?>assets/img/mantenimiento/preventivo/default.png"
                                                    alt="Vista previa"
                                                    id="preview-mantenimiento-imagen"
                                                    class="image-preview">
                                                <div class="image-upload-overlay">
                                                    <div class="image-upload-buttons">
                                                        <button type="button" class="btn btn-sm btn-light" data-action="upload" title="Subir imagen">
                                                            <i class="bi bi-upload"></i>
                                                        </button>
                                                        <button type="button" class="btn btn-sm btn-light" data-action="camera" title="Tomar foto">
                                                            <i class="bi bi-camera"></i>
                                                        </button>
                                                        <button type="button" class="btn btn-sm btn-light" data-action="remove" title="Eliminar imagen" style="display:none;">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="file" name="imagen" id="input-mantenimiento-imagen" class="image-upload-input" accept="image/*">
                                            <input type="hidden" name="imagen_existing" id="existing-mantenimiento-imagen" value="">
                                        </div>
                                        <p class="text-muted small mt-2">Tamaño máximo: 2MB. Formatos: JPG, PNG, GIF, WEBP</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" id="btn-guardar-completar" class="btn btn-sm btn-success">
                        <i class="bi bi-check-circle"></i> Completar Mantenimiento
                    </button>
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
                    <h5 class="modal-title" id="modal-detalle-titulo">Detalles del Mantenimiento</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-1">
                        <!-- Información del mantenimiento -->
                        <div class="col-md-3 text-center mb-2">
                            <div class="mantenimiento-imagen-container">
                                <img id="detalle-imagen" src="<?php echo $baseUrl; ?>assets/img/mantenimiento/preventivo/default.png" alt="Imagen del mantenimiento" class="img-fluid rounded mb-1">
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
                                        <div class="col-md-3">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Código:</span>
                                                <span id="detalle-codigo" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Tipo:</span>
                                                <span id="detalle-tipo" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Fecha Programada:</span>
                                                <span id="detalle-fecha-programada" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
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
                                    <i class="bi bi-speedometer2 me-2"></i>Información de Orómetro
                                </div>
                                <div class="detalle-card-body">
                                    <div class="row g-1">
                                        <div class="col-md-3">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Tipo de Orómetro:</span>
                                                <span id="detalle-tipo-orometro" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Orómetro Anterior:</span>
                                                <span id="detalle-orometro-anterior" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Orómetro Actual:</span>
                                                <span id="detalle-orometro" class="detalle-valor">-</span>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="detalle-item">
                                                <span class="detalle-label">Próximo Orómetro:</span>
                                                <span id="detalle-proximo-orometro" class="detalle-valor">-</span>
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
                                        <span class="detalle-label">Descripción:</span>
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

                    <!-- Historial de mantenimientos -->
                    <div class="detalle-card mt-2">
                        <div class="detalle-card-header">
                            <i class="bi bi-clock-history me-2"></i>Historial de Mantenimientos
                        </div>
                        <div class="detalle-card-body">
                            <div class="table-responsive">
                                <table id="historial-table" class="table table-sm table-striped table-hover">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Orómetro</th>
                                            <th>Descripción</th>
                                            <th>Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historial-body">
                                        <!-- El historial se cargará dinámicamente -->
                                    </tbody>
                                </table>
                            </div>
                            <div id="sin-historial" class="text-center py-2 d-none">
                                <p class="text-muted mb-0">No hay registros de mantenimiento previos.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <?php if (tienePermiso('mantenimientos.preventivo.editar')): ?>
                        <button type="button" id="btn-completar-desde-detalle" class="btn btn-sm btn-success">
                            <i class="bi bi-check-circle me-1"></i> Completar Mantenimiento
                        </button>
                    <?php endif; ?>
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cerrar</button>
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