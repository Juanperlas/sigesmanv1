/**
 * Gestión de componentes
 * Funcionalidades para listar, crear, editar, ver detalles y eliminar componentes
 */

// Declaración de variables globales (asumiendo que jQuery está disponible globalmente)
const $ = jQuery;

document.addEventListener("DOMContentLoaded", () => {
  // Variables globales
  let componentesTable;
  let componenteActual = null;
  let filtrosActivos = {};
  let imageUploader = null;

  // Función para obtener la URL base
  function getBaseUrl() {
    return window.location.pathname.split("/modulos/")[0] + "/";
  }

  // Función para construir URL completa
  function getUrl(path) {
    return getBaseUrl() + path;
  }

  // Inicializar DataTable
  function initDataTable() {
    componentesTable = $("#componentes-table").DataTable({
      processing: true,
      serverSide: true,
      responsive: true,
      ajax: {
        url: getUrl("api/equipos/componentes/listar.php"),
        type: "POST",
        data: (d) => {
          // Agregar filtros activos
          return {
            ...d,
            ...filtrosActivos,
          };
        },
        error: (xhr, error, thrown) => {
          console.error(
            "Error en la solicitud AJAX de DataTable:",
            error,
            thrown
          );
          showErrorToast("Error al cargar los datos de la tabla: " + thrown);
        },
      },
      columns: [
        {
          data: "imagen",
          orderable: false,
          className: "text-center",
          render: (data, type, row) => {
            const imgUrl = data
              ? data
              : getUrl("assets/img/equipos/componentes/default.png");
            return `<img src="${imgUrl}" class="componente-imagen-tabla" alt="${
              row.nombre || "Componente"
            }" style="cursor: pointer;" data-image-viewer>`;
          },
        },
        {
          data: "codigo",
          className: "align-middle",
        },
        {
          data: "nombre",
          className: "align-middle",
        },
        {
          data: "equipo_nombre",
          className: "align-middle",
        },
        {
          data: "marca",
          className: "align-middle",
        },
        {
          data: "estado",
          className: "align-middle text-center",
          render: (data) => {
            const claseEstado = obtenerClaseEstado(data);
            return `<span class="badge rounded-pill ${claseEstado}">${capitalizarPrimeraLetra(
              data
            )}</span>`;
          },
        },
        {
          // Columna de orómetro con barra de progreso
          data: null,
          className: "align-middle",
          render: (data, type, row) => {
            if (type === "display") {
              const orometroActual = parseFloat(row.orometro_actual) || 0;
              const proximoOrometro = parseFloat(row.proximo_orometro) || 0;
              const mantenimiento = parseFloat(row.mantenimiento) || 0;
              const unidad = row.tipo === "kilometros" ? "km" : "hrs";

              // Si no hay mantenimiento programado, solo mostrar el valor actual
              if (mantenimiento <= 0 || proximoOrometro <= 0) {
                return `<div class="small">${formatearNumero(
                  orometroActual
                )} ${unidad}</div>`;
              }

              // Calcular el progreso
              const avance = proximoOrometro - orometroActual;
              const porcentaje = Math.min(
                100,
                Math.max(0, ((mantenimiento - avance) / mantenimiento) * 100)
              );

              // Determinar el color según el porcentaje
              let colorClase = "bg-success";
              if (porcentaje >= 75) {
                colorClase = "bg-danger";
              } else if (porcentaje >= 50) {
                colorClase = "bg-warning";
              }

              // Crear la barra de progreso
              return `
                <div class="small mb-1 d-flex justify-content-between">
                  <span>${formatearNumero(orometroActual)} ${unidad}</span>
                  <span>${formatearNumero(proximoOrometro)} ${unidad}</span>
                </div>
                <div class="progress" style="height: 6px;" title="Faltan ${formatearNumero(
                  avance
                )} ${unidad} para el próximo mantenimiento">
                  <div class="progress-bar ${colorClase}" role="progressbar" style="width: ${porcentaje}%" 
                    aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="small mt-1 text-muted">
                  Mant. cada ${formatearNumero(mantenimiento)} ${unidad}
                </div>
              `;
            }
            return row.orometro_actual;
          },
        },
        {
          data: null,
          orderable: false,
          className: "text-center align-middle",
          render: (data) => {
            let acciones = '<div class="btn-group btn-group-sm">';
            acciones += `<button type="button" class="btn btn-info btn-accion btn-ver-componente" data-id="${data.id}" title="Ver detalles"><i class="bi bi-eye"></i></button>`;

            if (tienePermiso("componentes.editar")) {
              acciones += `<button type="button" class="btn btn-primary btn-accion btn-editar-componente" data-id="${data.id}" title="Editar"><i class="bi bi-pencil"></i></button>`;
            }

            if (tienePermiso("componentes.eliminar")) {
              acciones += `<button type="button" class="btn btn-danger btn-accion btn-eliminar-componente" data-id="${data.id}" title="Eliminar"><i class="bi bi-trash"></i></button>`;
            }

            acciones += "</div>";
            return acciones;
          },
        },
      ],
      order: [[0, "desc"]],
      language: {
        url: getUrl("assets/plugins/datatables/js/es-ES.json"),
        loadingRecords: "Cargando...",
        processing: "Procesando...",
        zeroRecords: "No se encontraron registros",
        emptyTable: "No hay datos disponibles en la tabla",
      },
      dom: '<"row mb-3"<"col-md-6"B><"col-md-6"f>>rt<"row mt-3"<"col-md-6"l><"col-md-6"p>>',
      buttons: [
        {
          extend: "copy",
          text: '<i class="bi bi-clipboard"></i> Copiar',
          className: "btn btn-sm btn-outline-secondary",
          exportOptions: {
            columns: ":not(:last-child)", // No exportar la columna de acciones
          },
        },
        {
          extend: "excel",
          text: '<i class="bi bi-file-earmark-excel"></i> Excel',
          className: "btn btn-sm btn-outline-success",
          exportOptions: {
            columns: ":not(:last-child)",
          },
        },
        {
          extend: "csv",
          text: '<i class="bi bi-filetype-csv"></i> CSV',
          className: "btn btn-sm btn-outline-info",
          exportOptions: {
            columns: ":not(:last-child)",
          },
        },
        {
          extend: "pdf",
          text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
          className: "btn btn-sm btn-outline-danger",
          exportOptions: {
            columns: ":not(:last-child)",
          },
        },
        {
          extend: "print",
          text: '<i class="bi bi-printer"></i> Imprimir',
          className: "btn btn-sm btn-outline-primary",
          exportOptions: {
            columns: ":not(:last-child)",
          },
        },
      ],
      lengthMenu: [
        [10, 25, 50, 100, -1],
        [10, 25, 50, 100, "Todos"],
      ],
      pageLength: 10,
      initComplete: function () {
        console.log("DataTable inicializado completamente");

        // Delegar eventos de imágenes para ImageViewer
        $("#componentes-table").on("click", "[data-image-viewer]", function () {
          const src = $(this).attr("src");
          const caption = $(this).attr("alt");
          if (typeof imageViewer !== "undefined") {
            imageViewer.show(src, caption);
          } else {
            showErrorToast("El visor de imágenes no está disponible");
          }
        });

        // Inicializar tooltips para las barras de progreso
        $('[data-bs-toggle="tooltip"], [title]').tooltip();
      },
      drawCallback: function () {
        // Reinicializar tooltips después de cada redibujado de la tabla
        $('[data-bs-toggle="tooltip"], [title]').tooltip();
      },
    });
  }

  // Función para capitalizar la primera letra
  function capitalizarPrimeraLetra(string) {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  // Función para formatear números
  function formatearNumero(numero) {
    if (numero === null || numero === undefined) return "0";
    return Number.parseFloat(numero)
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Función para obtener la clase del estado
  function obtenerClaseEstado(estado) {
    const clases = {
      activo: "bg-success",
      mantenimiento: "bg-warning",
      averiado: "bg-danger",
      vendido: "bg-secondary",
      descanso: "bg-info",
    };
    return clases[estado.toLowerCase()] || "bg-secondary";
  }

  // Inicializar validación del formulario
  function initFormValidation() {
    $("#form-componente").validate({
      rules: {
        codigo: {
          required: true,
          minlength: 2,
          maxlength: 50,
        },
        nombre: {
          required: true,
          minlength: 3,
          maxlength: 100,
        },
        equipo_id: {
          required: true,
        },
        tipo: {
          required: true,
        },
        estado: {
          required: true,
        },
        orometro_actual: {
          required: true,
          number: true,
          min: 0,
        },
        limite: {
          number: true,
          min: 0,
          max: 1000000,
        },
        notificacion: {
          number: true,
          min: 0,
          max: 1000,
        },
        mantenimiento: {
          number: true,
          min: 0,
        },
      },
      messages: {
        codigo: {
          required: "El código es obligatorio",
          minlength: "El código debe tener al menos 2 caracteres",
          maxlength: "El código no puede tener más de 50 caracteres",
        },
        nombre: {
          required: "El nombre es obligatorio",
          minlength: "El nombre debe tener al menos 3 caracteres",
          maxlength: "El nombre no puede tener más de 100 caracteres",
        },
        equipo_id: {
          required: "El equipo es obligatorio",
        },
        tipo: {
          required: "El tipo de medición es obligatorio",
        },
        estado: {
          required: "El estado es obligatorio",
        },
        orometro_actual: {
          required: "El orómetro actual es obligatorio",
          number: "Debe ser un número válido",
          min: "No puede ser negativo",
        },
        limite: {
          number: "Debe ser un número válido",
          min: "No puede ser negativo",
          max: "No puede ser mayor a 1,000,000",
        },
        notificacion: {
          number: "Debe ser un número válido",
          min: "No puede ser negativo",
          max: "No puede ser mayor a 1,000",
        },
        mantenimiento: {
          number: "Debe ser un número válido",
          min: "No puede ser negativo",
        },
      },
      errorElement: "div",
      errorPlacement: (error, element) => {
        error.addClass("invalid-feedback");
        element.closest(".form-group").append(error);
      },
      highlight: (element) => {
        $(element).addClass("is-invalid");
      },
      unhighlight: (element) => {
        $(element).removeClass("is-invalid");
      },
      submitHandler: (form) => {
        guardarComponente();
        return false;
      },
    });
  }

  // Inicializar componente de carga de imágenes
  function initImageUploader() {
    // Verificar si el contenedor existe
    if (document.getElementById("container-componente-imagen")) {
      // Inicializar el componente
      imageUploader = new ImageUpload("container-componente-imagen", {
        maxSize: 2 * 1024 * 1024, // 2MB
        acceptedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        inputName: "imagen",
        defaultImage: getUrl("assets/img/equipos/componentes/default.png"),
        existingImage: "",
        uploadPath: "assets/img/equipos/componentes/",
        position: "center", // Posicionar la cámara en el centro
      });
    }
  }

  // Actualizar unidades según el tipo seleccionado
  function actualizarUnidades() {
    const tipo = $("#componente-tipo").val();
    const unidad = tipo === "kilometros" ? "km" : "hrs";

    $("#unidad-orometro").text(`(${unidad})`);
    $("#unidad-limite").text(`(${unidad})`);
    $("#unidad-notificacion").text(`(${unidad})`);
    $("#unidad-mantenimiento").text(`(${unidad})`);
  }

  // Abrir modal para crear nuevo componente
  function abrirModalCrear() {
    // Limpiar formulario
    $("#form-componente")[0].reset();
    $("#componente-id").val("");

    // Actualizar título del modal
    $("#modal-componente-titulo").text("Nuevo Componente");

    // Inicializar componente de carga de imágenes con valores por defecto
    if (imageUploader) {
      // Reiniciar el componente con valores por defecto
      imageUploader = new ImageUpload("container-componente-imagen", {
        maxSize: 2 * 1024 * 1024,
        acceptedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        inputName: "imagen",
        defaultImage: getUrl("assets/img/equipos/componentes/default.png"),
        existingImage: "",
        uploadPath: "assets/img/equipos/componentes/",
        position: "center", // Posicionar la cámara en el centro
      });
    } else {
      // Inicializar si no existe
      initImageUploader();
    }

    // Actualizar unidades
    actualizarUnidades();

    // Mostrar modal
    const modalComponente = new bootstrap.Modal(
      document.getElementById("modal-componente")
    );
    modalComponente.show();

    // Resetear validación
    $("#form-componente").validate().resetForm();
    $("#form-componente .is-invalid").removeClass("is-invalid");

    // Resetear componente actual
    componenteActual = null;
  }

  // Abrir modal para editar componente
  function abrirModalEditar(id) {
    // Mostrar indicador de carga
    showLoadingOverlay();

    // Obtener datos del componente
    $.ajax({
      url: getUrl("api/equipos/componentes/obtener.php"),
      type: "GET",
      data: { id: id },
      dataType: "json",
      success: (response) => {
        // Ocultar indicador de carga
        hideLoadingOverlay();

        if (response.success && response.data) {
          const componente = response.data;
          componenteActual = componente;

          // Llenar formulario
          $("#componente-id").val(componente.id);
          $("#componente-codigo").val(componente.codigo);
          $("#componente-nombre").val(componente.nombre);
          $("#componente-equipo").val(componente.equipo_id);
          $("#componente-tipo").val(componente.tipo);
          $("#componente-marca").val(componente.marca);
          $("#componente-modelo").val(componente.modelo);
          $("#componente-serie").val(componente.numero_serie);
          $("#componente-estado").val(componente.estado);
          $("#componente-orometro").val(componente.orometro_actual);
          $("#componente-limite").val(componente.limite);
          $("#componente-notificacion").val(componente.notificacion);
          $("#componente-mantenimiento").val(componente.mantenimiento);
          $("#componente-observaciones").val(componente.observaciones);

          // Actualizar unidades
          actualizarUnidades();

          // Inicializar componente de carga de imágenes con la imagen existente
          if (imageUploader) {
            // Reiniciar el componente con la imagen existente
            imageUploader = new ImageUpload("container-componente-imagen", {
              maxSize: 2 * 1024 * 1024,
              acceptedTypes: [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
              ],
              inputName: "imagen",
              defaultImage: getUrl(
                "assets/img/equipos/componentes/default.png"
              ),
              existingImage: componente.imagen || "",
              uploadPath: "assets/img/equipos/componentes/",
              position: "center", // Posicionar la cámara en el centro
            });
          } else {
            // Inicializar si no existe
            initImageUploader();

            // Actualizar con la imagen existente
            if (imageUploader && componente.imagen) {
              imageUploader = new ImageUpload("container-componente-imagen", {
                maxSize: 2 * 1024 * 1024,
                acceptedTypes: [
                  "image/jpeg",
                  "image/png",
                  "image/gif",
                  "image/webp",
                ],
                inputName: "imagen",
                defaultImage: getUrl(
                  "assets/img/equipos/componentes/default.png"
                ),
                existingImage: componente.imagen,
                uploadPath: "assets/img/equipos/componentes/",
                position: "center", // Posicionar la cámara en el centro
              });
            }
          }

          // Actualizar título del modal
          $("#modal-componente-titulo").text("Editar Componente");

          // Mostrar modal
          const modalComponente = new bootstrap.Modal(
            document.getElementById("modal-componente")
          );
          modalComponente.show();

          // Resetear validación
          $("#form-componente").validate().resetForm();
          $("#form-componente .is-invalid").removeClass("is-invalid");
        } else {
          showErrorToast(
            response.message || "Error al obtener los datos del componente"
          );
        }
      },
      error: (xhr, status, error) => {
        // Ocultar indicador de carga
        hideLoadingOverlay();
        showErrorToast("Error de conexión al servidor");
        console.error("Error al obtener componente:", error);
      },
    });
  }

  // Guardar componente (crear o actualizar)
  function guardarComponente() {
    // Validar formulario
    if (!$("#form-componente").valid()) {
      return;
    }

    // Mostrar indicador de carga
    showLoadingOverlay();

    // Preparar datos del formulario
    const formData = new FormData(document.getElementById("form-componente"));

    // Enviar solicitud
    $.ajax({
      url: getUrl("api/equipos/componentes/guardar.php"),
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      dataType: "json",
      success: (response) => {
        // Ocultar indicador de carga
        hideLoadingOverlay();

        if (response.success) {
          // Cerrar modal
          const modalComponente = bootstrap.Modal.getInstance(
            document.getElementById("modal-componente")
          );
          modalComponente.hide();

          // Mostrar mensaje de éxito
          showSuccessToast(response.message);

          // Recargar tabla
          componentesTable.ajax.reload();
        } else {
          showErrorToast(response.message || "Error al guardar el componente");
        }
      },
      error: (xhr, status, error) => {
        // Ocultar indicador de carga
        hideLoadingOverlay();

        // Intentar parsear la respuesta JSON
        let errorMessage = "Error de conexión al servidor";
        try {
          const response = JSON.parse(xhr.responseText);
          if (response && response.message) {
            errorMessage = response.message;
          }
        } catch (e) {
          console.error("Error al parsear respuesta:", e);
        }

        showErrorToast(errorMessage);
        console.error("Error al guardar componente:", error);
      },
    });
  }

  // Ver detalles del componente
  function verDetalleComponente(id) {
    // Mostrar indicador de carga
    showLoadingOverlay();

    // Obtener datos del componente
    $.ajax({
      url: getUrl("api/equipos/componentes/obtener.php"),
      type: "GET",
      data: { id: id },
      dataType: "json",
      success: (response) => {
        // Ocultar indicador de carga
        hideLoadingOverlay();

        if (response.success && response.data) {
          const componente = response.data;
          componenteActual = componente;

          // Actualizar datos en el modal
          $("#detalle-nombre").text(componente.nombre);
          $("#detalle-codigo").text(componente.codigo || "-");
          $("#detalle-equipo").text(componente.equipo_nombre || "-");
          $("#detalle-tipo").text(
            capitalizarPrimeraLetra(componente.tipo) || "-"
          );
          $("#detalle-marca").text(componente.marca || "-");
          $("#detalle-modelo").text(componente.modelo || "-");
          $("#detalle-serie").text(componente.numero_serie || "-");

          // Determinar unidad según el tipo
          const unidad = componente.tipo === "kilometros" ? "km" : "hrs";

          $("#detalle-orometro").text(
            componente.orometro_actual
              ? formatearNumero(componente.orometro_actual) + " " + unidad
              : "0.00 " + unidad
          );
          $("#detalle-proximo-orometro").text(
            componente.proximo_orometro
              ? formatearNumero(componente.proximo_orometro) + " " + unidad
              : "-"
          );
          $("#detalle-limite").text(
            componente.limite
              ? formatearNumero(componente.limite) + " " + unidad
              : "-"
          );
          $("#detalle-notificacion").text(
            componente.notificacion
              ? formatearNumero(componente.notificacion) + " " + unidad
              : "-"
          );
          $("#detalle-mantenimiento").text(
            componente.mantenimiento
              ? formatearNumero(componente.mantenimiento) + " " + unidad
              : "-"
          );
          $("#detalle-observaciones").text(componente.observaciones || "-");

          // Actualizar imagen
          if (componente.imagen) {
            $("#detalle-imagen").attr("src", componente.imagen);
          } else {
            $("#detalle-imagen").attr(
              "src",
              getUrl("assets/img/equipos/componentes/default.png")
            );
          }

          // Actualizar estado
          const estadoClases = {
            activo: "bg-success",
            mantenimiento: "bg-warning text-dark",
            averiado: "bg-danger",
            vendido: "bg-secondary",
            descanso: "bg-info",
          };

          const estadoTexto = {
            activo: "Activo",
            mantenimiento: "Mantenimiento",
            averiado: "Averiado",
            vendido: "Vendido",
            descanso: "Descanso",
          };

          $("#detalle-estado").attr(
            "class",
            "badge rounded-pill " +
              (estadoClases[componente.estado] || "bg-secondary")
          );
          $("#detalle-estado").text(
            estadoTexto[componente.estado] || componente.estado
          );

          // Mostrar modal
          const modalDetalle = new bootstrap.Modal(
            document.getElementById("modal-detalle-componente")
          );
          modalDetalle.show();
        } else {
          showErrorToast(
            response.message || "Error al obtener los detalles del componente"
          );
        }
      },
      error: (xhr, status, error) => {
        // Ocultar indicador de carga
        hideLoadingOverlay();
        showErrorToast("Error de conexión al servidor");
        console.error("Error al obtener detalles del componente:", error);
      },
    });
  }

  // Eliminar componente
  function eliminarComponente(id) {
    // Mostrar modal de confirmación
    const modalConfirmar = new bootstrap.Modal(
      document.getElementById("modal-confirmar-eliminar")
    );
    modalConfirmar.show();

    // Configurar botón de confirmación
    $("#btn-confirmar-eliminar")
      .off("click")
      .on("click", () => {
        // Ocultar modal de confirmación
        modalConfirmar.hide();

        // Mostrar indicador de carga
        showLoadingOverlay();

        // Enviar solicitud
        $.ajax({
          url: getUrl("api/equipos/componentes/eliminar.php"),
          type: "POST",
          data: { id: id },
          dataType: "json",
          success: (response) => {
            // Ocultar indicador de carga
            hideLoadingOverlay();

            if (response.success) {
              // Mostrar mensaje de éxito
              showSuccessToast(response.message);

              // Recargar tabla
              componentesTable.ajax.reload();
            } else {
              // Mostrar mensaje de error
              showErrorToast(response.message);
            }
          },
          error: (xhr, status, error) => {
            // Ocultar indicador de carga
            hideLoadingOverlay();
            showErrorToast("Error de conexión al servidor");
            console.error("Error al eliminar componente:", error);
          },
        });
      });
  }

  // Aplicar filtros
  function aplicarFiltros() {
    // Obtener valores de filtros
    const equipo_id = $("#filtro-equipo").val();
    const estado = $("#filtro-estado").val();

    // Actualizar filtros activos
    filtrosActivos = {};
    if (equipo_id) filtrosActivos.equipo_id = equipo_id;
    if (estado) filtrosActivos.estado = estado;

    // Recargar tabla
    componentesTable.ajax.reload();
  }

  // Limpiar filtros
  function limpiarFiltros() {
    // Restablecer valores de filtros
    $("#filtro-equipo").val("");
    $("#filtro-estado").val("");

    // Limpiar filtros activos
    filtrosActivos = {};

    // Recargar tabla
    componentesTable.ajax.reload();
  }

  // Mostrar indicador de carga
  function showLoadingOverlay() {
    // Si existe un componente de carga, usarlo
    if (typeof showLoading === "function") {
      showLoading();
    }
  }

  // Ocultar indicador de carga
  function hideLoadingOverlay() {
    // Si existe un componente de carga, usarlo
    if (typeof hideLoading === "function") {
      hideLoading();
    }
  }

  // Verificar si el usuario tiene un permiso específico
  function tienePermiso(permiso) {
    // Si existe la función global, usarla
    if (typeof window.tienePermiso === "function") {
      return window.tienePermiso(permiso);
    }

    // Si no existe, verificar si el botón correspondiente está presente en el DOM
    if (permiso === "componentes.crear") {
      return $("#btn-nuevo-componente").length > 0;
    } else if (permiso === "componentes.editar") {
      return $("#btn-editar-desde-detalle").length > 0;
    } else if (permiso === "componentes.eliminar") {
      return true; // Por defecto permitir eliminar
    }

    return false;
  }

  // Inicializar componentes
  initDataTable();
  initFormValidation();
  initImageUploader();

  // Event Listeners
  // Botón para crear nuevo componente
  $("#btn-nuevo-componente").on("click", () => {
    abrirModalCrear();
  });

  // Botón para guardar componente
  $("#btn-guardar-componente").on("click", () => {
    $("#form-componente").submit();
  });

  // Botón para ver detalles del componente
  $("#componentes-table").on("click", ".btn-ver-componente", function () {
    const id = $(this).data("id");
    verDetalleComponente(id);
  });

  // Botón para editar componente
  $("#componentes-table").on("click", ".btn-editar-componente", function () {
    const id = $(this).data("id");
    abrirModalEditar(id);
  });

  // Botón para eliminar componente
  $("#componentes-table").on("click", ".btn-eliminar-componente", function () {
    const id = $(this).data("id");
    eliminarComponente(id);
  });

  // Botón para editar desde el modal de detalles
  $("#btn-editar-desde-detalle").on("click", () => {
    // Cerrar modal de detalles
    const modalDetalle = bootstrap.Modal.getInstance(
      document.getElementById("modal-detalle-componente")
    );
    modalDetalle.hide();

    // Abrir modal de edición
    if (componenteActual && componenteActual.id) {
      setTimeout(() => {
        abrirModalEditar(componenteActual.id);
      }, 500);
    }
  });

  // Botón para ver imagen ampliada
  $("#btn-ver-imagen").on("click", () => {
    const imagen = $("#detalle-imagen").attr("src");
    if (imagen && typeof imageViewer !== "undefined") {
      imageViewer.show(imagen, "Imagen del componente");
    }
  });

  // Botones de filtros
  $("#btn-aplicar-filtros").on("click", () => {
    aplicarFiltros();
  });

  $("#btn-limpiar-filtros").on("click", () => {
    limpiarFiltros();
  });

  // Cambio en el tipo de componente para actualizar unidades
  $("#componente-tipo").on("change", () => {
    actualizarUnidades();
  });

  // Inicializar tooltips
  const tooltips = document.querySelectorAll("[title]");
  tooltips.forEach((tooltip) => {
    new bootstrap.Tooltip(tooltip);
  });
});
