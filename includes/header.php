<!DOCTYPE html>
<html lang="es">

<head>
    <title><?php echo $titulo ?? 'SIGESMANV1 - Sistema de Gestión de Mantenimiento'; ?></title>
    <!-- Meta -->
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0, minimal-ui" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="description" content="SIGESMANV1 - Sistema de Gestión y Mantenimiento de Equipos Mineros" />
    <meta name="keywords" content="mantenimiento, minería, equipos, gestión, control" />
    <meta name="author" content="SIGESMANV1" />

    <link rel="stylesheet" href="<?php echo $baseUrl; ?>assets/css/fonts.css" />
    <!-- Favicon -->
    <link rel="icon" href="<?php echo $baseUrl; ?>assets/img/logo-icon.png" type="image/png" />

    <!-- Icons -->
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>assets/vendor/bootstrap-icons/bootstrap-icons.css" />

    <!-- CSS Principal -->
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>assets/vendor/bootstrap/css/bootstrap.min.css" />
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>assets/css/style.css" />

    <?php if (isset($css_adicional)): ?>
        <?php foreach ($css_adicional as $css): ?>
            <link rel="stylesheet" href="<?php echo $baseUrl . $css; ?>" />
        <?php endforeach; ?>
    <?php endif; ?>
    
    <!-- Aplicar estado del sidebar inmediatamente para evitar parpadeo -->
    <script>
        // Aplicar el estado del sidebar antes de que se cargue la página
        (function() {
            var sidebarState = localStorage.getItem('sidebar-collapsed');
            if (sidebarState === 'true') {
                document.documentElement.classList.add('sidebar-collapsed');
            }
        })();
    </script>
</head>

<body>
    <!-- Preloader (solo la barra azul) -->
    <div class="loader-track" id="preloader">
        <div class="loader-fill"></div>
    </div>

    <div class="app-container">
