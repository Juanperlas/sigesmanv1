<?php
/**
 * Componente de carga y previsualización de imágenes
 * 
 * @param string $inputName Nombre del input
 * @param string $previewId ID único para el componente
 * @param string $defaultImage URL de la imagen por defecto (opcional)
 * @param string $label Etiqueta del campo (opcional)
 * @param bool $required Si el campo es requerido (opcional)
 */
function renderImageUpload($inputName, $previewId, $defaultImage = '', $label = 'Imagen', $required = false) {
?>
<div class="image-upload-container" id="container-<?php echo $previewId; ?>">
  <?php if ($label): ?>
  <label class="image-upload-label"><?php echo $label; ?><?php echo $required ? ' <span class="required">*</span>' : ''; ?></label>
  <?php endif; ?>
  
  <div class="image-upload-preview-container">
    <div class="image-upload-preview">
      <img src="<?php echo $defaultImage ? $defaultImage : 'assets/img/placeholder.png'; ?>" 
           alt="Vista previa" 
           id="preview-<?php echo $previewId; ?>" 
           class="image-preview">
      <div class="image-upload-overlay">
        <div class="image-upload-icons">
          <button type="button" class="image-upload-btn" data-action="upload" title="Subir imagen">
            <i class="fas fa-upload"></i>
          </button>
          <button type="button" class="image-upload-btn" data-action="camera" title="Tomar foto">
            <i class="fas fa-camera"></i>
          </button>
          <?php if ($defaultImage): ?>
          <button type="button" class="image-upload-btn" data-action="view" title="Ver imagen">
            <i class="fas fa-eye"></i>
          </button>
          <?php endif; ?>
          <button type="button" class="image-upload-btn" data-action="remove" title="Eliminar imagen" <?php echo !$defaultImage ? 'style="display:none;"' : ''; ?>>
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <input type="file" 
         name="<?php echo $inputName; ?>" 
         id="input-<?php echo $previewId; ?>" 
         class="image-upload-input" 
         accept="image/*" 
         <?php echo $required ? 'required' : ''; ?>>
  
  <input type="hidden" 
         name="<?php echo $inputName; ?>_existing" 
         id="existing-<?php echo $previewId; ?>" 
         value="<?php echo $defaultImage; ?>">
         
  <!-- Modal para la cámara -->
  <div class="camera-modal" id="camera-modal-<?php echo $previewId; ?>">
    <div class="camera-modal-content">
      <div class="camera-modal-header">
        <h3>Tomar foto</h3>
        <button type="button" class="camera-modal-close">&times;</button>
      </div>
      <div class="camera-modal-body">
        <video id="camera-video-<?php echo $previewId; ?>" autoplay playsinline></video>
        <canvas id="camera-canvas-<?php echo $previewId; ?>" style="display:none;"></canvas>
        <div class="camera-controls">
          <button type="button" class="camera-capture-btn" id="capture-<?php echo $previewId; ?>">
            <i class="fas fa-camera"></i> Capturar
          </button>
          <button type="button" class="camera-switch-btn" id="switch-<?php echo $previewId; ?>">
            <i class="fas fa-sync"></i> Cambiar cámara
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
<?php
}
?>