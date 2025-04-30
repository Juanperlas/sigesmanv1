-- Base de datos para la gestión y mantenimiento de equipos mineros
CREATE DATABASE IF NOT EXISTS sigesman;
USE sigesman;

-- Tabla de Módulos: Almacena los módulos del sistema dinámicamente
CREATE TABLE modulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de Permisos: Define permisos granulares asociados a módulos
CREATE TABLE permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modulo_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE RESTRICT,
    INDEX idx_nombre (nombre)
);

-- Tabla de Roles: Almacena roles dinámicos
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de Relación Roles-Permisos: Asocia permisos a roles
CREATE TABLE roles_permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE RESTRICT,
    UNIQUE (rol_id, permiso_id)
);

-- Tabla de Ubicaciones: Almacena ubicaciones únicas
CREATE TABLE ubicaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    imagen VARCHAR(255),
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de Usuarios: Gestiona los usuarios del sistema
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE,
    dni VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    direccion TEXT,
    area VARCHAR(50),
    fotografia VARCHAR(255),
    creado_por INT,
    token_recordatorio VARCHAR(255),
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_username (username),
    INDEX idx_dni (dni)
);

-- Tabla de Relación Usuarios-Roles: Asocia roles a usuarios
CREATE TABLE usuarios_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    rol_id INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT,
    UNIQUE (usuario_id, rol_id)
);

-- Tabla de Sesiones de Usuarios: Registra ingresos y cierres de sesión
CREATE TABLE sesiones_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    inicio_sesion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fin_sesion TIMESTAMP,
    esta_activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabla de Personal: Gestiona el personal (sin acceso al sistema por defecto)
CREATE TABLE personal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    direccion TEXT,
    area VARCHAR(50),
    fecha_ingreso DATE NOT NULL,
    fecha_baja DATE,
    imagen VARCHAR(255),
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_por INT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_dni (dni)
);

-- Tabla de Categorías de Equipos: Clasifica los tipos de equipos
CREATE TABLE categorias_equipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de Líneas Eléctricas: Líneas dinámicas para equipos eléctricos
CREATE TABLE lineas_electricas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de Máquinas: Almacena máquinas dinámicamente
CREATE TABLE maquinas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    numero_serie VARCHAR(50) UNIQUE,
    ubicacion_id INT,
    estado ENUM('activo', 'mantenimiento', 'averiado', 'vendido', 'descanso') DEFAULT 'activo',
    observaciones TEXT,
    imagen VARCHAR(255),
    orometro_actual DECIMAL(15,2) DEFAULT 0,
    proximo_orometro DECIMAL(15,2),
    limite DECIMAL(15,2) CHECK (limite BETWEEN 0 AND 1000000),
    notificacion DECIMAL(15,2) CHECK (notificacion BETWEEN 0 AND 1000),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE SET NULL,
    INDEX idx_codigo (codigo)
);

-- Tabla de Equipos: Almacena equipos principales
CREATE TABLE equipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    modelo VARCHAR(50),
    marca VARCHAR(50),
    capacidad VARCHAR(50),
    numero_serie VARCHAR(50) UNIQUE,
    orometro_actual DECIMAL(15,2) DEFAULT 0,
    proximo_orometro DECIMAL(15,2),
    estado ENUM('activo', 'mantenimiento', 'averiado', 'vendido', 'descanso') DEFAULT 'activo',
    limite DECIMAL(15,2) CHECK (limite BETWEEN 0 AND 1000000),
    notificacion DECIMAL(15,2) CHECK (notificacion BETWEEN 0 AND 1000),
    observaciones TEXT,
    ubicacion_id INT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias_equipos(id) ON DELETE RESTRICT,
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE SET NULL,
    INDEX idx_codigo (codigo)
);

-- Tabla de Componentes: Partes de los equipos
CREATE TABLE componentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipo_id INT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    marca VARCHAR(50),
    numero_serie VARCHAR(50),
    modelo VARCHAR(50),
    tipo ENUM('horas', 'kilometros') NOT NULL,
    orometro_actual DECIMAL(15,2) DEFAULT 0,
    proximo_orometro DECIMAL(15,2),
    estado ENUM('activo', 'mantenimiento', 'averiado', 'vendido', 'descanso') DEFAULT 'activo',
    limite DECIMAL(15,2) CHECK (limite BETWEEN 0 AND 1000000),
    notificacion DECIMAL(15,2) CHECK (notificacion BETWEEN 0 AND 1000),
    observaciones TEXT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE RESTRICT,
    INDEX idx_codigo (codigo)
);

-- Tabla de Insumos: Materiales asociados a los componentes
CREATE TABLE insumos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    componente_id INT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    cantidad INT DEFAULT 0,
    observaciones TEXT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (componente_id) REFERENCES componentes(id) ON DELETE RESTRICT,
    INDEX idx_codigo (codigo)
);

-- Tabla de Equipos Eléctricos - Chancadoras y Pulverizadoras
CREATE TABLE chancadoras_pulverizadoras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    tipo ENUM('chancadora', 'pulverizadora') NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    ubicacion_id INT,
    estado ENUM('activo', 'mantenimiento', 'averiado', 'vendido', 'descanso') DEFAULT 'activo',
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE SET NULL,
    INDEX idx_codigo (codigo)
);

-- Tabla de Motores: Motores eléctricos relacionados con máquinas
CREATE TABLE motores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maquina_id INT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    marca VARCHAR(50),
    capacidad VARCHAR(50),
    fase VARCHAR(20),
    estado ENUM('activo', 'mantenimiento', 'averiado', 'vendido', 'descanso') DEFAULT 'activo',
    orometro_actual DECIMAL(15,2) DEFAULT 0,
    proximo_orometro DECIMAL(15,2),
    limite DECIMAL(15,2) CHECK (limite BETWEEN 0 AND 1000000),
    notificacion DECIMAL(15,2) CHECK (notificacion BETWEEN 0 AND 1000),
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
    INDEX idx_codigo (codigo)
);

-- Tabla de Equipos Eléctricos - Molino, Remolienda e ICON
CREATE TABLE molino_remolienda_icon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    linea_id INT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    tipo ENUM('molino', 'remolienda', 'icon') NOT NULL,
    marca VARCHAR(50),
    capacidad VARCHAR(50),
    numero_serie VARCHAR(50) UNIQUE,
    ubicacion_id INT,
    orometro_actual DECIMAL(15,2) DEFAULT 0,
    proximo_orometro DECIMAL(15,2),
    estado ENUM('activo', 'mantenimiento', 'averiado', 'vendido', 'descanso') DEFAULT 'activo',
    limite DECIMAL(15,2) CHECK (limite BETWEEN 0 AND 1000000),
    notificacion DECIMAL(15,2) CHECK (notificacion BETWEEN 0 AND 1000),
    observaciones TEXT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (linea_id) REFERENCES lineas_electricas(id) ON DELETE RESTRICT,
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE SET NULL,
    INDEX idx_codigo (codigo)
);

-- Tabla de Mantenimiento Correctivo: Registra fallos imprevistos
CREATE TABLE mantenimiento_correctivo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipo_id INT,
    componente_id INT,
    electrico_id INT,
    maquina_id INT,
    motor_id INT,
    descripcion_problema TEXT NOT NULL,
    orometro_actual DECIMAL(15,2),
    fecha_hora_problema DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente', 'completado') DEFAULT 'pendiente',
    fecha_realizado DATETIME,
    observaciones TEXT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE RESTRICT,
    FOREIGN KEY (componente_id) REFERENCES componentes(id) ON DELETE RESTRICT,
    FOREIGN KEY (electrico_id) REFERENCES molino_remolienda_icon(id) ON DELETE RESTRICT,
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
    FOREIGN KEY (motor_id) REFERENCES motores(id) ON DELETE RESTRICT,
    CHECK (
        (equipo_id IS NOT NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NOT NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NOT NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NOT NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NOT NULL)
    )
);

-- Tabla de Mantenimiento Preventivo: Registra mantenimientos automáticos basados en patrones
CREATE TABLE mantenimiento_preventivo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipo_id INT,
    componente_id INT,
    electrico_id INT,
    maquina_id INT,
    motor_id INT,
    descripcion_razon TEXT NOT NULL,
    fecha_hora_programada DATETIME DEFAULT CURRENT_TIMESTAMP,
    orometro_programado DECIMAL(15,2),
    estado ENUM('pendiente', 'completado') DEFAULT 'pendiente',
    fecha_realizado DATETIME,
    observaciones TEXT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE RESTRICT,
    FOREIGN KEY (componente_id) REFERENCES componentes(id) ON DELETE RESTRICT,
    FOREIGN KEY (electrico_id) REFERENCES molino_remolienda_icon(id) ON DELETE RESTRICT,
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
    FOREIGN KEY (motor_id) REFERENCES motores(id) ON DELETE RESTRICT,
    CHECK (
        (equipo_id IS NOT NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NOT NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NOT NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NOT NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NOT NULL)
    )
);

-- Tabla de Mantenimiento Programado (Predictivo): Registra mantenimientos definidos por el usuario
CREATE TABLE mantenimiento_programado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipo_id INT,
    componente_id INT,
    electrico_id INT,
    maquina_id INT,
    motor_id INT,
    descripcion_razon TEXT NOT NULL,
    fecha_hora_programada DATETIME DEFAULT CURRENT_TIMESTAMP,
    orometro_programado DECIMAL(15,2),
    estado ENUM('pendiente', 'completado') DEFAULT 'pendiente',
    fecha_realizado DATETIME,
    observaciones TEXT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE RESTRICT,
    FOREIGN KEY (componente_id) REFERENCES componentes(id) ON DELETE RESTRICT,
    FOREIGN KEY (electrico_id) REFERENCES molino_remolienda_icon(id) ON DELETE RESTRICT,
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
    FOREIGN KEY (motor_id) REFERENCES motores(id) ON DELETE RESTRICT,
    CHECK (
        (equipo_id IS NOT NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NOT NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NOT NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NOT NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NOT NULL)
    )
);

-- Tabla de Historial de Mantenimiento: Almacena mantenimientos completados para reportes y calendarios
CREATE TABLE historial_mantenimiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_mantenimiento ENUM('correctivo', 'preventivo', 'predictivo') NOT NULL,
    mantenimiento_id INT NOT NULL,
    equipo_id INT,
    componente_id INT,
    electrico_id INT,
    maquina_id INT,
    motor_id INT,
    descripcion TEXT NOT NULL,
    fecha_realizado DATETIME NOT NULL,
    orometro_realizado DECIMAL(15,2),
    observaciones TEXT,
    imagen VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE RESTRICT,
    FOREIGN KEY (componente_id) REFERENCES componentes(id) ON DELETE RESTRICT,
    FOREIGN KEY (electrico_id) REFERENCES molino_remolienda_icon(id) ON DELETE RESTRICT,
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
    FOREIGN KEY (motor_id) REFERENCES motores(id) ON DELETE RESTRICT,
    CHECK (
        (equipo_id IS NOT NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NOT NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NOT NULL AND maquina_id IS NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NOT NULL AND motor_id IS NULL) OR
        (equipo_id IS NULL AND componente_id IS NULL AND electrico_id IS NULL AND maquina_id IS NULL AND motor_id IS NOT NULL)
    )
);

-- Inserción inicial de módulos
INSERT INTO modulos (nombre, descripcion) VALUES
('dashboard', 'Panel principal del sistema'),
('equipos', 'Gestión de equipos pesados, livianos y electrónicos'),
('equipos.pesados', 'Submódulo de equipos pesados'),
('equipos.livianos', 'Submódulo de equipos livianos'),
('equipos.electronicos', 'Submódulo de equipos electrónicos'),
('maquinas', 'Gestión de máquinas'),
('motores', 'Gestión de motores'),
('mantenimiento', 'Gestión de mantenimientos'),
('mantenimiento.preventivo', 'Submódulo de mantenimiento preventivo'),
('mantenimiento.correctivo', 'Submódulo de mantenimiento correctivo'),
('mantenimiento.programado', 'Submódulo de mantenimiento programado (predictivo)'),
('administracion', 'Gestión administrativa'),
('administracion.usuarios', 'Submódulo de usuarios'),
('administracion.ubicaciones', 'Submódulo de ubicaciones'),
('administracion.personal', 'Submódulo de personal'),
('administracion.roles_permisos', 'Submódulo de roles y permisos');

-- Inserción inicial de permisos
INSERT INTO permisos (modulo_id, nombre, descripcion) VALUES
(1, 'dashboard.acceder', 'Permite acceder al panel principal'),
(1, 'dashboard.ver', 'Permite ver el panel principal'),
(2, 'equipos.acceder', 'Permite acceder al módulo de equipos'),
(2, 'equipos.ver', 'Permite ver la lista de equipos'),
(2, 'equipos.crear', 'Permite crear nuevos equipos'),
(2, 'equipos.editar', 'Permite editar equipos existentes'),
(3, 'equipos.pesados.acceder', 'Permite acceder al submódulo de equipos pesados'),
(3, 'equipos.pesados.ver', 'Permite ver equipos pesados'),
(3, 'equipos.pesados.crear', 'Permite crear equipos pesados'),
(3, 'equipos.pesados.editar', 'Permite editar equipos pesados'),
(4, 'equipos.livianos.acceder', 'Permite acceder al submódulo de equipos livianos'),
(4, 'equipos.livianos.ver', 'Permite ver equipos livianos'),
(4, 'equipos.livianos.crear', 'Permite crear equipos livianos'),
(4, 'equipos.livianos.editar', 'Permite editar equipos livianos'),
(5, 'equipos.electronicos.acceder', 'Permite acceder al submódulo de equipos electrónicos'),
(5, 'equipos.electronicos.ver', 'Permite ver equipos electrónicos'),
(5, 'equipos.electronicos.crear', 'Permite crear equipos electrónicos'),
(5, 'equipos.electronicos.editar', 'Permite editar equipos electrónicos'),
(6, 'maquinas.acceder', 'Permite acceder al módulo de máquinas'),
(6, 'maquinas.ver', 'Permite ver la lista de máquinas'),
(6, 'maquinas.crear', 'Permite crear nuevas máquinas'),
(6, 'maquinas.editar', 'Permite editar máquinas existentes'),
(7, 'motores.acceder', 'Permite acceder al módulo de motores'),
(7, 'motores.ver', 'Permite ver la lista de motores'),
(7, 'motores.crear', 'Permite crear nuevos motores'),
(7, 'motores.editar', 'Permite editar motores existentes'),
(8, 'mantenimiento.acceder', 'Permite acceder al módulo de mantenimientos'),
(8, 'mantenimiento.ver', 'Permite ver todos los mantenimientos'),
(9, 'mantenimiento.preventivo.acceder', 'Permite acceder al submódulo de mantenimiento preventivo'),
(9, 'mantenimiento.preventivo.ver', 'Permite ver mantenimientos preventivos'),
(9, 'mantenimiento.preventivo.crear', 'Permite crear mantenimientos preventivos'),
(9, 'mantenimiento.preventivo.editar', 'Permite editar mantenimientos preventivos'),
(10, 'mantenimiento.correctivo.acceder', 'Permite acceder al submódulo de mantenimiento correctivo'),
(10, 'mantenimiento.correctivo.ver', 'Permite ver mantenimientos correctivos'),
(10, 'mantenimiento.correctivo.crear', 'Permite crear mantenimientos correctivos'),
(10, 'mantenimiento.correctivo.editar', 'Permite editar mantenimientos correctivos'),
(11, 'mantenimiento.programado.acceder', 'Permite acceder al submódulo de mantenimiento programado (predictivo)'),
(11, 'mantenimiento.programado.ver', 'Permite ver mantenimientos programados'),
(11, 'mantenimiento.programado.crear', 'Permite crear mantenimientos programados'),
(11, 'mantenimiento.programado.editar', 'Permite editar mantenimientos programados'),
(12, 'administracion.acceder', 'Permite acceder al módulo de administración'),
(12, 'administracion.ver', 'Permite ver el panel de administración'),
(13, 'administracion.usuarios.acceder', 'Permite acceder al submódulo de usuarios'),
(13, 'administracion.usuarios.ver', 'Permite ver la lista de usuarios'),
(13, 'administracion.usuarios.crear', 'Permite crear nuevos usuarios'),
(13, 'administracion.usuarios.editar', 'Permite editar usuarios existentes'),
(14, 'administracion.ubicaciones.acceder', 'Permite acceder al submódulo de ubicaciones'),
(14, 'administracion.ubicaciones.ver', 'Permite ver la lista de ubicaciones'),
(14, 'administracion.ubicaciones.crear', 'Permite crear nuevas ubicaciones'),
(14, 'administracion.ubicaciones.editar', 'Permite editar ubicaciones existentes'),
(15, 'administracion.personal.acceder', 'Permite acceder al submódulo de personal'),
(15, 'administracion.personal.ver', 'Permite ver la lista de personal'),
(15, 'administracion.personal.crear', 'Permite crear nuevo personal'),
(15, 'administracion.personal.editar', 'Permite editar personal existente'),
(16, 'administracion.roles_permisos.acceder', 'Permite acceder al submódulo de roles y permisos'),
(16, 'administracion.roles_permisos.ver', 'Permite ver roles y permisos'),
(16, 'administracion.roles_permisos.crear', 'Permite crear roles y permisos'),
(16, 'administracion.roles_permisos.editar', 'Permite editar roles y permisos');

-- Inserción inicial de roles
INSERT INTO roles (nombre, descripcion) VALUES
('superadmin', 'Rol con acceso completo a todas las funcionalidades del sistema'),
('admin', 'Rol con acceso completo inicial, configurable posteriormente'),
('jefe', 'Rol para supervisores con acceso a equipos, máquinas, mantenimientos y personal'),
('invitado', 'Rol con permisos limitados, solo visualización');

-- Inserción inicial de roles_permisos
INSERT INTO roles_permisos (rol_id, permiso_id) VALUES
-- Superadmin: Todos los permisos
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
(1, 11), (1, 12), (1, 13), (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 19), (1, 20),
(1, 21), (1, 22), (1, 23), (1, 24), (1, 25), (1, 26), (1, 27), (1, 28), (1, 29), (1, 30),
(1, 31), (1, 32), (1, 33), (1, 34), (1, 35), (1, 36), (1, 37), (1, 38), (1, 39), (1, 40),
(1, 41), (1, 42), (1, 43), (1, 44), (1, 45), (1, 46), (1, 47), (1, 48), (1, 49), (1, 50),
(1, 51), (1, 52), (1, 53), (1, 54), (1, 55), (1, 56),
-- Admin: Todos los permisos (igual que superadmin al inicio)
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
(2, 11), (2, 12), (2, 13), (2, 14), (2, 15), (2, 16), (2, 17), (2, 18), (2, 19), (2, 20),
(2, 21), (2, 22), (2, 23), (2, 24), (2, 25), (2, 26), (2, 27), (2, 28), (2, 29), (2, 30),
(2, 31), (2, 32), (2, 33), (2, 34), (2, 35), (2, 36), (2, 37), (2, 38), (2, 39), (2, 40),
(2, 41), (2, 42), (2, 43), (2, 44), (2, 45), (2, 46), (2, 47), (2, 48), (2, 49), (2, 50),
(2, 51), (2, 52), (2, 53), (2, 54), (2, 55), (2, 56),
-- Jefe: Todos los permisos excepto administracion.usuarios y administracion.roles_permisos
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8), (3, 9), (3, 10),
(3, 11), (3, 12), (3, 13), (3, 14), (3, 15), (3, 16), (3, 17), (3, 18), (3, 19), (3, 20),
(3, 21), (3, 22), (3, 23), (3, 24), (3, 25), (3, 26), (3, 27), (3, 28), (3, 29), (3, 30),
(3, 31), (3, 32), (3, 33), (3, 34), (3, 35), (3, 36), (3, 37), (3, 38), (3, 39), (3, 40),
(3, 41), (3, 42), (3, 49), (3, 50), (3, 51), (3, 52),
-- Invitado: Solo visualización en módulos seleccionados
(4, 1), (4, 2), (4, 3), (4, 4), (4, 7), (4, 8), (4, 11), (4, 12), (4, 15), (4, 16),
(4, 19), (4, 20), (4, 23), (4, 24), (4, 27), (4, 28), (4, 31), (4, 33), (4, 35), (4, 37),
(4, 49), (4, 51);

-- Inserción inicial de categorías de equipos
INSERT INTO categorias_equipos (nombre, descripcion) VALUES
('estacionarios', 'Equipos fijos en una ubicación'),
('pesados', 'Equipos de gran tamaño y peso'),
('livianos', 'Equipos portátiles o de menor tamaño'),
('electricos', 'Equipos alimentados por electricidad');
