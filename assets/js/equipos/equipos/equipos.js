/**
 * Módulo de Gestión de Equipos
 */
let equiposTable;

// Función para obtener la URL de los assets
function getAssetUrl(path) {
  const baseUrl = window.location.origin + "/SIGESMANV1/";
  return baseUrl + path;
}

// Función para capitalizar la primera letra
function capitalizarPrimeraLetra(string) {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// Función para formatear números
function formatearNumero(numero) {
  if (numero === null || numero === undefined) return "0";
  return parseFloat(numero)
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

// Verificar si tiene permiso
function tienePermiso(permiso) {
  return window.permisos && window.permisos.includes(permiso);
}

// Función para resetear el componente de carga de imagen
function resetImageUpload(previewId) {
  const preview = document.getElementById(`preview-${previewId}`);
  const input = document.getElementById(`input-${previewId}`);
  const existingInput = document.getElementById(`existing-${previewId}`);
  const removeBtn = document.querySelector(
    `#container-${previewId} [data-action="remove"]`
  );

  if (preview) {
    preview.src = getAssetUrl("assets/img/equipos/equipos/default.png");
  }
  if (input) {
    input.value = "";
  }
  if (existingInput) {
    existingInput.value = "";
  }
  if (removeBtn) {
    removeBtn.style.display = "none";
  }
}

// Función para establecer una imagen en el componente de carga
function setImageUpload(previewId, imageUrl) {
  const preview = document.getElementById(`preview-${previewId}`);
  const existingInput = document.getElementById(`existing-${previewId}`);
  const removeBtn = document.querySelector(
    `#container-${previewId} [data-action="remove"]`
  );

  if (preview) {
    preview.src =
      imageUrl || getAssetUrl("assets/img/equipos/equipos/default.png");
  }
  if (existingInput) {
    existingInput.value = imageUrl || "";
  }
  if (removeBtn) {
    removeBtn.style.display = imageUrl ? "flex" : "none";
  }
}

// Función para inicializar la DataTable
function inicializarDataTable() {
  console.log("Inicializando DataTable...");
  if (!$.fn.DataTable) {
    console.error("DataTables no está disponible");
    showErrorToast("Error al cargar la tabla: DataTables no disponible");
    return;
  }

  try {
    equiposTable = $("#equipos-table").DataTable({
      processing: true,
      serverSide: true,
      responsive: true,
      ajax: {
        url: getAssetUrl("api/equipos/equipos/listar.php"),
        type: "POST",
        xhrFields: {
          withCredentials: true,
        },
        data: function (d) {
          d.estado = $("#filtro-estado").val();
          return d;
        },
        error: function (xhr, error, thrown) {
          console.error(
            "Error en la solicitud AJAX de DataTable:",
            error,
            thrown
          );
          showErrorToast("Error al cargar los datos de la tabla: " + thrown);
          $("#equipos-table tbody").html(
            '<tr><td colspan="9" class="text-center text-danger">Error al cargar los datos. Intente nuevamente.</td></tr>'
          );
          ajax.hideLoader();
        },
      },
      columns: [
        {
          data: "imagen",
          orderable: false,
          className: "text-center",
          render: function (data, type, row) {
            const imgSrc =
              data || getAssetUrl("assets/img/equipos/equipos/default.png");
            return `<img src="${imgSrc}" class="equipo-imagen-tabla" alt="${
              row.nombre || "Equipo"
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
          data: "tipo_equipo",
          className: "align-middle",
          render: function (data) {
            return capitalizarPrimeraLetra(data);
          },
        },
        {
          data: null,
          className: "align-middle",
          render: function (data) {
            let marcaModelo = "";
            if (data.marca) marcaModelo += data.marca;
            if (data.marca && data.modelo) marcaModelo += " / ";
            if (data.modelo) marcaModelo += data.modelo;
            return marcaModelo || "-";
          },
        },
        {
          data: "estado",
          className: "align-middle text-center",
          render: function (data) {
            const claseEstado = obtenerClaseEstado(data);
            return `<span class="badge rounded-pill ${claseEstado}">${capitalizarPrimeraLetra(
              data
            )}</span>`;
          },
        },
        {
          data: "orometro_actual",
          className: "align-middle text-end",
          render: function (data) {
            return formatearNumero(data) + " hrs";
          },
        },
        {
          data: "ubicacion",
          className: "align-middle",
        },
        {
          data: null,
          orderable: false,
          className: "text-center align-middle",
          render: function (data) {
            let acciones = '<div class="btn-group btn-group-sm">';
            acciones += `<button type="button" class="btn btn-info btn-accion btn-ver-equipo" data-id="${data.id}" title="Ver detalles"><i class="bi bi-eye"></i></button>`;
            if (tienePermiso("equipos.editar")) {
              acciones += `<button type="button" class="btn btn-primary btn-accion btn-editar-equipo" data-id="${data.id}" title="Editar"><i class="bi bi-pencil"></i></button>`;
            }
            if (tienePermiso("equipos.eliminar")) {
              acciones += `<button type="button" class="btn btn-danger btn-accion btn-eliminar-equipo" data-id="${data.id}" title="Eliminar"><i class="bi bi-trash"></i></button>`;
            }
            acciones += "</div>";
            return acciones;
          },
        },
      ],
      order: [[2, "asc"]],
      language: {
        url: getAssetUrl("assets/plugins/datatables/js/es-ES.json"),
        loadingRecords: "Cargando...",
        processing: "Procesando...",
        zeroRecords: "No se encontraron registros",
        emptyTable: "No hay datos disponibles en la tabla",
      },
      dom: '<"d-flex justify-content-between align-items-center mb-3"<"d-flex align-items-center"l><"d-flex"f>>t<"d-flex justify-content-between align-items-center mt-3"<"d-flex align-items-center"i><"d-flex"p>>',
      buttons: [
        {
          extend: "copy",
          text: '<i class="bi bi-clipboard"></i> Copiar',
          className: "btn btn-sm btn-outline-secondary",
        },
        {
          extend: "excel",
          text: '<i class="bi bi-file-earmark-excel"></i> Excel',
          className: "btn btn-sm btn-outline-success",
        },
        {
          extend: "csv",
          text: '<i class="bi bi-filetype-csv"></i> CSV',
          className: "btn btn-sm btn-outline-info",
        },
        {
          extend: "pdf",
          text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
          className: "btn btn-sm btn-outline-danger",
        },
        {
          extend: "print",
          text: '<i class="bi bi-printer"></i> Imprimir',
          className: "btn btn-sm btn-outline-primary",
        },
      ],
      lengthMenu: [
        [10, 25, 50, 100, -1],
        [10, 25, 50, 100, "Todos"],
      ],
      pageLength: 25,
      initComplete: function () {
        console.log("DataTable inicializado completamente");
        this.api()
          .buttons()
          .container()
          .appendTo("#equipos-table_wrapper .col-md-6:eq(0)");
        // Delegar eventos de imágenes para ImageViewer
        $("#equipos-table").on("click", "[data-image-viewer]", function () {
          const src = $(this).attr("src");
          const caption = $(this).attr("alt");
          if (typeof imageViewer !== "undefined") {
            imageViewer.show(src, caption);
          } else {
            showErrorToast("El visor de imágenes no está disponible");
          }
        });
      },
    });
  } catch (error) {
    console.error("Error al inicializar DataTable:", error);
    showErrorToast("Error al inicializar la tabla: " + error.message);
    ajax.hideLoader();
  }
}

// Función para inicializar los eventos
function inicializarEventos() {
  console.log("Inicializando eventos...");

  $("#btn-nuevo-equipo").on("click", function () {
    console.log("Click en botón nuevo equipo");
    abrirModalCrear();
  });

  $("#btn-aplicar-filtros").on("click", function () {
    console.log("Click en botón aplicar filtros");
    if (equiposTable) {
      equiposTable.ajax.reload();
    }
  });

  $("#btn-limpiar-filtros").on("click", function () {
    console.log("Click en botón limpiar filtros");
    $("#filtro-estado").val("");
    if (equiposTable) {
      equiposTable.ajax.reload();
    }
  });

  $("#btn-guardar-equipo").on("click", function () {
    console.log("Click en guardar equipo");
    guardarEquipo();
  });

  $("#btn-confirmar-eliminar").on("click", function () {
    console.log("Click en confirmar eliminar");
    eliminarEquipo();
  });

  $("#btn-ver-imagen").on("click", function () {
    console.log("Click en ver imagen");
    const src = $("#detalle-imagen").attr("src");
    const caption = $("#detalle-nombre").text();
    if (src && typeof imageViewer !== "undefined") {
      imageViewer.show(src, caption);
    } else {
      showErrorToast("No se puede abrir la imagen");
    }
  });

  $("#btn-editar-desde-detalle").on("click", function () {
    console.log("Click en editar desde detalle");
    const id = $("#equipo-id").val();
    if (id) {
      abrirModalEditar(id);
    } else {
      showErrorToast("No se encontró el ID del equipo");
    }
  });

  // Delegación de eventos para botones en filas de la tabla
  $("#equipos-table").on("click", ".btn-ver-equipo", function () {
    const id = $(this).data("id");
    console.log("Click en ver equipo:", id);
    verDetalleEquipo(id);
  });

  $("#equipos-table").on("click", ".btn-editar-equipo", function () {
    const id = $(this).data("id");
    console.log("Click en editar equipo:", id);
    abrirModalEditar(id);
  });

  $("#equipos-table").on("click", ".btn-eliminar-equipo", function () {
    const id = $(this).data("id");
    console.log("Click en eliminar equipo:", id);
    confirmarEliminar(id);
  });
}

// Función para inicializar la validación del formulario
function inicializarValidacion() {
  console.log("Inicializando validación...");
  if (!$.fn.validate) {
    console.error("jQuery Validate no está disponible");
    showErrorToast("Error: Validación de formularios no disponible");
    return;
  }

  $("#form-equipo").validate({
    rules: {
      codigo: {
        required: true,
        minlength: 3,
        maxlength: 50,
      },
      nombre: {
        required: true,
        minlength: 3,
        maxlength: 100,
      },
      categoria_id: {
        required: true,
      },
      tipo_equipo: {
        required: true,
      },
      estado: {
        required: true,
      },
      orometro_actual: {
        number: true,
        min: 0,
      },
      limite: {
        number: true,
        min: 0,
      },
      notificacion: {
        number: true,
        min: 0,
      },
      mantenimiento: {
        number: true,
        min: 0,
      },
    },
    messages: {
      codigo: {
        required: "Por favor, ingrese el código del equipo",
        minlength: "El código debe tener al menos 3 caracteres",
        maxlength: "El código no puede exceder los 50 caracteres",
      },
      nombre: {
        required: "Por favor, ingrese el nombre del equipo",
        minlength: "El nombre debe tener al menos 3 caracteres",
        maxlength: "El nombre no puede exceder los 100 caracteres",
      },
      categoria_id: {
        required: "Por favor, seleccione una categoría",
      },
      tipo_equipo: {
        required: "Por favor, seleccione el tipo de equipo",
      },
      estado: {
        required: "Por favor, seleccione el estado del equipo",
      },
      orometro_actual: {
        number: "Por favor, ingrese un número válido",
        min: "El orómetro no puede ser negativo",
      },
      limite: {
        number: "Por favor, ingrese un número válido",
        min: "El límite no puede ser negativo",
      },
      notificacion: {
        number: "Por favor, ingrese un número válido",
        min: "La notificación no puede ser negativa",
      },
      mantenimiento: {
        number: "Por favor, ingrese un número válido",
        min: "El mantenimiento no puede ser negativo",
      },
    },
    errorPlacement: function (error, element) {
      error.addClass("invalid-feedback small");
      element.closest(".form-group").append(error);
    },
    highlight: function (element) {
      $(element).addClass("is-invalid").removeClass("is-valid");
    },
    unhighlight: function (element) {
      $(element).removeClass("is-invalid").addClass("is-valid");
    },
  });
}

// Función para abrir el modal de creación
function abrirModalCrear() {
  console.log("Abriendo modal para crear equipo...");
  $("#form-equipo")[0].reset();
  $("#equipo-id").val("");
  $("#modal-equipo-titulo").text("Nuevo Equipo");
  resetImageUpload("equipo-imagen");
  $("#form-equipo").validate().resetForm();
  $("#form-equipo")
    .find(".is-valid, .is-invalid")
    .removeClass("is-valid is-invalid");
  $("#modal-equipo")
    .modal({ backdrop: "static", keyboard: false })
    .modal("show");
}

// Función para abrir el modal de edición
function abrirModalEditar(id) {
  console.log("Abriendo modal para editar equipo:", id);
  ajax.get(
    getAssetUrl("api/equipos/equipos/obtener.php"),
    { id: id },
    function (response) {
      if (response.success) {
        const equipo = response.data;
        $("#equipo-id").val(equipo.id);
        $("#equipo-codigo").val(equipo.codigo);
        $("#equipo-nombre").val(equipo.nombre);
        $("#equipo-categoria").val(equipo.categoria_id);
        $("#equipo-tipo").val(equipo.tipo_equipo);
        $("#equipo-marca").val(equipo.marca);
        $("#equipo-modelo").val(equipo.modelo);
        $("#equipo-serie").val(equipo.numero_serie);
        $("#equipo-capacidad").val(equipo.capacidad);
        $("#equipo-fase").val(equipo.fase);
        $("#equipo-linea").val(equipo.linea_electrica);
        $("#equipo-ubicacion").val(equipo.ubicacion);
        $("#equipo-estado").val(equipo.estado);
        $("#equipo-orometro").val(equipo.orometro_actual);
        $("#equipo-limite").val(equipo.limite);
        $("#equipo-notificacion").val(equipo.notificacion);
        $("#equipo-mantenimiento").val(equipo.mantenimiento);
        $("#equipo-observaciones").val(equipo.observaciones);
        if (equipo.imagen) {
          setImageUpload("equipo-imagen", equipo.imagen);
        } else {
          resetImageUpload("equipo-imagen");
        }
        $("#modal-equipo-titulo").text("Editar Equipo");
        $("#modal-equipo")
          .modal({ backdrop: "static", keyboard: false })
          .modal("show");
        $("#form-equipo").validate().resetForm();
        $("#form-equipo")
          .find(".is-valid, .is-invalid")
          .removeClass("is-valid is-invalid");
      } else {
        showErrorToast(
          "Error al cargar los datos del equipo: " +
            (response.message || "Respuesta inválida del servidor")
        );
        ajax.hideLoader();
      }
    },
    {
      error: function (xhr, response) {
        console.error("Error en AJAX para editar equipo:", response, xhr);
        showErrorToast(
          "Error al cargar los datos del equipo: " +
            (response.error || "No se pudo conectar al servidor")
        );
        ajax.hideLoader();
      },
      showErrors: false,
    }
  );
}

// Función para guardar el equipo
function guardarEquipo() {
  console.log("Guardando equipo...");
  if (!$("#form-equipo").valid()) {
    console.log("Formulario no válido");
    showErrorToast("Por favor, complete correctamente el formulario");
    return;
  }

  const form = document.getElementById("form-equipo");
  ajax.submitForm(
    form,
    function (response) {
      if (response.success) {
        showSuccessToast(response.message || "Equipo guardado correctamente");
        $("#modal-equipo").modal("hide");
        equiposTable.ajax.reload();
      } else {
        showErrorToast(
          "Error al guardar el equipo: " +
            (response.message || "Respuesta inválida del servidor")
        );
      }
    },
    {
      error: function (xhr, response) {
        console.error("Error en AJAX para guardar equipo:", response, xhr);
        showErrorToast(
          "Error al guardar el equipo: " +
            (response.error || "No se pudo conectar al servidor")
        );
      },
      showErrors: false,
    }
  );
}

// Función para confirmar la eliminación
function confirmarEliminar(id) {
  console.log("Confirmando eliminación del equipo:", id);
  $("#equipo-id").val(id);
  $("#modal-confirmar-eliminar").modal("show");
}

// Función para eliminar el equipo
function eliminarEquipo() {
  const id = $("#equipo-id").val();
  console.log("Eliminando equipo:", id);
  ajax.post(
    getAssetUrl("api/equipos/equipos/eliminar.php"),
    { id: id },
    function (response) {
      if (response.success) {
        showSuccessToast(response.message || "Equipo eliminado correctamente");
        $("#modal-confirmar-eliminar").modal("hide");
        equiposTable.ajax.reload();
      } else {
        showErrorToast(
          "Error al eliminar el equipo: " +
            (response.message || "Respuesta inválida del servidor")
        );
      }
    },
    {
      error: function (xhr, response) {
        console.error("Error en AJAX para eliminar equipo:", response, xhr);
        showErrorToast(
          "Error al eliminar el equipo: " +
            (response.error || "No se pudo conectar al servidor")
        );
      },
      showErrors: false,
    }
  );
}

// Función para ver los detalles del equipo
function verDetalleEquipo(id) {
  console.log("Viendo detalles del equipo:", id);
  ajax.get(
    getAssetUrl("api/equipos/equipos/obtener.php"),
    { id: id },
    function (response) {
      if (response.success && response.data) {
        const equipo = response.data;
        $("#equipo-id").val(equipo.id);
        $("#detalle-nombre").text(equipo.nombre || "-");
        $("#detalle-codigo").text(equipo.codigo || "-");
        $("#detalle-categoria").text(equipo.categoria_nombre || "-");
        $("#detalle-tipo").text(
          capitalizarPrimeraLetra(equipo.tipo_equipo) || "-"
        );
        $("#detalle-marca").text(equipo.marca || "-");
        $("#detalle-modelo").text(equipo.modelo || "-");
        $("#detalle-serie").text(equipo.numero_serie || "-");
        $("#detalle-capacidad").text(equipo.capacidad || "-");
        $("#detalle-fase").text(equipo.fase || "-");
        $("#detalle-linea").text(equipo.linea_electrica || "-");
        $("#detalle-ubicacion").text(equipo.ubicacion || "-");
        $("#detalle-orometro").text(
          formatearNumero(equipo.orometro_actual) + " hrs" || "-"
        );
        $("#detalle-proximo-orometro").text(
          equipo.limite ? formatearNumero(equipo.limite) + " hrs" : "-"
        );
        $("#detalle-limite").text(
          equipo.limite ? formatearNumero(equipo.limite) + " hrs" : "-"
        );
        $("#detalle-notificacion").text(
          equipo.notificacion
            ? formatearNumero(equipo.notificacion) + " hrs"
            : "-"
        );
        $("#detalle-mantenimiento").text(
          equipo.mantenimiento
            ? formatearNumero(equipo.mantenimiento) + " hrs"
            : "-"
        );
        $("#detalle-observaciones").text(equipo.observaciones || "-");
        $("#detalle-imagen").attr(
          "src",
          equipo.imagen || getAssetUrl("assets/img/equipos/equipos/default.png")
        );
        $("#detalle-estado")
          .text(capitalizarPrimeraLetra(equipo.estado))
          .removeClass()
          .addClass("badge rounded-pill " + obtenerClaseEstado(equipo.estado));

        // Cargar componentes asociados
        ajax.get(
          getAssetUrl("api/equipos/componentes/listar.php"),
          { equipo_id: id },
          function (compResponse) {
            const componentes = compResponse.data || [];
            const tbody = $("#componentes-body");
            tbody.empty();
            if (componentes.length > 0) {
              $("#sin-componentes").addClass("d-none");
              componentes.forEach(function (comp) {
                const proximoMant = comp.limite
                  ? formatearNumero(comp.limite) + " hrs"
                  : "-";
                tbody.append(`
                                    <tr>
                                        <td>${comp.codigo || "-"}</td>
                                        <td>${comp.nombre || "-"}</td>
                                        <td>${
                                          capitalizarPrimeraLetra(
                                            comp.tipo_componente
                                          ) || "-"
                                        }</td>
                                        <td><span class="badge rounded-pill ${obtenerClaseEstado(
                                          comp.estado
                                        )}">${capitalizarPrimeraLetra(comp.estado)}</span></td>
                                        <td class="text-end">${
                                          formatearNumero(
                                            comp.orometro_actual
                                          ) || "0"
                                        } hrs</td>
                                        <td class="text-end">${proximoMant}</td>
                                    </tr>
                                `);
              });
            } else {
              $("#sin-componentes").removeClass("d-none");
            }
            $("#modal-detalle-equipo")
              .modal({ backdrop: "static", keyboard: false })
              .modal("show");
          },
          {
            error: function (xhr, response) {
              console.error("Error en AJAX para componentes:", response, xhr);
              $("#sin-componentes").removeClass("d-none");
              showErrorToast(
                "Error al cargar los componentes: " +
                  (response.error || "No se pudo conectar al servidor")
              );
              $("#modal-detalle-equipo").modal("show");
            },
            showErrors: false,
          }
        );
      } else {
        showErrorToast(
          "Error al cargar los datos del equipo: " +
            (response.message || "Respuesta inválida del servidor")
        );
        ajax.hideLoader();
      }
    },
    {
      error: function (xhr, response) {
        console.error("Error en AJAX para detalles del equipo:", response, xhr);
        showErrorToast(
          "Error al cargar los datos del equipo: " +
            (response.error || "No se pudo conectar al servidor")
        );
        ajax.hideLoader();
      },
      showErrors: false,
    }
  );
}

// Inicializar todo cuando el documento esté listo
$(document).ready(function () {
  console.log("Documento listo, inicializando módulo de equipos...");
  inicializarDataTable();
  inicializarEventos();
  inicializarValidacion();
});
