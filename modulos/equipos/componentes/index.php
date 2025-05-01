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
if (!tienePermiso('componentes.ver')) {
    header("Location: ../../../dashboard.php?error=no_autorizado");
    exit;
}

// Obtener equipos para el formulario
$conexion = new Conexion();
$equipos = $conexion->select("SELECT id, codigo, nombre FROM equipos ORDER BY nombre");

// Título de la página
$titulo = "Gestión de Componentes";

// Definir CSS y JS adicionales para este módulo
$css_adicional = [
    'assets/plugins/datatables/css/datatables.min.css',
    'assets/css/equipos/componentes/componentes.css',
    'componentes/image-upload/image-upload.css',
    'componentes/image-viewer/image-viewer.css',
    'componentes/toast/toast.css'
];

$js_adicional = [
    'assets/js/jquery-3.7.1.min.js',
    'assets/js/jquery.validate.min.js',
    'assets/plugins/datatables/js/datatables.min.js',
    'componentes/ajax/ajax-utils.js',
    'componentes/image-upload/image-upload.js',
    'componentes/image-viewer/image-viewer.js',
    'componentes/toast/toast.js',
    'assets/js/equipos/componentes/componentes.js'
];

// Incluir el header
$baseUrl = '../../../';
include_once '../../../includes/header.php';
include_once '../../../includes/navbar.php';
include_once '../../../includes/topbar.php';
?>

<div id="main-content" class="main-content">
    <!-- Cabecera de página -->
    <div class="page-header">
        <div class="container-fluid">
            <div class="row align-items-center">
                <div class="col">
                    <h1 class="page-title"><?php echo $titulo; ?></h1>
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb small">
                            <li class="breadcrumb-item"><a href="<?php echo $baseUrl; ?>dashboard.php">Dashboard</a></li>
                            <li class="breadcrumb-item"><a href="<?php echo $baseUrl; ?>modulos/equipos/equipos/">Equipos</a></li>
                            <li class="breadcrumb-item active" aria-current="page">Componentes</li>
                        </ol>
                    </nav>
                </div>
                <div class="col-auto">
                    <?php if (tienePermiso('componentes.crear')): ?>
                        <button type="button" id="btn-nuevo-componente" class="btn btn-primary">
                            <i class="bi bi-plus-circle me-1"></i> Nuevo Componente
                        </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- Contenido de la página -->
    <div class="page-content">
        <div class="container-fluid">
            <!-- Tarjeta de filtros -->
            <div class="card mb-3">
                <div class="card-header bg-light py-2">
                    <h5 class="card-title mb-0 small">Filtros</h5>
                </div>
                <div class="card-body py-2">
                    <div class="row g-2">
                        <div class="col-md-3">
                            <label for="filtro-equipo" class="form-label small">Equipo</label>
                            <select id="filtro-equipo" class="form-select form-select-sm">
                                <option value="">Todos</option>
                                <?php foreach ($equipos as $equipo): ?>
                                    <option value="<?php echo $equipo['id']; ?>"><?php echo htmlspecialchars($equipo['codigo'] . ' - ' . $equipo['nombre']); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="filtro-estado" class="form-label small">Estado</label>
                            <select id="filtro-estado" class="form-select form-select-sm">
                                <option value="">Todos</option>
                                <option value="activo">Activo</option>
                                <option value="mantenimiento">Mantenimiento</option>
                                <option value="averiado">Averiado</option>
                                <option value="vendido">Vendido</option>
                                <option value="descanso">Descanso</option>
                            </select>
                        </div>
                        <div class="col-md-3 d-flex align-items-end">
                            <button id="btn-aplicar-filtros" class="btn btn-sm btn-outline-primary me-2">
                                <i class="bi bi-filter me-1"></i> Aplicar
                            </button>
                            <button id="btn-limpiar-filtros" class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-x me-1"></i> Limpiar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabla de componentes -->
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="componentes-table" class="table table-sm table-striped table-hover data-table">
                            <thead>
                                <tr>
                                    <th width="60">Imagen</th>
                                    <th width="100">Código</th>
                                    <th>Nombre</th>
                                    <th width="150">Equipo</th>
                                    <th width="100">Marca</th>
                                    <th width="100">Estado</th>
                                    <th width="180">Progreso Mantenimiento</th>
                                    <th width="100">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="8" class="text-center">Cargando datos...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal para crear/editar componente -->
<div class="modal fade" id="modal-componente" tabindex="-1" aria-labelledby="modal-componente-titulo" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modal-componente-titulo">Nuevo Componente</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <form id="form-componente" enctype="multipart/form-data">
                    <input type="hidden" id="componente-id" name="id">

                    <div class="row">
                        <!-- Columna izquierda -->
                        <div class="col-md-8">
                            <div class="row g-2">
                                <!-- Información básica -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-codigo" class="form-label small">Código <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control form-control-sm" id="componente-codigo" name="codigo" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-nombre" class="form-label small">Nombre <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control form-control-sm" id="componente-nombre" name="nombre" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-equipo" class="form-label small">Equipo <span class="text-danger">*</span></label>
                                        <select class="form-select form-select-sm" id="componente-equipo" name="equipo_id" required>
                                            <option value="">Seleccione...</option>
                                            <?php foreach ($equipos as $equipo): ?>
                                                <option value="<?php echo $equipo['id']; ?>"><?php echo htmlspecialchars($equipo['codigo'] . ' - ' . $equipo['nombre']); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-tipo" class="form-label small">Tipo de Medición <span class="text-danger">*</span></label>
                                        <select class="form-select form-select-sm" id="componente-tipo" name="tipo" required>
                                            <option value="">Seleccione...</option>
                                            <option value="horas">Horas</option>
                                            <option value="kilometros">Kilómetros</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Detalles técnicos -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-marca" class="form-label small">Marca</label>
                                        <input type="text" class="form-control form-control-sm" id="componente-marca" name="marca">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-modelo" class="form-label small">Modelo</label>
                                        <input type="text" class="form-control form-control-sm" id="componente-modelo" name="modelo">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-serie" class="form-label small">Número de Serie</label>
                                        <input type="text" class="form-control form-control-sm" id="componente-serie" name="numero_serie">
                                    </div>
                                </div>

                                <!-- Estado y orómetro -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-estado" class="form-label small">Estado <span class="text-danger">*</span></label>
                                        <select class="form-select form-select-sm" id="componente-estado" name="estado" required>
                                            <option value="">Seleccione...</option>
                                            <option value="activo">Activo</option>
                                            <option value="mantenimiento">Mantenimiento</option>
                                            <option value="averiado">Averiado</option>
                                            <option value="vendido">Vendido</option>
                                            <option value="descanso">Descanso</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-orometro" class="form-label small">Orómetro Actual <span id="unidad-orometro">(hrs)</span></label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="componente-orometro" name="orometro_actual" value="0">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-limite" class="form-label small">Límite <span id="unidad-limite">(hrs)</span></label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="componente-limite" name="limite">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-notificacion" class="form-label small">Notificación <span id="unidad-notificacion">(hrs)</span></label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="componente-notificacion" name="notificacion">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="componente-mantenimiento" class="form-label small">Mantenimiento <span id="unidad-mantenimiento">(hrs)</span></label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="componente-mantenimiento" name="mantenimiento">
                                    </div>
                                </div>

                                <!-- Observaciones -->
                                <div class="col-12">
                                    <div class="form-group mb-2">
                                        <label for="componente-observaciones" class="form-label small">Observaciones</label>
                                        <textarea class="form-control form-control-sm" id="componente-observaciones" name="observaciones" rows="3"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Columna derecha (imagen) -->
                        <div class="col-md-4">
                            <div class="form-group mb-2">
                                <label class="form-label small">Imagen del Componente</label>
                                <div class="image-upload-container" id="container-componente-imagen">
                                    <div class="image-upload-preview">
                                        <img src="<?php echo $baseUrl; ?>assets/img/equipos/componentes/default.png"
                                            alt="Vista previa"
                                            id="preview-componente-imagen"
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
                                    <input type="file" name="imagen" id="input-componente-imagen" class="image-upload-input" accept="image/*">
                                    <input type="hidden" name="imagen_existing" id="existing-componente-imagen" value="">
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btn-guardar-componente" class="btn btn-sm btn-primary">Guardar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal para ver detalles del componente -->
<div class="modal fade" id="modal-detalle-componente" tabindex="-1" aria-labelledby="modal-detalle-titulo" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modal-detalle-titulo">Detalles del Componente</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <!-- Información del componente -->
                    <div class="col-md-4 text-center mb-3">
                        <div class="componente-imagen-container">
                            <img id="detalle-imagen" src="<?php echo $baseUrl; ?>assets/img/equipos/componentes/default.png" alt="Imagen del componente" class="img-fluid rounded mb-2">
                            <button type="button" id="btn-ver-imagen" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-search-plus me-1"></i> Ampliar
                            </button>
                        </div>
                        <div class="mt-3">
                            <span id="detalle-estado" class="badge rounded-pill bg-success">Activo</span>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <h4 id="detalle-nombre" class="fs-5 mb-3">Nombre del Componente</h4>

                        <div class="row g-2">
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Código:</span>
                                    <span id="detalle-codigo" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Equipo:</span>
                                    <span id="detalle-equipo" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Tipo:</span>
                                    <span id="detalle-tipo" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Marca:</span>
                                    <span id="detalle-marca" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Modelo:</span>
                                    <span id="detalle-modelo" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Número de Serie:</span>
                                    <span id="detalle-serie" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Orómetro Actual:</span>
                                    <span id="detalle-orometro" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Próximo Orómetro:</span>
                                    <span id="detalle-proximo-orometro" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Límite:</span>
                                    <span id="detalle-limite" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Notificación:</span>
                                    <span id="detalle-notificacion" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Mantenimiento:</span>
                                    <span id="detalle-mantenimiento" class="detalle-valor">-</span>
                                </div>
                            </div>
                        </div>

                        <div class="mt-3">
                            <div class="detalle-item">
                                <span class="detalle-label">Observaciones:</span>
                                <p id="detalle-observaciones" class="detalle-valor mt-1">-</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <?php if (tienePermiso('componentes.editar')): ?>
                    <button type="button" id="btn-editar-desde-detalle" class="btn btn-sm btn-primary">
                        <i class="bi bi-pencil me-1"></i> Editar
                    </button>
                <?php endif; ?>
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal de confirmación para eliminar -->
<div class="modal fade" id="modal-confirmar-eliminar" tabindex="-1" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Confirmar Eliminación</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <p>¿Está seguro que desea eliminar este componente?</p>
                <p class="text-danger small mb-0">Esta acción no se puede deshacer.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btn-confirmar-eliminar" class="btn btn-sm btn-danger">Eliminar</button>
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