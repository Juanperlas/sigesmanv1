<?php
// Incluir archivos necesarios
require_once '../db/funciones.php';
require_once '../db/conexion.php';

// Verificar si es una solicitud AJAX
$esAjax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';

if (!$esAjax) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso no permitido']);
    exit;
}

// Verificar autenticación
if (!estaAutenticado()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

// Verificar que se proporcionó un directorio
if (!isset($_POST['directorio']) || empty($_POST['directorio'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Directorio no proporcionado']);
    exit;
}

$directorio = sanitizar($_POST['directorio']);

// Validar que el directorio no contenga caracteres peligrosos
if (preg_match('/[^a-zA-Z0-9\/\-_]/', $directorio)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Directorio no válido']);
    exit;
}

// Ruta base de la API
$rutaBase = __DIR__;

// Ruta completa del directorio
$rutaCompleta = $rutaBase . '/' . $directorio;

// Verificar si el directorio existe
if (is_dir($rutaCompleta)) {
    // El directorio ya existe
    $response = [
        'success' => true,
        'message' => 'El directorio ya existe',
        'exists' => true
    ];
} else {
    // Intentar crear el directorio
    if (mkdir($rutaCompleta, 0755, true)) {
        $response = [
            'success' => true,
            'message' => 'Directorio creado correctamente',
            'exists' => false
        ];
    } else {
        $response = [
            'success' => false,
            'message' => 'No se pudo crear el directorio',
            'exists' => false
        ];
    }
}

// Devolver respuesta en formato JSON
header('Content-Type: application/json');
echo json_encode($response);
