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
</head>
<body class="bg-light">
    <!-- Preloader -->
    <div class="loader-bg">
        <div class="loader-track">
            <div class="loader-fill"></div>
        </div>
    </div>

    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-logo text-center mb-4">
                <img src="assets/img/logo.png" alt="SIGESMANV1" class="img-fluid" style="max-height: 60px;">
            </div>
            
            <h4 class="text-center mb-2">Iniciar Sesión</h4>
            <p class="text-center text-muted mb-4">Ingrese sus credenciales para continuar</p>
            
            <?php if (!empty($error)): ?>
            <div class="alert alert-danger" role="alert">
                <?php echo $error; ?>
            </div>
            <?php endif; ?>
            
            <form method="post" action="login.php">
                <div class="mb-3">
                    <label for="nombre_usuario" class="form-label">Nombre de Usuario</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-person"></i></span>
                        <input type="text" class="form-control" id="nombre_usuario" name="nombre_usuario" placeholder="Ingrese su nombre de usuario" required>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label for="contrasena" class="form-label">Contraseña</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-lock"></i></span>
                        <input type="password" class="form-control" id="contrasena" name="contrasena" placeholder="Ingrese su contraseña" required>
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="remember">
                        <label class="form-check-label" for="remember">Recordarme</label>
                    </div>
                    <a href="recuperar-password.php" class="text-primary small">¿Olvidó su contraseña?</a>
                </div>
                
                <button type="submit" class="btn btn-primary w-100">Iniciar Sesión</button>
            </form>
            
            <!-- Enlace para demostración -->
            <div class="text-center mt-3">
                <a href="login.php?demo=1" class="text-muted small">Acceso Demo</a>
            </div>
        </div>
        
        <div class="auth-footer text-center mt-4">
            <p class="text-muted">
                © <?php echo date('Y'); ?> SIGESMANV1 - VOL COMPANY SAC
            </p>
        </div>
    </div>

    <!-- Scripts JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>
