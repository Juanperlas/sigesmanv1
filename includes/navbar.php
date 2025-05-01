<?php
// Obtener la página actual para marcar el elemento activo
$pagina_actual = basename($_SERVER['PHP_SELF'], '.php');
$request_uri = $_SERVER['REQUEST_URI'];
$request_parts = explode('/', trim($request_uri, '/'));
$pagina_ruta = count($request_parts) > 1 ? implode('/', $request_parts) : $request_parts[0];
$pagina_ruta = str_replace('.php', '', $pagina_ruta);

// Obtener datos del usuario
$usuario = getUsuarioActual();
?>

<!-- Sidebar Menu -->
<div class="sidebar">
    <div class="sidebar-header">
        <a href="<?php echo getPageUrl('dashboard.php'); ?>" class="sidebar-logo">
            <img src="<?php echo getAssetUrl('assets/img/logo.png'); ?>" alt="SIGESMANV1" class="logo logo-expanded" />
            <img src="<?php echo getAssetUrl('assets/img/logo-icon.png'); ?>" alt="SIGESMANV1" class="logo logo-collapsed" />
        </a>
    </div>

    <div class="sidebar-content">
        <!-- Dashboard -->
        <div class="sidebar-section">
            <div class="sidebar-section-title">General</div>
            <ul class="sidebar-menu">
                <li class="sidebar-menu-item <?php echo $pagina_actual == 'dashboard' ? 'active' : ''; ?>">
                    <a href="<?php echo getPageUrl('dashboard.php'); ?>" class="sidebar-menu-link">
                        <i class="bi bi-house-door"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
            </ul>
        </div>

        <!-- Equipos -->
        <div class="sidebar-section">
            <div class="sidebar-section-title">Equipos</div>
            <ul class="sidebar-menu">
                <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/equipos/equipos' ? 'active' : ''; ?>">
                    <a href="<?php echo getPageUrl('modulos/equipos/equipos/index.php'); ?>" class="sidebar-menu-link">
                        <i class="bi bi-truck"></i>
                        <span>Equipos</span>
                    </a>
                </li>
                <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/equipos/componentes' ? 'active' : ''; ?>">
                    <a href="<?php echo getPageUrl('modulos/equipos/componentes/index.php'); ?>" class="sidebar-menu-link">
                        <i class="bi bi-gear"></i>
                        <span>Componentes</span>
                    </a>
                </li>
            </ul>
        </div>

        <!-- Mantenimiento -->
        <div class="sidebar-section">
            <div class="sidebar-section-title">Mantenimiento</div>
            <ul class="sidebar-menu">
                <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/mantenimiento/preventivo' ? 'active' : ''; ?>">
                    <a href="<?php echo getPageUrl('modulos/mantenimiento/preventivo.php'); ?>" class="sidebar-menu-link">
                        <i class="bi bi-tools"></i>
                        <span>Preventivo</span>
                    </a>
                </li>
                <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/mantenimiento/correctivo' ? 'active' : ''; ?>">
                    <a href="<?php echo getPageUrl('modulos/mantenimiento/correctivo.php'); ?>" class="sidebar-menu-link">
                        <i class="bi bi-exclamation-triangle"></i>
                        <span>Correctivo</span>
                    </a>
                </li>
                <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/mantenimiento/programado' ? 'active' : ''; ?>">
                    <a href="<?php echo getPageUrl('modulos/mantenimiento/programado.php'); ?>" class="sidebar-menu-link">
                        <i class="bi bi-calendar-check"></i>
                        <span>Programado</span>
                    </a>
                </li>
            </ul>
        </div>

        <!-- Administración (solo para administradores) -->
        <?php if (esAdmin()): ?>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Administración</div>
                <ul class="sidebar-menu">
                    <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/administracion/usuarios' ? 'active' : ''; ?>">
                        <a href="<?php echo getPageUrl('modulos/administracion/usuarios.php'); ?>" class="sidebar-menu-link">
                            <i class="bi bi-people"></i>
                            <span>Usuarios</span>
                        </a>
                    </li>
                    <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/administracion/personal' ? 'active' : ''; ?>">
                        <a href="<?php echo getPageUrl('modulos/administracion/personal.php'); ?>" class="sidebar-menu-link">
                            <i class="bi bi-person-badge"></i>
                            <span>Personal</span>
                        </a>
                    </li>
                    <li class="sidebar-menu-item <?php echo $pagina_ruta == 'modulos/administracion/roles' ? 'active' : ''; ?>">
                        <a href="<?php echo getPageUrl('modulos/administracion/roles.php'); ?>" class="sidebar-menu-link">
                            <i class="bi bi-shield-lock"></i>
                            <span>Roles y Permisos</span>
                        </a>
                    </li>
                </ul>
            </div>
        <?php endif; ?>
    </div>
</div>