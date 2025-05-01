<?php
// Iniciar sesión
session_start();

// Si ya está logueado, redirigir al dashboard
if (isset($_SESSION['usuario_id'])) {
    header("Location: dashboard.php");
    exit;
}

// Incluir conexión a la base de datos y funciones
require_once 'db/conexion.php';
require_once 'db/funciones.php';

$error = '';

// Procesar el formulario de login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = sanitizar($_POST['nombre_usuario'] ?? '');
    $contrasena = $_POST['contrasena'] ?? '';

    if (empty($username) || empty($contrasena)) {
        $error = 'Por favor, complete todos los campos';
    } else {
        $conexion = new Conexion();
        // Consultamos solo id, username, nombre_completo y contrasena, verificando esta_activo
        $usuario = $conexion->selectOne(
            "SELECT id, username, nombre_completo, contrasena
             FROM usuarios
             WHERE username = ? AND esta_activo = 1",
            [$username]
        );

        if ($usuario && password_verify($contrasena, $usuario['contrasena'])) {
            // Login exitoso
            $_SESSION['usuario_id'] = $usuario['id'];
            $_SESSION['usuario_nombre'] = $usuario['nombre_completo'];
            $_SESSION['usuario_username'] = $usuario['username'];

            // Obtener roles del usuario
            $roles = $conexion->getUserRoles($usuario['id']);
            $_SESSION['usuario_roles'] = $roles;

            // Registrar inicio de sesión
            registrarInicioSesion($usuario['id']);

            // Redirigir a la página solicitada o al dashboard
            $redirigir = $_SESSION['redirigir_despues_login'] ?? 'dashboard.php';
            unset($_SESSION['redirigir_despues_login']);

            header("Location: $redirigir");
            exit;
        } else {
            $error = 'Credenciales incorrectas o usuario no activo';
        }
    }
}

// Para demostración, permitir login sin verificar credenciales
if (isset($_GET['demo'])) {
    $_SESSION['usuario_id'] = 1;
    $_SESSION['usuario_nombre'] = 'Administrador Demo';
    $_SESSION['usuario_username'] = 'admin';
    $_SESSION['usuario_roles'] = ['admin'];

    header("Location: dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <title>Login | SIGESMANV1</title>
    <!-- Meta -->
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0, minimal-ui" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="description" content="SIGESMANV1 - Sistema de Gestión y Mantenimiento de Equipos Mineros" />
    <meta name="keywords" content="mantenimiento, minería, equipos, gestión, control" />
    <meta name="author" content="SIGESMANV1" />

    <!-- Favicon -->
    <link rel="icon" href="assets/img/logo-icon.png" type="image/png" />

    <!-- Google Font -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />

    <!-- Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" />

    <!-- CSS Principal -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css" />
    <link rel="stylesheet" href="assets/css/login.css" />
</head>

<body>
    <!-- Preloader -->
    <div class="loader-bg">
        <div class="loader-track">
            <div class="loader-fill"></div>
        </div>
    </div>

    <div class="login-container">
        <!-- Partículas de fondo -->
        <div id="particles-js"></div>

        <!-- Efecto de luz -->
        <div class="light-effect"></div>

        <div class="login-card">
            <!-- Lado izquierdo - Formulario -->
            <div class="login-form-side">
                <div class="login-header">
                    <div class="login-logo">
                        <img src="assets/img/logo.png" alt="SIGESMANV1" class="img-fluid">
                    </div>
                    <h2>Bienvenido de nuevo</h2>
                    <p>Ingrese sus credenciales para acceder al sistema</p>
                </div>

                <?php if (!empty($error)): ?>
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <?php echo $error; ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                <?php endif; ?>

                <form method="post" action="login.php" class="login-form">
                    <div class="form-group">
                        <label for="nombre_usuario">
                            <i class="bi bi-person"></i>
                            <span>Nombre de Usuario</span>
                        </label>
                        <input type="text" id="nombre_usuario" name="nombre_usuario" placeholder="Ingrese su nombre de usuario" required>
                    </div>

                    <div class="form-group">
                        <label for="contrasena">
                            <i class="bi bi-lock"></i>
                            <span>Contraseña</span>
                        </label>
                        <div class="password-input">
                            <input type="password" id="contrasena" name="contrasena" placeholder="Ingrese su contraseña" required>
                            <button type="button" class="toggle-password" tabindex="-1">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-options">
                        <div class="remember-me">
                            <input type="checkbox" id="remember" name="remember">
                            <label for="remember">Recordarme</label>
                        </div>
                        <a href="recuperar-password.php" class="forgot-password">¿Olvidó su contraseña?</a>
                    </div>

                    <button type="submit" class="login-button">
                        <span>Iniciar Sesión</span>
                        <i class="bi bi-arrow-right"></i>
                    </button>

                    <div class="demo-access">
                        <a href="login.php?demo=1">Acceso Demo</a>
                    </div>
                </form>
            </div>

            <!-- Lado derecho - Imagen -->
            <div class="login-image-side">
                <div class="image-overlay"></div>
                <div class="login-content">
                    <h1>SIGESMANV1</h1>
                    <p>Sistema de Gestión y Mantenimiento de Equipos Mineros</p>
                    <div class="company-info">
                        <div class="company-logo">
                            <img src="assets/img/logo-icon.png" alt="VOL COMPANY">
                        </div>
                        <div class="company-name">
                            VOL COMPANY SAC
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="login-footer">
            <p>&copy; <?php echo date('Y'); ?> SIGESMANV1 - VOL COMPANY SAC. Todos los derechos reservados.</p>
        </div>
    </div>

    <!-- Scripts JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"></script>
    <script src="assets/js/login.js"></script>
</body>

</html>