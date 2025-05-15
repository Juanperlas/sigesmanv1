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
    'assets/plugins/datepicker/css/datepicker-bs5.min.css',
    'assets/css/mantenimiento/preventivo/preventivo.css',
    'componentes/image-upload/image-upload.css',
    'componentes/image-viewer/image-viewer.css',
    'componentes/toast/toast.css'
];

$js_adicional = [
    'assets/js/jquery-3.7.1.min.js',
    'assets/js/jquery.validate.min.js',
    'assets/plugins/datatables/js/datatables.min.js',
    'assets/plugins/datepicker/js/datepicker-full.min.js',
    //'assets/plugins/vanillajs-datepicker/es.js',
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
                <button id="btn-verificar-mantenimientos" class="btn-verificar">
                    <i class="bi bi-arrow-repeat"></i> Verificar
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

    <!-- Layout de dos columnas -->
    <div class="componentes-layout">
        <!-- Tabla de mantenimientos -->
        <div class="componentes-table-container">
            <div class="table-container">
                <table id="mantenimientos-table" class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Orómetro Actual</th>
                            <th>Próximo Orómetro</th>
                            <th>Estado</th>
                            <th>Acciones</th>
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

        <!-- Panel de detalles -->
        <div id="mantenimiento-detalle" class="componentes-detail-container">
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
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modal-completar-titulo">Completar Mantenimiento</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                    <form id="form-completar">
                        <input type="hidden" id="completar-id">
                        <input type="hidden" id="completar-tipo">

                        <div class="mb-3">
                            <label for="completar-orometro-actual" class="form-label">Orómetro Actual</label>
                            <div class="input-group">
                                <input type="number" class="form-control" id="completar-orometro-actual" step="0.01" min="0" required>
                                <span class="input-group-text" id="completar-unidad-orometro">hrs</span>
                            </div>
                            <div class="form-text">Ingrese el valor actual del orómetro al momento de realizar el mantenimiento.</div>
                        </div>

                        <div class="mb-3">
                            <label for="completar-observaciones" class="form-label">Observaciones</label>
                            <textarea class="form-control" id="completar-observaciones" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" id="btn-guardar-completar" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
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