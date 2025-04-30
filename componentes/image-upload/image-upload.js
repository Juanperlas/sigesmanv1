/**
 * Componente de carga y previsualización de imágenes
 * Permite subir imágenes desde el dispositivo o tomar fotos con la cámara
 */

class ImageUpload {
    constructor(inputName, previewId, options = {}) {
      // Elementos DOM
      this.container = document.getElementById(`container-${previewId}`);
      this.input = document.getElementById(`input-${previewId}`);
      this.preview = document.getElementById(`preview-${previewId}`);
      this.existingInput = document.getElementById(`existing-${previewId}`);
      this.cameraModal = document.getElementById(`camera-modal-${previewId}`);
      this.video = document.getElementById(`camera-video-${previewId}`);
      this.canvas = document.getElementById(`camera-canvas-${previewId}`);
      this.captureBtn = document.getElementById(`capture-${previewId}`);
      this.switchBtn = document.getElementById(`switch-${previewId}`);
      
      // Opciones
      this.options = {
        maxSize: options.maxSize || 5, // Tamaño máximo en MB
        aspectRatio: options.aspectRatio || null, // Relación de aspecto (ancho/alto)
        onImageChange: options.onImageChange || null, // Callback cuando cambia la imagen
        ...options
      };
      
      // Estado
      this.stream = null;
      this.facingMode = 'user'; // 'user' para cámara frontal, 'environment' para trasera
      
      // Inicializar
      this.init();
    }
    
    init() {
      if (!this.container) return;
      
      // Configurar botones de acción
      const actionButtons = this.container.querySelectorAll('.image-upload-btn');
      actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          this.handleAction(action);
        });
      });
      
      // Configurar input de archivo
      this.input.addEventListener('change', (e) => {
        this.handleFileSelect(e);
      });
      
      // Configurar modal de cámara
      if (this.cameraModal) {
        const closeBtn = this.cameraModal.querySelector('.camera-modal-close');
        closeBtn.addEventListener('click', () => {
          this.closeCamera();
        });
        
        // Botón de captura
        if (this.captureBtn) {
          this.captureBtn.addEventListener('click', () => {
            this.capturePhoto();
          });
        }
        
        // Botón de cambio de cámara
        if (this.switchBtn) {
          this.switchBtn.addEventListener('click', () => {
            this.switchCamera();
          });
        }
      }
    }
    
    handleAction(action) {
      switch (action) {
        case 'upload':
          this.input.click();
          break;
        case 'camera':
          this.openCamera();
          break;
        case 'view':
          this.viewImage();
          break;
        case 'remove':
          this.removeImage();
          break;
      }
    }
    
    handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validar tamaño
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > this.options.maxSize) {
        showErrorToast(`La imagen es demasiado grande. El tamaño máximo es ${this.options.maxSize}MB.`);
        this.input.value = '';
        return;
      }
      
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        showErrorToast('El archivo seleccionado no es una imagen válida.');
        this.input.value = '';
        return;
      }
      
      // Mostrar vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        this.preview.src = e.target.result;
        this.showRemoveButton();
        
        // Limpiar el valor del input de imagen existente
        if (this.existingInput) {
          this.existingInput.value = '';
        }
        
        // Llamar al callback si existe
        if (typeof this.options.onImageChange === 'function') {
          this.options.onImageChange(file);
        }
      };
      reader.readAsDataURL(file);
    }
    
    openCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showErrorToast('Tu navegador no soporta el acceso a la cámara.');
        return;
      }
      
      // Mostrar modal
      this.cameraModal.classList.add('show');
      
      // Iniciar cámara
      const constraints = {
        video: {
          facingMode: this.facingMode
        },
        audio: false
      };
      
      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          this.stream = stream;
          this.video.srcObject = stream;
        })
        .catch((err) => {
          console.error('Error al acceder a la cámara:', err);
          showErrorToast('No se pudo acceder a la cámara. Verifica los permisos.');
          this.closeCamera();
        });
    }
    
    closeCamera() {
      // Ocultar modal
      this.cameraModal.classList.remove('show');
      
      // Detener stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }
    
    capturePhoto() {
      if (!this.video || !this.canvas) return;
      
      // Configurar canvas
      const width = this.video.videoWidth;
      const height = this.video.videoHeight;
      this.canvas.width = width;
      this.canvas.height = height;
      
      // Capturar imagen
      const context = this.canvas.getContext('2d');
      context.drawImage(this.video, 0, 0, width, height);
      
      // Convertir a base64
      const imageData = this.canvas.toDataURL('image/jpeg');
      
      // Actualizar vista previa
      this.preview.src = imageData;
      this.showRemoveButton();
      
      // Crear un archivo a partir del base64 para el input
      this.dataURLtoFile(imageData, 'camera_photo.jpg');
      
      // Cerrar cámara
      this.closeCamera();
      
      // Llamar al callback si existe
      if (typeof this.options.onImageChange === 'function') {
        this.options.onImageChange(this.input.files[0]);
      }
    }
    
    dataURLtoFile(dataURL, filename) {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      const file = new File([u8arr], filename, { type: mime });
      
      // Crear un nuevo FileList con este archivo
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      this.input.files = dataTransfer.files;
      
      // Limpiar el valor del input de imagen existente
      if (this.existingInput) {
        this.existingInput.value = '';
      }
    }
    
    switchCamera() {
      // Cambiar modo de cámara
      this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
      
      // Detener stream actual
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      // Reiniciar cámara con nueva configuración
      const constraints = {
        video: {
          facingMode: this.facingMode
        },
        audio: false
      };
      
      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          this.stream = stream;
          this.video.srcObject = stream;
        })
        .catch((err) => {
          console.error('Error al cambiar de cámara:', err);
          showErrorToast('No se pudo cambiar de cámara.');
        });
    }
    
    viewImage() {
      // Usar el componente de visualización de imágenes
      if (typeof imageViewer !== 'undefined' && this.preview.src) {
        imageViewer.show(this.preview.src, this.preview.alt || 'Imagen');
      }
    }
    
    removeImage() {
      // Restaurar imagen por defecto
      this.preview.src = 'assets/img/placeholder.png';
      
      // Limpiar input
      this.input.value = '';
      
      // Limpiar input de imagen existente
      if (this.existingInput) {
        this.existingInput.value = '';
      }
      
      // Ocultar botón de eliminar
      this.hideRemoveButton();
      
      // Llamar al callback si existe
      if (typeof this.options.onImageChange === 'function') {
        this.options.onImageChange(null);
      }
    }
    
    showRemoveButton() {
      const removeBtn = this.container.querySelector('[data-action="remove"]');
      if (removeBtn) {
        removeBtn.style.display = 'flex';
      }
    }
    
    hideRemoveButton() {
      const removeBtn = this.container.querySelector('[data-action="remove"]');
      if (removeBtn) {
        removeBtn.style.display = 'none';
      }
    }
  }
  
  // Inicializar todos los componentes de carga de imágenes en la página
  document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.image-upload-container');
    containers.forEach(container => {
      const previewId = container.id.replace('container-', '');
      const inputName = document.getElementById(`input-${previewId}`).name;
      new ImageUpload(inputName, previewId);
    });
  });