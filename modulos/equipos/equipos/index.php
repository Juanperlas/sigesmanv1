<?php
// Este archivo será cargado mediante AJAX para la navegación SPA
// No incluye header, navbar, topbar ni footer

// Verificar si es una solicitud AJAX
$esAjax = false;
if (
    isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest'
) {
    $esAjax = true;
}
if (isset($_GET['ajax']) && $_GET['ajax'] == '1') {
    $esAjax = true;
}
if (!$esAjax) {
    echo "<!-- No es una solicitud AJAX. Redirigiendo... -->";
    header("Location: ../../../dashboard.php");
    exit;
}

// Incluir archivos necesarios
require_once '../../../db/funciones.php';
require_once '../../../db/conexion.php';

// Verificar autenticación
if (!estaAutenticado()) {
    echo json_encode(['error' => 'No autenticado']);
    exit;
}

// Verificar permiso
if (!tienePermiso('equipos.ver')) {
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

// Obtener categorías de equipos para el formulario
$conexion = new Conexion();
$categorias = $conexion->select("SELECT id, nombre FROM categorias_equipos ORDER BY nombre");

// Título de la página
$titulo = "Gestión de Equipos";

// Definir CSS y JS adicionales para este módulo
$css_adicional = [
    'assets/plugins/datatables/css/datatables.min.css',
    'assets/css/equipos/equipos/equipos.css',
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
    'assets/js/equipos/equipos/equipos.js'
];
?>

<!-- CSS adicional para este módulo -->
<?php foreach ($css_adicional as $css): ?>
    <link rel="stylesheet" href="<?php echo getAssetUrl($css); ?>">
<?php endforeach; ?>

<!-- Cabecera de página -->
<div class="page-header">
    <div class="container-fluid">
        <div class="row align-items-center">
            <div class="col">
                <h1 class="page-title"><?php echo $titulo; ?></h1>
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb small">
                        <li class="breadcrumb-item"><a href="<?php echo getPageUrl('dashboard.php'); ?>" data-spa-link>Dashboard</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Equipos</li>
                    </ol>
                </nav>
            </div>
            <div class="col-auto">
                <?php if (tienePermiso('equipos.crear')): ?>
                    <button type="button" id="btn-nuevo-equipo" class="btn btn-primary">
                        <i class="bi bi-plus-circle me-1"></i> Nuevo Equipo
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

        <!-- Tabla de equipos -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table id="equipos-table" class="table table-sm table-striped table-hover data-table">
                        <thead>
                            <tr>
                                <th width="60">Imagen</th>
                                <th width="100">Código</th>
                                <th>Nombre</th>
                                <th width="100">Tipo</th>
                                <th>Marca/Modelo</th>
                                <th width="100">Estado</th>
                                <th width="100">Orómetro</th>
                                <th>Ubicación</th>
                                <th width="100">Acciones</th>
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
        </div>
    </div>
</div>

<!-- Modal para crear/editar equipo -->
<div class="modal fade" id="modal-equipo" tabindex="-1" aria-labelledby="modal-equipo-titulo" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modal-equipo-titulo">Nuevo Equipo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <form id="form-equipo" enctype="multipart/form-data">
                    <input type="hidden" id="equipo-id" name="id">

                    <div class="row">
                        <!-- Columna izquierda -->
                        <div class="col-md-8">
                            <div class="row g-2">
                                <!-- Información básica -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-codigo" class="form-label small">Código <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-codigo" name="codigo" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-nombre" class="form-label small">Nombre <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-nombre" name="nombre" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-categoria" class="form-label small">Categoría <span class="text-danger">*</span></label>
                                        <select class="form-select form-select-sm" id="equipo-categoria" name="categoria_id" required>
                                            <option value="">Seleccione...</option>
                                            <?php foreach ($categorias as $categoria): ?>
                                                <option value="<?php echo $categoria['id']; ?>"><?php echo htmlspecialchars($categoria['nombre']); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-tipo" class="form-label small">Tipo de Equipo <span class="text-danger">*</span></label>
                                        <select class="form-select form-select-sm" id="equipo-tipo" name="tipo_equipo" required>
                                            <option value="">Seleccione...</option>
                                            <option value="general">General</option>
                                            <option value="maquina">Máquina</option>
                                            <option value="motor">Motor</option>
                                            <option value="chancadora">Chancadora</option>
                                            <option value="pulverizadora">Pulverizadora</option>
                                            <option value="molino">Molino</option>
                                            <option value="remolienda">Remolienda</option>
                                            <option value="icon">Icon</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Detalles técnicos -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-marca" class="form-label small">Marca</label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-marca" name="marca">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-modelo" class="form-label small">Modelo</label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-modelo" name="modelo">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-serie" class="form-label small">Número de Serie</label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-serie" name="numero_serie">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-capacidad" class="form-label small">Capacidad</label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-capacidad" name="capacidad">
                                    </div>
                                </div>

                                <!-- Información eléctrica -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-fase" class="form-label small">Fase</label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-fase" name="fase">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-linea" class="form-label small">Línea Eléctrica</label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-linea" name="linea_electrica">
                                    </div>
                                </div>

                                <!-- Ubicación y estado -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-ubicacion" class="form-label small">Ubicación</label>
                                        <input type="text" class="form-control form-control-sm" id="equipo-ubicacion" name="ubicacion">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-estado" class="form-label small">Estado <span class="text-danger">*</span></label>
                                        <select class="form-select form-select-sm" id="equipo-estado" name="estado" required>
                                            <option value="">Seleccione...</option>
                                            <option value="activo">Activo</option>
                                            <option value="mantenimiento">Mantenimiento</option>
                                            <option value="averiado">Averiado</option>
                                            <option value="vendido">Vendido</option>
                                            <option value="descanso">Descanso</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Información de orómetro -->
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-orometro" class="form-label small">Orómetro Actual (hrs)</label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="equipo-orometro" name="orometro_actual" value="0">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-limite" class="form-label small">Límite (hrs)</label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="equipo-limite" name="limite">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-notificacion" class="form-label small">Notificación (hrs)</label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="equipo-notificacion" name="notificacion">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label for="equipo-mantenimiento" class="form-label small">Mantenimiento (hrs)</label>
                                        <input type="number" step="0.01" min="0" class="form-control form-control-sm" id="equipo-mantenimiento" name="mantenimiento">
                                    </div>
                                </div>

                                <!-- Observaciones -->
                                <div class="col-12">
                                    <div class="form-group mb-2">
                                        <label for="equipo-observaciones" class="form-label small">Observaciones</label>
                                        <textarea class="form-control form-control-sm" id="equipo-observaciones" name="observaciones" rows="3"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Columna derecha (imagen) -->
                        <div class="col-md-4">
                            <div class="form-group mb-2">
                                <label class="form-label small">Imagen del Equipo</label>
                                <?php
                                include_once '../../../componentes/image-upload/image-upload.php';
                                renderImageUpload('imagen', 'equipo-imagen', 'assets/img/equipos/equipos/default.png', 'Imagen del Equipo', false);
                                ?>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btn-guardar-equipo" class="btn btn-sm btn-primary">Guardar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal para ver detalles del equipo -->
<div class="modal fade" id="modal-detalle-equipo" tabindex="-1" aria-labelledby="modal-detalle-titulo" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modal-detalle-titulo">Detalles del Equipo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <!-- Información del equipo -->
                    <div class="col-md-4 text-center mb-3">
                        <div class="equipo-imagen-container">
                            <img id="detalle-imagen" src="<?php echo getAssetUrl('assets/img/equipos/equipos/default.png'); ?>" alt="Imagen del equipo" class="img-fluid rounded mb-2">
                            <button type="button" id="btn-ver-imagen" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-search-plus me-1"></i> Ampliar
                            </button>
                        </div>
                        <div class="mt-3">
                            <span id="detalle-estado" class="badge rounded-pill bg-success">Activo</span>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <h4 id="detalle-nombre" class="fs-5 mb-3">Nombre del Equipo</h4>

                        <div class="row g-2">
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Código:</span>
                                    <span id="detalle-codigo" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Categoría:</span>
                                    <span id="detalle-categoria" class="detalle-valor">-</span>
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
                                    <span class="detalle-label">Capacidad:</span>
                                    <span id="detalle-capacidad" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Fase:</span>
                                    <span id="detalle-fase" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Línea Eléctrica:</span>
                                    <span id="detalle-linea" class="detalle-valor">-</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detalle-item">
                                    <span class="detalle-label">Ubicación:</span>
                                    <span id="detalle-ubicacion" class="detalle-valor">-</span>
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

                <!-- Componentes asociados -->
                <div class="mt-4">
                    <h5 class="fs-6 mb-3">Componentes Asociados</h5>
                    <div class="table-responsive">
                        <table id="componentes-table" class="table table-sm table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Orómetro</th>
                                    <th>Próximo Mant.</th>
                                </tr>
                            </thead>
                            <tbody id="componentes-body">
                                <!-- Los componentes se cargarán dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                    <div id="sin-componentes" class="text-center py-3 d-none">
                        <p class="text-muted mb-0">Este equipo no tiene componentes asociados.</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <?php if (tienePermiso('equipos.editar')): ?>
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
<div class="modal fade" id="modal-confirmar-eliminar" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Confirmar Eliminación</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <p>¿Está seguro que desea eliminar este equipo?</p>
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

<!-- JS adicional para este módulo -->
<?php foreach ($js_adicional as $js): ?>
    <script src="<?php echo getAssetUrl($js); ?>"></script>
<?php endforeach; ?>