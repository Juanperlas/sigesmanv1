<?php

// Configuración de la conexión a la base de datos
$host = 'localhost';
$dbname = 'sigesman';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Conexión exitosa. Iniciando el seeder...\n";
} catch (PDOException $e) {
    die("Error de conexión: " . $e->getMessage());
}

// Función para ejecutar consultas preparadas
function ejecutarConsulta($pdo, $sql, $params = [])
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

// Función para obtener el último ID insertado
function ultimoId($pdo)
{
    return $pdo->lastInsertId();
}

// Función para generar contraseñas encriptadas
function encriptarContrasena($contrasena)
{
    return password_hash($contrasena, PASSWORD_BCRYPT);
}

// Desactivar restricciones de claves foráneas para limpieza
ejecutarConsulta($pdo, "SET FOREIGN_KEY_CHECKS = 0");

// Limpiar todas las tablas y reiniciar IDs con TRUNCATE
echo "Limpiando tablas...\n";
$tablas = [
    'historial_trabajo_componentes',
    'historial_trabajo_equipos',
    'historial_mantenimiento',
    'mantenimiento_programado',
    'mantenimiento_preventivo',
    'mantenimiento_correctivo',
    'notificaciones',
    'componentes',
    'equipos',
    'categorias_equipos',
    'personal',
    'sesiones_usuarios',
    'usuarios_roles',
    'roles_permisos',
    'usuarios',
    'permisos',
    'roles',
    'modulos'
];

foreach ($tablas as $tabla) {
    ejecutarConsulta($pdo, "TRUNCATE TABLE $tabla");
    echo "Tabla $tabla limpiada y IDs reiniciados.\n";
}

// Reactivar restricciones de claves foráneas
ejecutarConsulta($pdo, "SET FOREIGN_KEY_CHECKS = 1");

// 1. Poblar tabla modulos
echo "Poblando modulos...\n";
$modulos = [
    ['dashboard', 'Panel principal del sistema', 1],
    ['equipos', 'Gestión de equipos, máquinas, motores y equipos eléctricos', 1],
    ['componentes', 'Gestión de componentes de equipos', 1],
    ['mantenimientos', 'Gestión de mantenimientos', 1],
    ['mantenimientos.preventivo', 'Submódulo de mantenimiento preventivo', 1],
    ['mantenimientos.correctivo', 'Submódulo de mantenimiento correctivo', 1],
    ['mantenimientos.programado', 'Submódulo de mantenimiento programado (predictivo)', 1],
    ['administracion', 'Gestión administrativa', 1],
    ['administracion.usuarios', 'Submódulo de usuarios', 1],
    ['administracion.personal', 'Submódulo de personal', 1],
    ['administracion.roles_permisos', 'Submódulo de roles y permisos', 1],
    ['historial_trabajo', 'Gestión del historial de trabajo de equipos y componentes', 1],
];

$modulo_ids = [];
foreach ($modulos as $modulo) {
    ejecutarConsulta($pdo, "INSERT INTO modulos (nombre, descripcion, esta_activo) VALUES (?, ?, ?)", $modulo);
    $modulo_ids[$modulo[0]] = ultimoId($pdo);
}

// 2. Poblar tabla permisos
echo "Poblando permisos...\n";
$permisos = [
    // Dashboard
    [$modulo_ids['dashboard'], 'dashboard.acceder', 'Permite acceder al panel principal'],
    [$modulo_ids['dashboard'], 'dashboard.ver', 'Permite ver el panel principal'],
    // Equipos
    [$modulo_ids['equipos'], 'equipos.acceder', 'Permite acceder al módulo de equipos'],
    [$modulo_ids['equipos'], 'equipos.ver', 'Permite ver la lista de equipos'],
    [$modulo_ids['equipos'], 'equipos.crear', 'Permite crear nuevos equipos'],
    [$modulo_ids['equipos'], 'equipos.editar', 'Permite editar equipos existentes'],
    [$modulo_ids['equipos'], 'equipos.eliminar', 'Permite dar de baja equipos'],
    // Componentes
    [$modulo_ids['componentes'], 'componentes.acceder', 'Permite acceder al módulo de componentes'],
    [$modulo_ids['componentes'], 'componentes.ver', 'Permite ver la lista de componentes'],
    [$modulo_ids['componentes'], 'componentes.crear', 'Permite crear nuevos componentes'],
    [$modulo_ids['componentes'], 'componentes.editar', 'Permite editar componentes existentes'],
    [$modulo_ids['componentes'], 'componentes.eliminar', 'Permite dar de baja componentes'],
    // Mantenimientos
    [$modulo_ids['mantenimientos'], 'mantenimientos.acceder', 'Permite acceder al módulo de mantenimientos'],
    [$modulo_ids['mantenimientos'], 'mantenimientos.ver', 'Permite ver todos los mantenimientos'],
    // Mantenimiento Preventivo
    [$modulo_ids['mantenimientos.preventivo'], 'mantenimientos.preventivo.acceder', 'Permite acceder al submódulo de mantenimiento preventivo'],
    [$modulo_ids['mantenimientos.preventivo'], 'mantenimientos.preventivo.ver', 'Permite ver mantenimientos preventivos'],
    [$modulo_ids['mantenimientos.preventivo'], 'mantenimientos.preventivo.crear', 'Permite crear mantenimientos preventivos'],
    [$modulo_ids['mantenimientos.preventivo'], 'mantenimientos.preventivo.editar', 'Permite editar mantenimientos preventivos'],
    [$modulo_ids['mantenimientos.preventivo'], 'mantenimientos.preventivo.eliminar', 'Permite dar de baja mantenimientos preventivos'],
    // Mantenimiento Correctivo
    [$modulo_ids['mantenimientos.correctivo'], 'mantenimientos.correctivo.acceder', 'Permite acceder al submódulo de mantenimiento correctivo'],
    [$modulo_ids['mantenimientos.correctivo'], 'mantenimientos.correctivo.ver', 'Permite ver mantenimientos correctivos'],
    [$modulo_ids['mantenimientos.correctivo'], 'mantenimientos.correctivo.crear', 'Permite crear mantenimientos correctivos'],
    [$modulo_ids['mantenimientos.correctivo'], 'mantenimientos.correctivo.editar', 'Permite editar mantenimientos correctivos'],
    [$modulo_ids['mantenimientos.correctivo'], 'mantenimientos.correctivo.eliminar', 'Permite dar de baja mantenimientos correctivos'],
    // Mantenimiento Programado
    [$modulo_ids['mantenimientos.programado'], 'mantenimientos.programado.acceder', 'Permite acceder al submódulo de mantenimiento programado (predictivo)'],
    [$modulo_ids['mantenimientos.programado'], 'mantenimientos.programado.ver', 'Permite ver mantenimientos programados'],
    [$modulo_ids['mantenimientos.programado'], 'mantenimientos.programado.crear', 'Permite crear mantenimientos programados'],
    [$modulo_ids['mantenimientos.programado'], 'mantenimientos.programado.editar', 'Permite editar mantenimientos programados'],
    [$modulo_ids['mantenimientos.programado'], 'mantenimientos.programado.eliminar', 'Permite dar de baja mantenimientos programados'],
    // Administracion
    [$modulo_ids['administracion'], 'administracion.acceder', 'Permite acceder al módulo de administración'],
    [$modulo_ids['administracion'], 'administracion.ver', 'Permite ver el panel de administración'],
    // Administracion Usuarios
    [$modulo_ids['administracion.usuarios'], 'administracion.usuarios.acceder', 'Permite acceder al submódulo de usuarios'],
    [$modulo_ids['administracion.usuarios'], 'administracion.usuarios.ver', 'Permite ver la lista de usuarios'],
    [$modulo_ids['administracion.usuarios'], 'administracion.usuarios.crear', 'Permite crear nuevos usuarios'],
    [$modulo_ids['administracion.usuarios'], 'administracion.usuarios.editar', 'Permite editar usuarios existentes'],
    [$modulo_ids['administracion.usuarios'], 'administracion.usuarios.eliminar', 'Permite dar de baja usuarios'],
    // Administracion Personal
    [$modulo_ids['administracion.personal'], 'administracion.personal.acceder', 'Permite acceder al submódulo de personal'],
    [$modulo_ids['administracion.personal'], 'administracion.personal.ver', 'Permite ver la lista de personal'],
    [$modulo_ids['administracion.personal'], 'administracion.personal.crear', 'Permite crear nuevo personal'],
    [$modulo_ids['administracion.personal'], 'administracion.personal.editar', 'Permite editar personal existente'],
    [$modulo_ids['administracion.personal'], 'administracion.personal.eliminar', 'Permite dar de baja personal'],
    // Administracion Roles y Permisos
    [$modulo_ids['administracion.roles_permisos'], 'administracion.roles_permisos.acceder', 'Permite acceder al submódulo de roles y permisos'],
    [$modulo_ids['administracion.roles_permisos'], 'administracion.roles_permisos.ver', 'Permite ver roles y permisos'],
    [$modulo_ids['administracion.roles_permisos'], 'administracion.roles_permisos.crear', 'Permite crear roles y permisos'],
    [$modulo_ids['administracion.roles_permisos'], 'administracion.roles_permisos.editar', 'Permite editar roles y permisos'],
    [$modulo_ids['administracion.roles_permisos'], 'administracion.roles_permisos.eliminar', 'Permite dar de baja roles y permisos'],
    // Historial de Trabajo
    [$modulo_ids['historial_trabajo'], 'historial_trabajo.acceder', 'Permite acceder al historial de trabajo'],
    [$modulo_ids['historial_trabajo'], 'historial_trabajo.ver', 'Permite ver el historial de trabajo'],
    [$modulo_ids['historial_trabajo'], 'historial_trabajo.crear', 'Permite crear entradas en el historial de trabajo'],
    [$modulo_ids['historial_trabajo'], 'historial_trabajo.editar', 'Permite editar entradas en el historial de trabajo'],
    [$modulo_ids['historial_trabajo'], 'historial_trabajo.eliminar', 'Permite dar de baja entradas en el historial de trabajo'],
];

$permiso_ids = [];
foreach ($permisos as $permiso) {
    ejecutarConsulta($pdo, "INSERT INTO permisos (modulo_id, nombre, descripcion) VALUES (?, ?, ?)", $permiso);
    $permiso_ids[$permiso[1]] = ultimoId($pdo);
}

// 3. Poblar tabla roles
echo "Poblando roles...\n";
$roles = [
    ['superadmin', 'Rol con acceso completo a todas las funcionalidades del sistema', 1],
    ['admin', 'Rol con acceso completo inicial, configurable posteriormente', 1],
    ['jefe', 'Rol para supervisores con acceso a equipos y mantenimientos', 1],
    ['invitado', 'Rol con permisos limitados, solo visualización', 1],
    ['tecnico', 'Rol para técnicos con acceso a mantenimientos', 1],
];

$rol_ids = [];
foreach ($roles as $rol) {
    ejecutarConsulta($pdo, "INSERT INTO roles (nombre, descripcion, esta_activo) VALUES (?, ?, ?)", $rol);
    $rol_ids[$rol[0]] = ultimoId($pdo);
}

// 4. Poblar tabla roles_permisos
echo "Poblando roles_permisos...\n";
$roles_permisos = [
    // Superadmin: Todos los permisos
    ...array_map(fn($nombre) => [$rol_ids['superadmin'], $permiso_ids[$nombre]], array_keys($permiso_ids)),
    // Admin: Todos los permisos
    ...array_map(fn($nombre) => [$rol_ids['admin'], $permiso_ids[$nombre]], array_keys($permiso_ids)),
    // Jefe: Permisos para equipos, componentes, mantenimientos, personal y historial de trabajo
    ...array_map(
        fn($nombre) => [$rol_ids['jefe'], $permiso_ids[$nombre]],
        [
            'dashboard.acceder',
            'dashboard.ver',
            'equipos.acceder',
            'equipos.ver',
            'equipos.crear',
            'equipos.editar',
            'equipos.eliminar',
            'componentes.acceder',
            'componentes.ver',
            'componentes.crear',
            'componentes.editar',
            'componentes.eliminar',
            'mantenimientos.acceder',
            'mantenimientos.ver',
            'mantenimientos.preventivo.acceder',
            'mantenimientos.preventivo.ver',
            'mantenimientos.preventivo.crear',
            'mantenimientos.preventivo.editar',
            'mantenimientos.preventivo.eliminar',
            'mantenimientos.correctivo.acceder',
            'mantenimientos.correctivo.ver',
            'mantenimientos.correctivo.crear',
            'mantenimientos.correctivo.editar',
            'mantenimientos.correctivo.eliminar',
            'mantenimientos.programado.acceder',
            'mantenimientos.programado.ver',
            'mantenimientos.programado.crear',
            'mantenimientos.programado.editar',
            'mantenimientos.programado.eliminar',
            'administracion.personal.acceder',
            'administracion.personal.ver',
            'administracion.personal.crear',
            'administracion.personal.editar',
            'administracion.personal.eliminar',
            'historial_trabajo.acceder',
            'historial_trabajo.ver',
            'historial_trabajo.crear',
            'historial_trabajo.editar',
            'historial_trabajo.eliminar',
        ]
    ),
    // Invitado: Solo visualización
    ...array_map(
        fn($nombre) => [$rol_ids['invitado'], $permiso_ids[$nombre]],
        [
            'dashboard.acceder',
            'dashboard.ver',
            'equipos.acceder',
            'equipos.ver',
            'componentes.acceder',
            'componentes.ver',
            'mantenimientos.acceder',
            'mantenimientos.ver',
            'mantenimientos.preventivo.acceder',
            'mantenimientos.preventivo.ver',
            'mantenimientos.correctivo.acceder',
            'mantenimientos.correctivo.ver',
            'mantenimientos.programado.acceder',
            'mantenimientos.programado.ver',
            'administracion.personal.acceder',
            'administracion.personal.ver',
            'historial_trabajo.acceder',
            'historial_trabajo.ver',
        ]
    ),
    // Técnico: Acceso a mantenimientos, visualización y gestión de equipos, componentes y historial de trabajo
    ...array_map(
        fn($nombre) => [$rol_ids['tecnico'], $permiso_ids[$nombre]],
        [
            'dashboard.acceder',
            'dashboard.ver',
            'equipos.acceder',
            'equipos.ver',
            'equipos.crear',
            'equipos.editar',
            'equipos.eliminar',
            'componentes.acceder',
            'componentes.ver',
            'componentes.crear',
            'componentes.editar',
            'componentes.eliminar',
            'mantenimientos.acceder',
            'mantenimientos.ver',
            'mantenimientos.preventivo.acceder',
            'mantenimientos.preventivo.ver',
            'mantenimientos.preventivo.crear',
            'mantenimientos.preventivo.editar',
            'mantenimientos.preventivo.eliminar',
            'mantenimientos.correctivo.acceder',
            'mantenimientos.correctivo.ver',
            'mantenimientos.correctivo.crear',
            'mantenimientos.correctivo.editar',
            'mantenimientos.correctivo.eliminar',
            'mantenimientos.programado.acceder',
            'mantenimientos.programado.ver',
            'mantenimientos.programado.crear',
            'mantenimientos.programado.editar',
            'mantenimientos.programado.eliminar',
            'historial_trabajo.acceder',
            'historial_trabajo.ver',
            'historial_trabajo.crear',
            'historial_trabajo.editar',
            'historial_trabajo.eliminar',
        ]
    ),
];

foreach ($roles_permisos as $rp) {
    ejecutarConsulta($pdo, "INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)", $rp);
}

// 5. Poblar tabla usuarios
echo "Poblando usuarios...\n";

// Insertar superadmin con creado_por NULL
$superadmin = ['superadmin', encriptarContrasena('password123'), 'Super Administrador', 'superadmin@sigesman.com', '12345678', '987654321', 'Av. Principal 123', 'Administración', 'images/usuarios/superadmin.jpg', null, null, 1];
ejecutarConsulta($pdo, "INSERT INTO usuarios (username, contrasena, nombre_completo, correo, dni, telefono, direccion, area, fotografia, creado_por, token_recordatorio, esta_activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", $superadmin);
$superadmin_id = ultimoId($pdo);

// Insertar los demás usuarios con creado_por apuntando al superadmin
$usuarios = [
    ['admin1', encriptarContrasena('password123'), 'Admin Uno', 'admin1@sigesman.com', '87654321', '912345678', 'Calle Secundaria 456', 'Administración', null, $superadmin_id, null, 1],
    ['admin2', encriptarContrasena('password123'), 'Admin Dos', 'admin2@sigesman.com', '87654322', '912345679', 'Calle Secundaria 789', 'Administración', null, $superadmin_id, null, 1],
    ['jefe1', encriptarContrasena('password123'), 'Jefe Operaciones', 'jefe1@sigesman.com', '45678912', '923456789', 'Av. Mina 789', 'Operaciones', 'images/usuarios/jefe1.jpg', $superadmin_id, null, 1],
    ['jefe2', encriptarContrasena('password123'), 'Jefe Mantenimiento', 'jefe2@sigesman.com', '45678913', '923456790', 'Av. Planta 101', 'Mantenimiento', null, $superadmin_id, null, 1],
    ['tecnico1', encriptarContrasena('password123'), 'Técnico Uno', 'tecnico1@sigesman.com', '78912345', '934567890', 'Calle Taller 202', 'Mantenimiento', null, $superadmin_id, null, 1],
    ['tecnico2', encriptarContrasena('password123'), 'Técnico Dos', 'tecnico2@sigesman.com', '78912346', '934567891', 'Calle Taller 303', 'Mantenimiento', null, $superadmin_id, null, 1],
    ['tecnico3', encriptarContrasena('password123'), 'Técnico Tres', 'tecnico3@sigesman.com', '78912347', '934567892', 'Calle Taller 404', 'Mantenimiento', null, $superadmin_id, null, 1],
    ['invitado1', encriptarContrasena('password123'), 'Invitado Pruebas', 'invitado1@sigesman.com', '32198765', '945678901', null, 'Externo', null, $superadmin_id, null, 1],
    ['invitado2', encriptarContrasena('password123'), 'Invitado Externo', 'invitado2@sigesman.com', '32198766', '945678902', null, 'Externo', null, $superadmin_id, null, 1],
    ['exempleado', encriptarContrasena('password123'), 'Ex Empleado', 'ex@sigesman.com', '98765432', '956789012', 'Calle Antigua 101', 'Mantenimiento', null, $superadmin_id, null, 0],
];

$usuario_ids = [$superadmin_id];
foreach ($usuarios as $usuario) {
    ejecutarConsulta($pdo, "INSERT INTO usuarios (username, contrasena, nombre_completo, correo, dni, telefono, direccion, area, fotografia, creado_por, token_recordatorio, esta_activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", $usuario);
    $usuario_ids[] = ultimoId($pdo);
}

// 6. Poblar tabla usuarios_roles
echo "Poblando usuarios_roles...\n";
$usuarios_roles = [
    [$usuario_ids[0], $rol_ids['superadmin']],
    [$usuario_ids[1], $rol_ids['admin']],
    [$usuario_ids[2], $rol_ids['admin']],
    [$usuario_ids[3], $rol_ids['jefe']],
    [$usuario_ids[4], $rol_ids['jefe']],
    [$usuario_ids[5], $rol_ids['tecnico']],
    [$usuario_ids[6], $rol_ids['tecnico']],
    [$usuario_ids[7], $rol_ids['tecnico']],
    [$usuario_ids[8], $rol_ids['invitado']],
    [$usuario_ids[9], $rol_ids['invitado']],
    [$usuario_ids[10], $rol_ids['invitado']],
];

foreach ($usuarios_roles as $ur) {
    ejecutarConsulta($pdo, "INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)", $ur);
}

// 7. Poblar tabla sesiones_usuarios
echo "Poblando sesiones_usuarios...\n";
$sesiones = [
    [$usuario_ids[0], '2025-04-25 08:00:00', null, 1],
    [$usuario_ids[1], '2025-04-25 09:00:00', '2025-04-25 10:00:00', 0],
    [$usuario_ids[2], '2025-04-25 07:30:00', null, 1],
    [$usuario_ids[3], '2025-04-24 08:15:00', null, 1],
    [$usuario_ids[4], '2025-04-24 09:30:00', '2025-04-24 11:00:00', 0],
    [$usuario_ids[5], '2025-04-23 07:00:00', null, 1],
    [$usuario_ids[6], '2025-04-23 08:45:00', null, 1],
    [$usuario_ids[7], '2025-04-22 10:00:00', '2025-04-22 10:30:00', 0],
    [$usuario_ids[8], '2025-04-21 09:00:00', null, 1],
    [$usuario_ids[9], '2025-04-20 08:30:00', '2025-04-20 09:30:00', 0],
];

foreach ($sesiones as $sesion) {
    ejecutarConsulta($pdo, "INSERT INTO sesiones_usuarios (usuario_id, inicio_sesion, fin_sesion, esta_activa) VALUES (?, ?, ?, ?)", $sesion);
}

// 8. Poblar tabla personal
echo "Poblando personal...\n";
$personal = [
    ['Juan Pérez', '11223344', '987123456', 'Calle Mina 123', 'Mantenimiento', '2024-01-15', null, 'images/personal/juan.jpg', 1, $usuario_ids[0]],
    ['María Gómez', '44332211', '987654123', 'Av. Planta 456', 'Operaciones', '2023-06-20', null, null, 1, $usuario_ids[0]],
    ['Pedro Sánchez', '55667788', '912345678', null, 'Logística', '2022-03-10', '2025-01-01', null, 0, $usuario_ids[0]],
    ['Ana López', '66778899', '923456789', 'Calle Taller 789', 'Mantenimiento', '2023-09-01', null, 'images/personal/ana.jpg', 1, $usuario_ids[0]],
    ['Carlos Ruiz', '77889900', '934567890', 'Av. Principal 101', 'Operaciones', '2022-12-15', null, null, 1, $usuario_ids[0]],
    ['Sofía Torres', '88990011', '945678901', null, 'Administración', '2024-03-01', null, null, 1, $usuario_ids[0]],
    ['Luis Fernández', '99001122', '956789012', 'Calle Secundaria 202', 'Logística', '2023-01-20', '2025-02-01', null, 0, $usuario_ids[0]],
    ['Elena Martínez', '10111213', '967890123', 'Av. Mina 303', 'Operaciones', '2024-02-01', null, null, 1, $usuario_ids[0]],
];

$personal_ids = [];
foreach ($personal as $persona) {
    ejecutarConsulta($pdo, "INSERT INTO personal (nombre, dni, telefono, direccion, area, fecha_ingreso, fecha_baja, imagen, esta_activo, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", $persona);
    $personal_ids[] = ultimoId($pdo);
}

// 9. Poblar tabla categorias_equipos
echo "Poblando categorias_equipos...\n";
$categorias = [
    ['Estacionarios', 'Equipos fijos en una ubicación'],
    ['Pesados', 'Equipos de gran tamaño y peso'],
    ['Livianos', 'Equipos portátiles o de menor tamaño'],
    ['Eléctricos', 'Equipos alimentados por electricidad'],
    ['Máquinas', 'Máquinas industriales'],
    ['Motores', 'Motores eléctricos'],
];

$categoria_ids = [];
foreach ($categorias as $categoria) {
    ejecutarConsulta($pdo, "INSERT INTO categorias_equipos (nombre, descripcion) VALUES (?, ?)", $categoria);
    $categoria_ids[$categoria[0]] = ultimoId($pdo);
}

// 10. Poblar tabla equipos (30 filas)
echo "Poblando equipos...\n";
$equipos = [
    [$categoria_ids['Pesados'], 'EQP-001', 'Camión Minero', 'general', 'Caterpillar', 'CAT 797', 'SER001', '200 ton', null, 'Planta 1', 'activo', 1500.50, 1000.00, 2000.00, 10.00, 100.00, 1000.00, 'Equipo operativo', null, 'kilometros'],
    [$categoria_ids['Livianos'], 'EQP-002', 'Jeep Todo Terreno', 'general', 'Jeep', 'Wrangler', 'SER002', '4x4', null, 'Mina Norte', 'mantenimiento', 500.75, 300.00, 1000.00, 10.00, 50.00, 500.00, 'En taller', null, 'kilometros'],
    [$categoria_ids['Eléctricos'], 'EQP-003', 'Generador', 'general', 'Cummins', 'G500', 'SER003', '500 kW', null, 'Taller Central', 'descanso', 300.25, 200.00, 800.00, 10.00, 200.00, 1500.00, 'En reserva', null, 'horas'],
    [$categoria_ids['Pesados'], 'EQP-004', 'Pala Hidráulica', 'general', 'Komatsu', 'PC4000', 'SER004', '400 ton', null, 'Mina Sur', 'averiado', 900.00, 600.00, 1500.00, 10.00, 150.00, 1200.00, 'Fallo en brazo', 'images/equipos/pala.jpg', 'horas'],
    [$categoria_ids['Estacionarios'], 'EQP-005', 'Planta Chancadora', 'chancadora', 'Metso', 'C200', 'SER005', '500 ton/h', null, 'Planta 1', 'vendido', 200.00, 100.00, null, 10.00, 300.00, 2000.00, 'Vendido en 2025', null, 'horas'],
    [$categoria_ids['Máquinas'], 'EQP-006', 'Perforadora Principal', 'maquina', 'Caterpillar', 'D10', 'SER006', null, null, 'Mina Norte', 'activo', 1200.00, 800.00, 2000.00, 10.00, 100.00, 1000.00, 'Máquina en buen estado', null, 'horas'],
    [$categoria_ids['Máquinas'], 'EQP-007', 'Cargador Frontal', 'maquina', 'Komatsu', 'WA500', 'SER007', null, null, 'Taller Central', 'mantenimiento', 800.50, 500.00, 1500.00, 10.00, 50.00, 800.00, 'En revisión', null, 'horas'],
    [$categoria_ids['Máquinas'], 'EQP-008', 'Excavadora', 'maquina', 'Hitachi', 'ZX200', 'SER008', null, null, 'Mina Sur', 'averiado', 600.25, 400.00, 1000.00, 10.00, 20.00, 600.00, 'Fallo hidráulico', null, 'horas'],
    [$categoria_ids['Máquinas'], 'EQP-009', 'Compactadora', 'maquina', 'Volvo', 'SD110', 'SER009', null, null, 'Almacén', 'descanso', 400.75, 300.00, 800.00, 10.00, 75.00, 700.00, 'No operativa temporalmente', null, 'horas'],
    [$categoria_ids['Máquinas'], 'EQP-010', 'Grúa Móvil', 'maquina', 'Liebherr', 'LTM 1050', 'SER010', null, null, null, 'vendido', 300.00, 200.00, null, 10.00, 150.00, 1000.00, 'Vendido en 2025', null, 'horas'],
    [$categoria_ids['Motores'], 'EQP-011', 'Motor Principal', 'motor', 'Siemens', null, 'SER011', '100 HP', 'Trifásico', 'Planta 1', 'activo', 1100.00, 700.00, 2000.00, 10.00, 100.00, 800.00, 'Motor en buen estado', null, 'horas'],
    [$categoria_ids['Motores'], 'EQP-012', 'Motor Secundario', 'motor', 'WEG', null, 'SER012', '75 HP', 'Trifásico', 'Taller Central', 'mantenimiento', 700.50, 500.00, 1500.00, 10.00, 50.00, 600.00, 'En revisión', null, 'horas'],
    [$categoria_ids['Motores'], 'EQP-013', 'Motor Auxiliar', 'motor', 'ABB', null, 'SER013', '50 HP', 'Monofásico', 'Mina Norte', 'averiado', 500.25, 300.00, 1000.00, 10.00, 20.00, 500.00, 'Sobrecalentamiento', null, 'horas'],
    [$categoria_ids['Motores'], 'EQP-014', 'Motor de Reserva', 'motor', 'Toshiba', null, 'SER014', '120 HP', 'Trifásico', 'Almacén', 'descanso', 300.75, 200.00, 800.00, 10.00, 75.00, 700.00, 'En reserva', null, 'horas'],
    [$categoria_ids['Motores'], 'EQP-015', 'Motor Antiguo', 'motor', 'General Electric', null, 'SER015', '90 HP', 'Trifásico', null, 'vendido', 200.00, 100.00, null, 10.00, 150.00, 800.00, 'Vendido en 2025', null, 'horas'],
    [$categoria_ids['Eléctricos'], 'EQP-016', 'Molino Principal', 'molino', 'Metso', null, 'SER016', '300 ton/h', null, 'Planta 1', 'activo', 400.50, 300.00, 800.00, 10.00, 100.00, 1500.00, 'Operativo', null, 'horas'],
    [$categoria_ids['Eléctricos'], 'EQP-017', 'Equipo de Remolienda', 'remolienda', 'FLSmidth', null, 'SER017', '200 ton/h', null, 'Taller Central', 'mantenimiento', 200.25, 100.00, 500.00, 10.00, 50.00, 1200.00, 'En revisión', null, 'horas'],
    [$categoria_ids['Eléctricos'], 'EQP-018', 'Concentrador iCON', 'icon', 'iCON', null, 'SER018', '50 ton/h', null, 'Almacén', 'descanso', 100.00, 50.00, 300.00, 10.00, 20.00, 1000.00, 'En reserva', null, 'horas'],
    [$categoria_ids['Eléctricos'], 'EQP-019', 'Molino Secundario', 'molino', 'Outotec', null, 'SER019', '250 ton/h', null, 'Mina Sur', 'averiado', 600.75, 400.00, 1000.00, 10.00, 80.00, 1500.00, 'Fallo en rotor', null, 'horas'],
    [$categoria_ids['Eléctricos'], 'EQP-020', 'Remolienda Antigua', 'remolienda', 'Metso', null, 'SER020', '150 ton/h', null, null, 'vendido', 50.00, 30.00, null, 10.00, 120.00, 1200.00, 'Vendido en 2025', null, 'horas'],
    [$categoria_ids['Pesados'], 'EQP-021', 'Camión Minero Secundario', 'general', 'Komatsu', '930E', 'SER021', '300 ton', null, 'Mina Norte', 'activo', 1800.25, 1200.00, 2500.00, 10.00, 150.00, 1000.00, 'Operativo', null, 'kilometros'],
    [$categoria_ids['Livianos'], 'EQP-022', 'Vehículo Utilitario', 'general', 'Toyota', 'Hilux', 'SER022', '4x4', null, 'Planta 2', 'activo', 600.50, 400.00, 1200.00, 10.00, 60.00, 500.00, 'Buen estado', null, 'kilometros'],
    [$categoria_ids['Estacionarios'], 'EQP-023', 'Planta Pulverizadora', 'pulverizadora', 'FLSmidth', 'P300', 'SER023', '400 ton/h', null, 'Planta 1', 'activo', 900.75, 600.00, 10.00, 7000.00, 200.00, 2000.00, 'Operativa', null, 'horas'],
    [$categoria_ids['Máquinas'], 'EQP-024', 'Perforadora Secundaria', 'maquina', 'Sandvik', 'DX800', 'SER024', null, null, 'Mina Sur', 'activo', 1100.00, 700.00, 2000.00, 20.00, 100.00, 1000.00, 'En buen estado', null, 'horas'],
    [$categoria_ids['Máquinas'], 'EQP-025', 'Cargador Subterráneo', 'maquina', 'Caterpillar', 'R1700', 'SER025', null, null, 'Mina Norte', 'mantenimiento', 700.25, 500.00, 20.00, 3000.00, 50.00, 800.00, 'En revisión', null, 'horas'],
    [$categoria_ids['Motores'], 'EQP-026', 'Motor de Bombeo', 'motor', 'Siemens', null, 'SER026', '150 HP', 'Trifásico', 'Planta 2', 'activo', 1200.50, 800.00, 2000.00, 20.00, 100.00, 800.00, 'Operativo', null, 'horas'],
    [$categoria_ids['Motores'], 'EQP-027', 'Motor de Ventilación', 'motor', 'WEG', null, 'SER027', '80 HP', 'Trifásico', 'Mina Sur', 'averiado', 400.75, 300.00, 1000.00, 20.00, 20.00, 600.00, 'Fallo eléctrico', null, 'horas'],
    [$categoria_ids['Eléctricos'], 'EQP-028', 'Molino Terciario', 'molino', 'Metso', null, 'SER028', '200 ton/h', null, 'Planta 1', 'activo', 500.25, 400.00, 1000.00, 20.00, 80.00, 1500.00, 'Operativo', null, 'horas'],
    [$categoria_ids['Eléctricos'], 'EQP-029', 'Concentrador Secundario', 'icon', 'iCON', null, 'SER029', '60 ton/h', null, 'Almacén', 'descanso', 150.00, 100.00, 500.00, 10.00, 20.00, 1000.00, 'En reserva', null, 'horas'],
    [$categoria_ids['Pesados'], 'EQP-030', 'Pala Eléctrica', 'general', 'P&H', '4100XPC', 'SER030', '500 ton', null, 'Mina Norte', 'activo', 2000.00, 1500.00, 3000.00, 20.00, 200.00, 1200.00, 'Operativa', null, 'horas'],
];

$equipo_ids = [];
foreach ($equipos as $equipo) {
    ejecutarConsulta($pdo, "INSERT INTO equipos (categoria_id, codigo, nombre, tipo_equipo, marca, modelo, numero_serie, capacidad, fase, ubicacion, estado, orometro_actual, anterior_orometro, proximo_orometro, limite, notificacion, mantenimiento, observaciones, imagen, tipo_orometro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", $equipo);
    $equipo_ids[] = ultimoId($pdo);
}

// 11. Poblar tabla componentes (20 filas)
echo "Poblando componentes...\n";
$componentes = [
    [$equipo_ids[0], 'CMP-001', 'Motor Principal', 'Caterpillar', 'SER-C01', 'C18', 'horas', 1200.00, 800.00, 1800.00, 'activo', 10.00, 100.00, 800.00, 'Componente crítico', null],
    [$equipo_ids[0], 'CMP-002', 'Sistema Hidráulico', 'Bosch', 'SER-C02', 'H500', 'horas', 800.50, 500.00, 1500.00, 'mantenimiento', 10.00, 50.00, 600.00, 'En revisión', null],
    [$equipo_ids[1], 'CMP-003', 'Transmisión', 'Jeep', 'SER-C03', 'T400', 'kilometros', 600.25, 400.00, 1000.00, 'descanso', 10.00, 20.00, 500.00, 'Buen estado', null],
    [$equipo_ids[3], 'CMP-004', 'Cuchilla', 'Komatsu', 'SER-C04', 'K300', 'horas', 700.00, 500.00, 1200.00, 'averiado', 10.00, 80.00, 600.00, 'Desgaste crítico', null],
    [$equipo_ids[5], 'CMP-005', 'Rotor', 'Metso', 'SER-C05', 'R200', 'horas', 150.00, 100.00, 500.00, 'activo', 10.00, 120.00, 1000.00, 'Operativo', null],
    [$equipo_ids[6], 'CMP-006', 'Sistema de Perforación', 'Caterpillar', 'SER-C06', 'P100', 'horas', 1000.00, 700.00, 2000.00, 'activo', 10.00, 100.00, 800.00, 'Buen estado', null],
    [$equipo_ids[7], 'CMP-007', 'Cuchara', 'Komatsu', 'SER-C07', 'C500', 'horas', 600.50, 400.00, 1500.00, 'mantenimiento', 10.00, 50.00, 600.00, 'En revisión', null],
    [$equipo_ids[8], 'CMP-008', 'Brazo Hidráulico', 'Hitachi', 'SER-C08', 'B200', 'horas', 400.25, 300.00, 1000.00, 'averiado', 10.00, 20.00, 500.00, 'Fallo crítico', null],
    [$equipo_ids[9], 'CMP-009', 'Rodillo', 'Volvo', 'SER-C09', 'R110', 'horas', 300.75, 200.00, 800.00, 'descanso', 10.00, 75.00, 600.00, 'En reserva', null],
    [$equipo_ids[10], 'CMP-010', 'Estator', 'Siemens', 'SER-C10', 'S100', 'horas', 900.00, 600.00, 2000.00, 'activo', 10.00, 100.00, 800.00, 'Operativo', null],
    [$equipo_ids[11], 'CMP-011', 'Rotor', 'WEG', 'SER-C11', 'R75', 'horas', 600.50, 400.00, 1500.00, 'mantenimiento', 10.00, 50.00, 600.00, 'En revisión', null],
    [$equipo_ids[15], 'CMP-012', 'Cámara de Molienda', 'Metso', 'SER-C12', 'M300', 'horas', 300.25, 200.00, 800.00, 'activo', 10.00, 100.00, 1000.00, 'Buen estado', null],
    [$equipo_ids[16], 'CMP-013', 'Sistema de Alimentación', 'FLSmidth', 'SER-C13', 'F200', 'horas', 150.00, 100.00, 500.00, 'mantenimiento', 10.00, 50.00, 800.00, 'En revisión', null],
    [$equipo_ids[17], 'CMP-014', 'Concentrador', 'iCON', 'SER-C14', 'I50', 'horas', 80.00, 50.00, 300.00, 'descanso', 10.00, 20.00, 600.00, 'En reserva', null],
    [$equipo_ids[18], 'CMP-015', 'Rotor Secundario', 'Outotec', 'SER-C15', 'R250', 'horas', 500.75, 300.00, 1000.00, 'averiado', 10.00, 80.00, 800.00, 'Fallo crítico', null],
    [$equipo_ids[20], 'CMP-016', 'Motor Secundario', 'Komatsu', 'SER-C16', 'K930', 'horas', 1400.00, 900.00, 2000.00, 'activo', 10.00, 100.00, 800.00, 'Operativo', null],
    [$equipo_ids[22], 'CMP-017', 'Sistema de Trituración', 'FLSmidth', 'SER-C17', 'T400', 'horas', 700.50, 500.00, 1500.00, 'activo', 10.00, 120.00, 1000.00, 'Buen estado', null],
    [$equipo_ids[23], 'CMP-018', 'Brazo Perforador', 'Sandvik', 'SER-C18', 'P800', 'horas', 900.00, 600.00, 2000.00, 'activo', 10.00, 100.00, 800.00, 'Operativo', null],
    [$equipo_ids[25], 'CMP-019', 'Impulsor', 'Siemens', 'SER-C19', 'I150', 'horas', 1000.00, 700.00, 2000.00, 'activo', 10.00, 100.00, 800.00, 'Buen estado', null],
    [$equipo_ids[27], 'CMP-020', 'Cámara de Molienda', 'Metso', 'SER-C20', 'M200', 'horas', 400.25, 300.00, 1000.00, 'activo', 10.00, 80.00, 1000.00, 'Operativa', null],
];

$componente_ids = [];
foreach ($componentes as $componente) {
    ejecutarConsulta($pdo, "INSERT INTO componentes (equipo_id, codigo, nombre, marca, numero_serie, modelo, tipo_orometro, orometro_actual, anterior_orometro, proximo_orometro, estado, limite, notificacion, mantenimiento, observaciones, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", $componente);
    $componente_ids[] = ultimoId($pdo);
}

// 12. Poblar tabla historial_trabajo_equipos (30 days for each active equipment)
echo "Poblando historial_trabajo_equipos...\n";
$active_equipo_ids = array_filter($equipo_ids, function ($index) use ($equipos) {
    return in_array($equipos[$index][10], ['activo', 'mantenimiento']);
}, ARRAY_FILTER_USE_KEY);

$work_hours = [8.00, 8.50, 9.00, 9.50, 10.00, 10.50, 11.00, 11.50, 12.00]; // Possible manual hours
$historial_trabajo_equipos = [];
for ($day = 1; $day <= 30; $day++) {
    $date = sprintf('2025-04-%02d', $day);
    foreach ($active_equipo_ids as $index => $equipo_id) {
        // 70% chance of manual entry, 30% chance of automatic (12 hours)
        $is_manual = rand(0, 100) < 70;
        $hours = $is_manual ? $work_hours[array_rand($work_hours)] : 12.00;
        $source = $is_manual ? 'manual' : 'automatico';
        $observaciones = $is_manual ? 'Registro manual de trabajo' : 'Entrada automática por sistema';
        $historial_trabajo_equipos[] = [$equipo_id, $date, $hours, $source, $observaciones];
    }
}

foreach ($historial_trabajo_equipos as $hte) {
    ejecutarConsulta($pdo, "INSERT INTO historial_trabajo_equipos (equipo_id, fecha, horas_trabajadas, fuente, observaciones) VALUES (?, ?, ?, ?, ?)", $hte);
}

// 13. Poblar tabla historial_trabajo_componentes (30 days for each active component)
echo "Poblando historial_trabajo_componentes...\n";
$active_componente_ids = array_filter($componente_ids, function ($index) use ($componentes) {
    return in_array($componentes[$index][10], ['activo', 'mantenimiento']);
}, ARRAY_FILTER_USE_KEY);

$historial_trabajo_componentes = [];
for ($day = 1; $day <= 30; $day++) {
    $date = sprintf('2025-04-%02d', $day);
    foreach ($active_componente_ids as $index => $componente_id) {
        // 70% chance of manual entry, 30% chance of automatic (12 hours)
        $is_manual = rand(0, 100) < 70;
        $hours = $is_manual ? $work_hours[array_rand($work_hours)] : 12.00;
        $source = $is_manual ? 'manual' : 'automatico';
        $observaciones = $is_manual ? 'Registro manual de trabajo' : 'Entrada automática por sistema';
        $historial_trabajo_componentes[] = [$componente_id, $date, $hours, $source, $observaciones];
    }
}

foreach ($historial_trabajo_componentes as $htc) {
    ejecutarConsulta($pdo, "INSERT INTO historial_trabajo_componentes (componente_id, fecha, horas_trabajadas, fuente, observaciones) VALUES (?, ?, ?, ?, ?)", $htc);
}
/*
// 14. Poblar tabla mantenimiento_correctivo (15 filas)
echo "Poblando mantenimiento_correctivo...\n";
$mantenimientos_correctivos = [
    [$equipo_ids[0], null, 'Fallo en motor principal', 1450.00, '2025-04-20 10:00:00', 'pendiente', null, null, 'images/mantenimientos/fallo_motor.jpg'],
    [null, $componente_ids[1], 'Fuga en sistema hidráulico', 800.00, '2025-04-21 14:30:00', 'completado', '2025-04-21 16:00:00', 'Reparado con éxito', null],
    [$equipo_ids[2], null, 'Problema eléctrico', 200.00, '2025-04-19 09:00:00', 'pendiente', null, null, null],
    [null, $componente_ids[3], 'Desgaste en cuchilla', 750.00, '2025-04-22 08:00:00', 'completado', '2025-04-22 12:00:00', 'Cuchilla reemplazada', null],
    [$equipo_ids[7], null, 'Fallo en sistema hidráulico', 500.00, '2025-04-23 11:00:00', 'pendiente', null, null, null],
    [$equipo_ids[10], null, 'Sobrecalentamiento en motor', 1000.00, '2025-04-24 10:30:00', 'pendiente', null, null, null],
    [null, $componente_ids[6], 'Fallo en cuchara', 600.00, '2025-04-25 09:15:00', 'completado', '2025-04-25 11:00:00', 'Cuchara reparada', null],
    [$equipo_ids[15], null, 'Problema en cámara de molienda', 350.00, '2025-04-26 08:00:00', 'pendiente', null, null, null],
    [null, $componente_ids[9], 'Desgaste en estator', 850.00, '2025-04-27 14:00:00', 'completado', '2025-04-27 16:30:00', 'Estator reemplazado', null],
    [$equipo_ids[18], null, 'Fallo en rotor secundario', 600.00, '2025-04-28 10:00:00', 'pendiente', null, null, null],
    [$equipo_ids[20], null, 'Fallo en sistema eléctrico', 1700.00, '2025-04-29 09:00:00', 'pendiente', null, null, null],
    [null, $componente_ids[15], 'Desgaste en rotor secundario', 500.00, '2025-04-30 08:00:00', 'completado', '2025-04-30 10:00:00', 'Rotor reemplazado', null],
    [$equipo_ids[22], null, 'Fallo en trituración', 800.00, '2025-04-25 07:00:00', 'pendiente', null, null, null],
    [null, $componente_ids[17], 'Fallo en brazo perforador', 850.00, '2025-04-26 09:30:00', 'completado', '2025-04-26 11:30:00', 'Brazo reparado', null],
    [$equipo_ids[27], null, 'Problema en cámara de molienda', 400.00, '2025-04-27 08:00:00', 'pendiente', null, null, null],
];

$mantenimiento_correctivo_ids = [];
foreach ($mantenimientos_correctivos as $mc) {
    ejecutarConsulta($pdo, "INSERT INTO mantenimiento_correctivo (equipo_id, componente_id, descripcion_problema, orometro_actual, fecha_hora_problema, estado, fecha_realizado, observaciones, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", $mc);
    $mantenimiento_correctivo_ids[] = ultimoId($pdo);
}

// 15. Poblar tabla mantenimiento_preventivo (15 filas)
echo "Poblando mantenimiento_preventivo...\n";
$mantenimientos_preventivos = [
    [$equipo_ids[0], null, 'Revisión general preventiva', '2025-05-01 08:00:00', 2000.00, 'pendiente', null, null, 'images/mantenimientos/revision.jpg'],
    [null, $componente_ids[2], 'Cambio de filtro preventivo', '2025-04-30 10:00:00', 1000.00, 'completado', '2025-04-30 12:00:00', 'Filtro reemplazado', null],
    [$equipo_ids[5], null, 'Lubricación programada', '2025-05-02 09:00:00', 2000.00, 'pendiente', null, null, null],
    [null, $componente_ids[5], 'Inspección preventiva', '2025-05-03 07:00:00', 2000.00, 'completado', '2025-05-03 10:00:00', 'Sin problemas detectados', null],
    [$equipo_ids[10], null, 'Ajuste de rodamientos', '2025-05-04 11:00:00', 2000.00, 'pendiente', null, null, null],
    [$equipo_ids[15], null, 'Revisión de cámara de molienda', '2025-05-05 08:30:00', 800.00, 'pendiente', null, null, null],
    [null, $componente_ids[9], 'Cambio de aceite', '2025-05-06 09:00:00', 2000.00, 'completado', '2025-05-06 11:00:00', 'Aceite cambiado', null],
    [$equipo_ids[16], null, 'Lubricación de sistema', '2025-05-07 10:00:00', 800.00, 'pendiente', null, null, null],
    [null, $componente_ids[12], 'Inspección de alimentador', '2025-05-08 08:00:00', 500.00, 'completado', '2025-05-08 10:00:00', 'Sin problemas', null],
    [$equipo_ids[17], null, 'Revisión de concentrador', '2025-05-09 09:00:00', 300.00, 'pendiente', null, null, null],
    [$equipo_ids[20], null, 'Revisión general preventiva', '2025-05-10 08:00:00', 2500.00, 'pendiente', null, null, null],
    [null, $componente_ids[15], 'Cambio de filtro preventivo', '2025-05-11 09:00:00', 1000.00, 'completado', '2025-05-11 11:00:00', 'Filtro reemplazado', null],
    [$equipo_ids[22], null, 'Lubricación programada', '2025-05-12 10:00:00', 1500.00, 'pendiente', null, null, null],
    [null, $componente_ids[17], 'Inspección preventiva', '2025-05-13 07:00:00', 2000.00, 'completado', '2025-05-13 09:00:00', 'Sin problemas detectados', null],
    [$equipo_ids[27], null, 'Revisión de cámara de molienda', '2025-05-14 08:30:00', 1000.00, 'pendiente', null, null, null],
];

$mantenimiento_preventivo_ids = [];
foreach ($mantenimientos_preventivos as $mp) {
    ejecutarConsulta($pdo, "INSERT INTO mantenimiento_preventivo (equipo_id, componente_id, descripcion_razon, fecha_hora_programada, orometro_programado, estado, fecha_realizado, observaciones, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", $mp);
    $mantenimiento_preventivo_ids[] = ultimoId($pdo);
}

// 16. Poblar tabla mantenimiento_programado (15 filas)
echo "Poblando mantenimiento_programado...\n";
$mantenimientos_programados = [
    [$equipo_ids[1], null, 'Revisión predictiva por vibraciones', '2025-05-10 08:00:00', 1200.00, 'pendiente', null, null, null],
    [null, $componente_ids[0], 'Cambio predictivo de aceite', '2025-05-11 09:00:00', 1800.00, 'completado', '2025-05-11 11:00:00', 'Aceite cambiado', null],
    [$equipo_ids[6], null, 'Inspección predictiva de desgaste', '2025-05-12 10:00:00', 1500.00, 'pendiente', null, null, null],
    [null, $componente_ids[6], 'Revisión predictiva de rodamientos', '2025-05-13 07:00:00', 1000.00, 'completado', '2025-05-13 09:00:00', 'Rodamientos en buen estado', null],
    [$equipo_ids[10], null, 'Chequeo predictivo eléctrico', '2025-05-14 11:00:00', 2000.00, 'pendiente', null, null, null],
    [$equipo_ids[15], null, 'Análisis predictivo de molienda', '2025-05-15 08:30:00', 800.00, 'pendiente', null, null, null],
    [null, $componente_ids[9], 'Revisión predictiva de estator', '2025-05-16 09:00:00', 2000.00, 'completado', '2025-05-16 11:00:00', 'Estator en buen estado', null],
    [$equipo_ids[16], null, 'Inspección predictiva de sistema', '2025-05-17 10:00:00', 800.00, 'pendiente', null, null, null],
    [null, $componente_ids[12], 'Chequeo predictivo de alimentador', '2025-05-18 08:00:00', 500.00, 'completado', '2025-05-18 10:00:00', 'Sin problemas', null],
    [$equipo_ids[17], null, 'Análisis predictivo de concentrador', '2025-05-19 09:00:00', 300.00, 'pendiente', null, null, null],
    [$equipo_ids[20], null, 'Revisión predictiva por vibraciones', '2025-05-20 08:00:00', 2500.00, 'pendiente', null, null, null],
    [null, $componente_ids[15], 'Cambio predictivo de aceite', '2025-05-21 09:00:00', 1000.00, 'completado', '2025-05-21 11:00:00', 'Aceite cambiado', null],
    [$equipo_ids[22], null, 'Inspección predictiva de desgaste', '2025-05-22 10:00:00', 1500.00, 'pendiente', null, null, null],
    [null, $componente_ids[17], 'Revisión predictiva de rodamientos', '2025-05-23 07:00:00', 2000.00, 'completado', '2025-05-23 09:00:00', 'Rodamientos en buen estado', null],
    [$equipo_ids[27], null, 'Análisis predictivo de molienda', '2025-05-24 08:30:00', 1000.00, 'pendiente', null, null, null],
];

$mantenimiento_programado_ids = [];
foreach ($mantenimientos_programados as $mp) {
    ejecutarConsulta($pdo, "INSERT INTO mantenimiento_programado (equipo_id, componente_id, descripcion_razon, fecha_hora_programada, orometro_programado, estado, fecha_realizado, observaciones, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", $mp);
    $mantenimiento_programado_ids[] = ultimoId($pdo);
}

// 17. Poblar tabla notificaciones (20 filas)
echo "Poblando notificaciones...\n";
$notificaciones = [
    [$usuario_ids[3], $mantenimiento_preventivo_ids[0], 'Mantenimiento preventivo programado para Camión Minero el 2025-05-01.', 0],
    [$usuario_ids[4], $mantenimiento_preventivo_ids[0], 'Mantenimiento preventivo programado para Camión Minero el 2025-05-01.', 1],
    [$usuario_ids[5], $mantenimiento_preventivo_ids[1], 'Cambio de filtro preventivo completado para Transmisión.', 1],
    [$usuario_ids[6], $mantenimiento_preventivo_ids[2], 'Lubricación programada para Perforadora Principal el 2025-05-02.', 0],
    [$usuario_ids[3], $mantenimiento_preventivo_ids[3], 'Inspección preventiva completada para Sistema de Perforación.', 1],
    [$usuario_ids[4], $mantenimiento_preventivo_ids[4], 'Ajuste de rodamientos programado para Motor Principal el 2025-05-04.', 0],
    [$usuario_ids[5], $mantenimiento_preventivo_ids[5], 'Revisión de cámara de molienda programada para Molino Principal el 2025-05-05.', 0],
    [$usuario_ids[6], $mantenimiento_preventivo_ids[6], 'Cambio de aceite completado para Estator.', 1],
    [$usuario_ids[3], $mantenimiento_preventivo_ids[7], 'Lubricación de sistema programada para Equipo de Remolienda el 2025-05-07.', 0],
    [$usuario_ids[4], $mantenimiento_preventivo_ids[8], 'Inspección de alimentador completada para Sistema de Alimentación.', 1],
    [$usuario_ids[5], $mantenimiento_preventivo_ids[9], 'Revisión de concentrador programada para Concentrador iCON el 2025-05-09.', 0],
    [$usuario_ids[6], $mantenimiento_preventivo_ids[10], 'Revisión general preventiva para Camión Minero Secundario el 2025-05-10.', 0],
    [$usuario_ids[3], $mantenimiento_preventivo_ids[11], 'Cambio de filtro preventivo completado para Rotor Secundario.', 1],
    [$usuario_ids[4], $mantenimiento_preventivo_ids[12], 'Lubricación programada para Planta Pulverizadora el 2025-05-12.', 0],
    [$usuario_ids[5], $mantenimiento_preventivo_ids[13], 'Inspección preventiva completada para Brazo Perforador.', 1],
    [$usuario_ids[6], $mantenimiento_preventivo_ids[14], 'Revisión de cámara de molienda programada para Molino Terciario el 2025-05-14.', 0],
    [$usuario_ids[3], $mantenimiento_preventivo_ids[0], 'Recordatorio: Mantenimiento preventivo para Camión Minero el 2025-05-01.', 0],
    [$usuario_ids[4], $mantenimiento_preventivo_ids[2], 'Lubricación programada para Perforadora Principal el 2025-05-02.', 1],
    [$usuario_ids[5], $mantenimiento_preventivo_ids[5], 'Revisión de cámara de molienda programada para Molino Principal el 2025-05-05.', 0],
    [$usuario_ids[6], $mantenimiento_preventivo_ids[7], 'Lubricación de sistema programada para Equipo de Remolienda el 2025-05-07.', 0],
];

foreach ($notificaciones as $notificacion) {
    ejecutarConsulta($pdo, "INSERT INTO notificaciones (usuario_id, mantenimiento_preventivo_id, mensaje, leida) VALUES (?, ?, ?, ?)", $notificacion);
}
*/
// 18. Poblar tabla historial_mantenimiento (15 filas, solo mantenimientos completados)
/*
echo "Poblando historial_mantenimiento...\n";
$historial_mantenimientos = [
    ['correctivo', $mantenimiento_correctivo_ids[1], null, $componente_ids[1], 'Fuga en sistema hidráulico', '2025-04-21 16:00:00', 800.00, 'Reparado con éxito', null],
    ['correctivo', $mantenimiento_correctivo_ids[3], null, $componente_ids[3], 'Desgaste en cuchilla', '2025-04-22 12:00:00', 750.00, 'Cuchilla reemplazada', null],
    ['correctivo', $mantenimiento_correctivo_ids[6], null, $componente_ids[6], 'Fallo en cuchara', '2025-04-25 11:00:00', 600.00, 'Cuchara reparada', null],
    ['correctivo', $mantenimiento_correctivo_ids[8], null, $componente_ids[9], 'Desgaste en estator', '2025-04-27 16:30:00', 850.00, 'Estator reemplazado', null],
    ['correctivo', $mantenimiento_correctivo_ids[11], null, $componente_ids[15], 'Desgaste en rotor secundario', '2025-04-30 10:00:00', 500.00, 'Rotor reemplazado', null],
    ['correctivo', $mantenimiento_correctivo_ids[13], null, $componente_ids[17], 'Fallo en brazo perforador', '2025-04-26 11:30:00', 850.00, 'Brazo reparado', null],
    ['preventivo', $mantenimiento_preventivo_ids[1], null, $componente_ids[2], 'Cambio de filtro preventivo', '2025-04-30 12:00:00', 1000.00, 'Filtro reemplazado', null],
    ['preventivo', $mantenimiento_preventivo_ids[3], null, $componente_ids[5], 'Inspección preventiva', '2025-05-03 10:00:00', 2000.00, 'Sin problemas detectados', null],
    ['preventivo', $mantenimiento_preventivo_ids[6], null, $componente_ids[9], 'Cambio de aceite', '2025-05-06 11:00:00', 2000.00, 'Aceite cambiado', null],
    ['preventivo', $mantenimiento_preventivo_ids[8], null, $componente_ids[12], 'Inspección de alimentador', '2025-05-08 10:00:00', 500.00, 'Sin problemas', null],
    ['preventivo', $mantenimiento_preventivo_ids[11], null, $componente_ids[15], 'Cambio de filtro preventivo', '2025-05-11 11:00:00', 1000.00, 'Filtro reemplazado', null],
    ['preventivo', $mantenimiento_preventivo_ids[13], null, $componente_ids[17], 'Inspección preventiva', '2025-05-13 09:00:00', 2000.00, 'Sin problemas detectados', null],
    ['predictivo', $mantenimiento_programado_ids[1], null, $componente_ids[0], 'Cambio predictivo de aceite', '2025-05-11 11:00:00', 1800.00, 'Aceite cambiado', null],
    ['predictivo', $mantenimiento_programado_ids[3], null, $componente_ids[6], 'Revisión predictiva de rodamientos', '2025-05-13 09:00:00', 1000.00, 'Rodamientos en buen estado', null],
    ['predictivo', $mantenimiento_programado_ids[6], null, $componente_ids[9], 'Revisión predictiva de estator', '2025-05-16 11:00:00', 2000.00, 'Estator en buen estado', null],
];

foreach ($historial_mantenimientos as $hm) {
    ejecutarConsulta($pdo, "INSERT INTO historial_mantenimiento (tipo_mantenimiento, mantenimiento_id, equipo_id, componente_id, descripcion, fecha_realizado, orometro_realizado, observaciones, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", $hm);
}
*/
echo "Seeder completado exitosamente.\n";
