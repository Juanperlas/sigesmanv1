<?php
// Obtener la página actual para marcar el elemento activo
$pagina_actual = basename($_SERVER['PHP_SELF'], '.php');
$request_uri = $_SERVER['REQUEST_URI'];
$request_parts = explode('/', trim($request_uri, '/'));
$pagina_ruta = count($request_parts) > 1 ? implode('/', $request_parts) : $request_parts[0];
$pagina_ruta = str_replace('.php', '', $pagina_ruta);

// Obtener datos del usuario
$usuario = getUsuarioActual();

// Función para verificar si un menú está activo
function isMenuActive($ruta, $pagina_ruta)
{
    if (is_array($ruta)) {
        foreach ($ruta as $r) {
            if (strpos($pagina_ruta, $r) !== false) {
                return true;
            }
        }
        return false;
    }
    return strpos($pagina_ruta, $ruta) !== false;
}

// Definir las secciones del menú con sus rutas
$menu_sections = [
    'general' => [
        'title' => 'General',
        'items' => [
            [
                'name' => 'Dashboard',
                'icon' => 'bi bi-speedometer2',
                'url' => getPageUrl('dashboard.php'),
                'active' => $pagina_actual == 'dashboard',
            ]
        ]
    ],
    'equipos' => [
        'title' => 'Equipos',
        'items' => [
            [
                'name' => 'Equipos',
                'icon' => 'bi bi-truck',
                'url' => getPageUrl('modulos/equipos/equipos/index.php'),
                'active' => $pagina_ruta == 'modulos/equipos/equipos',
            ],
            [
                'name' => 'Componentes',
                'icon' => 'bi bi-gear',
                'url' => getPageUrl('modulos/equipos/componentes/index.php'),
                'active' => $pagina_ruta == 'modulos/equipos/componentes',
            ]
        ]
    ],
    'mantenimiento' => [
        'title' => 'Mantenimiento',
        'items' => [
            [
                'name' => 'Preventivo',
                'icon' => 'bi bi-tools',
                'url' => getPageUrl('modulos/mantenimiento/preventivo.php'),
                'active' => $pagina_ruta == 'modulos/mantenimiento/preventivo',
            ],
            [
                'name' => 'Correctivo',
                'icon' => 'bi bi-exclamation-triangle',
                'url' => getPageUrl('modulos/mantenimiento/correctivo.php'),
                'active' => $pagina_ruta == 'modulos/mantenimiento/correctivo',
            ],
            [
                'name' => 'Programado',
                'icon' => 'bi bi-calendar-check',
                'url' => getPageUrl('modulos/mantenimiento/programado.php'),
                'active' => $pagina_ruta == 'modulos/mantenimiento/programado',
            ]
        ]
    ]
];

// Añadir sección de administración solo para administradores
if (esAdmin()) {
    $menu_sections['administracion'] = [
        'title' => 'Administración',
        'items' => [
            [
                'name' => 'Usuarios',
                'icon' => 'bi bi-people',
                'url' => getPageUrl('modulos/administracion/usuarios.php'),
                'active' => $pagina_ruta == 'modulos/administracion/usuarios',
            ],
            [
                'name' => 'Personal',
                'icon' => 'bi bi-person-badge',
                'url' => getPageUrl('modulos/administracion/personal.php'),
                'active' => $pagina_ruta == 'modulos/administracion/personal',
            ],
            [
                'name' => 'Roles y Permisos',
                'icon' => 'bi bi-shield-lock',
                'url' => getPageUrl('modulos/administracion/roles.php'),
                'active' => $pagina_ruta == 'modulos/administracion/roles',
            ]
        ]
    ];
}
?>

<!-- Sidebar Menu -->
<div class="sidebar">
    <div class="sidebar-header">
        <a href="<?php echo getPageUrl('dashboard.php'); ?>" class="sidebar-logo">
            <img src="<?php echo getAssetUrl('assets/img/logo.png'); ?>" alt="SIGESMANV1" class="logo logo-expanded" />
            <img src="<?php echo getAssetUrl('assets/img/logo-icon.png'); ?>" alt="SIGESMANV1" class="logo logo-collapsed" />
        </a>
        <button class="sidebar-close d-lg-none" id="sidebarClose">
            <i class="bi bi-x-lg"></i>
        </button>
    </div>

    <div class="sidebar-content">
        <?php foreach ($menu_sections as $section_key => $section): ?>
            <div class="sidebar-section">
                <div class="sidebar-section-title"><?php echo $section['title']; ?></div>
                <ul class="sidebar-menu">
                    <?php foreach ($section['items'] as $item): ?>
                        <li class="sidebar-menu-item <?php echo $item['active'] ? 'active' : ''; ?>">
                            <a href="<?php echo $item['url']; ?>" class="sidebar-menu-link">
                                <i class="<?php echo $item['icon']; ?>"></i>
                                <span><?php echo $item['name']; ?></span>
                                <?php if (isset($item['badge'])): ?>
                                    <span class="sidebar-menu-badge"><?php echo $item['badge']; ?></span>
                                <?php endif; ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endforeach; ?>
    </div>

    <div class="sidebar-footer">
        <div class="sidebar-footer-content">
            <div class="sidebar-user">
                <img src="<?php echo isset($usuario['fotografia']) && !empty($usuario['fotografia']) ? getAssetUrl($usuario['fotografia']) : getAssetUrl('assets/img/avatar-default.png'); ?>" alt="<?php echo isset($usuario) ? htmlspecialchars($usuario['nombre']) : 'Usuario'; ?>" class="sidebar-user-avatar">
                <div class="sidebar-user-info">
                    <div class="sidebar-user-name"><?php echo isset($usuario) ? htmlspecialchars($usuario['nombre']) : 'Usuario'; ?></div>
                    <div class="sidebar-user-role"><?php echo isset($usuario['roles']) && !empty($usuario['roles']) ? ucfirst($usuario['roles'][0]) : 'Usuario'; ?></div>
                </div>
            </div>
            <a href="<?php echo getPageUrl('logout.php'); ?>" class="sidebar-logout">
                <i class="bi bi-box-arrow-right"></i>
                <span>Cerrar Sesión</span>
            </a>
        </div>
    </div>
</div>

<!-- Sidebar Overlay -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>