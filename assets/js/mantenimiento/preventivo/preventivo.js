/**
 * Módulo de Mantenimiento Preventivo - JavaScript
 * SIGESMANV1
 */

// Variables globales
let mantenimientosTable;
let mantenimientoSeleccionado = null;
let filtrosAplicados = {
  estado: "pendiente", // Por defecto mostrar solo pendientes
};

// Constantes
const UNIDADES_OROMETRO = {
  horas: "hrs",
  kilometros: "km",
};

// Declaración de variables globales
const $ = jQuery;
const bootstrap = window.bootstrap;
// Verificar si las variables ya están definidas en el objeto window
if (!window.showErrorToast)
  window.showErrorToast = (msg) => {
    console.error(msg);
  };
if (!window.showSuccessToast)
  window.showSuccessToast = (msg) => {
    console.log(msg);
  };
if (!window.showInfoToast)
  window.showInfoToast = (msg) => {
    console.log(msg);
  };
if (!window.showLoading) window.showLoading = () => {};
if (!window.hideLoading) window.hideLoading = () => {};

// Inicialización cuando el DOM está listo
$(document).ready(function () {
  // Inicializar datepickers
  inicializarDatepickers();

  // Verificar mantenimientos preventivos al cargar la página
  verificarMantenimientosPreventivos();

  // Configurar eventos
  configurarEventos();
});

/**
 * Inicializa los datepickers
 */
function inicializarDatepickers() {
  try {
    const datepickers = document.querySelectorAll(".datepicker");
    datepickers.forEach(function (el) {
      new Datepicker(el, {
        language: "es",
        format: "dd/mm/yyyy",
        autohide: true,
      });
    });
  } catch (error) {
    console.error("Error al inicializar datepickers:", error);
  }
}

/**
 * Configura los eventos de la página
 */
function configurarEventos() {
  // Botón para verificar mantenimientos
  $("#btn-verificar-mantenimientos").on("click", function () {
    verificarMantenimientosPreventivos();
  });

  // Botón para aplicar filtros
  $("#btn-aplicar-filtros").on("click", function () {
    aplicarFiltros();
  });

  // Botón para limpiar filtros
  $("#btn-limpiar-filtros").on("click", function () {
    limpiarFiltros();
  });

  // Botón para completar mantenimiento
  $("#btn-guardar-completar").on("click", function () {
    guardarCompletarMantenimiento();
  });

  // Botón para crear registros faltantes
  $("#btn-crear-faltantes").on("click", function () {
    crearRegistrosFaltantes();
  });

  // Botón para ignorar faltantes
  $("#btn-ignorar-faltantes").on("click", function () {
    $("#verificacion-resultados").slideUp();
  });
}

/**
 * Verifica y genera mantenimientos preventivos si es necesario
 */
function verificarMantenimientosPreventivos() {
  // Mostrar indicador de carga
  mostrarCargando();

  // Mostrar mensaje de verificación
  $("#verificacion-container").show();
  $("#verificacion-resultados").hide();
  $("#todo-actualizado").hide();

  // Verificar mantenimientos faltantes
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/generar.php"),
    type: "GET",
    dataType: "json",
    success: function (response) {
      if (response.success) {
        const equiposFaltantes = response.equipos_faltantes || 0;
        const componentesFaltantes = response.componentes_faltantes || 0;
        const totalFaltantes = equiposFaltantes + componentesFaltantes;

        // Ocultar contenedor de verificación
        $("#verificacion-container").hide();

        if (totalFaltantes > 0) {
          // Mostrar mensaje de faltantes
          let mensaje = `Se encontraron ${totalFaltantes} registros sin mantenimientos preventivos programados`;
          if (equiposFaltantes > 0 && componentesFaltantes > 0) {
            mensaje += ` (${equiposFaltantes} equipos y ${componentesFaltantes} componentes)`;
          } else if (equiposFaltantes > 0) {
            mensaje += ` (${equiposFaltantes} equipos)`;
          } else {
            mensaje += ` (${componentesFaltantes} componentes)`;
          }
          mensaje += ".";

          $("#verificacion-mensaje").text(mensaje);
          $("#verificacion-resultados").slideDown();
        } else {
          // Mostrar mensaje de todo actualizado
          $("#todo-actualizado").slideDown();
          setTimeout(function () {
            $("#todo-actualizado").slideUp();
          }, 5000); // Ocultar después de 5 segundos
        }

        // Inicializar tabla
        inicializarTabla();
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al verificar mantenimientos preventivos"
        );
        // Inicializar tabla de todos modos para mostrar datos existentes
        inicializarTabla();
        $("#verificacion-container").hide();
      }
    },
    error: function (xhr, status, error) {
      console.error("Error en la solicitud AJAX:", xhr.responseText);

      // Mostrar mensaje de error
      mostrarToast(
        "error",
        "Error",
        "No se pudo verificar los mantenimientos preventivos"
      );

      // Inicializar tabla de todos modos para mostrar datos existentes
      inicializarTabla();
      $("#verificacion-container").hide();
    },
    complete: function () {
      // Ocultar indicador de carga
      ocultarCargando();
    },
  });
}

/**
 * Crea los registros de mantenimiento faltantes
 */
function crearRegistrosFaltantes() {
  // Mostrar indicador de carga
  mostrarCargando();

  // Mostrar mensaje de verificación
  $("#verificacion-resultados").hide();
  $("#verificacion-container").show();

  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/generar.php"),
    type: "POST",
    dataType: "json",
    success: function (response) {
      if (response.success) {
        const totalGenerados = response.total_generados || 0;

        if (totalGenerados > 0) {
          mostrarToast(
            "success",
            "Mantenimientos Generados",
            `Se han generado ${totalGenerados} nuevos mantenimientos preventivos (${response.equipos_generados} equipos, ${response.componentes_generados} componentes)`
          );

          // Verificar nuevamente para asegurarse de que todo esté completo
          verificarMantenimientosPreventivos();
        } else {
          mostrarToast(
            "info",
            "Información",
            "No se requiere generar nuevos mantenimientos preventivos"
          );
          $("#verificacion-container").hide();

          // Mostrar mensaje de todo actualizado
          $("#todo-actualizado").slideDown();
          setTimeout(function () {
            $("#todo-actualizado").slideUp();
          }, 5000); // Ocultar después de 5 segundos
        }

        // Recargar tabla
        mantenimientosTable.ajax.reload();
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al generar mantenimientos preventivos"
        );
        $("#verificacion-container").hide();
      }
    },
    error: function (xhr, status, error) {
      console.error("Error en la solicitud AJAX:", xhr.responseText);

      mostrarToast(
        "error",
        "Error",
        "Error al generar mantenimientos preventivos"
      );

      $("#verificacion-container").hide();
    },
    complete: function () {
      // Ocultar indicador de carga
      ocultarCargando();
    },
  });
}

/**
 * Inicializa la tabla de mantenimientos
 */
function inicializarTabla() {
  // Destruir tabla si ya existe
  if (mantenimientosTable) {
    mantenimientosTable.destroy();
  }

  // Inicializar DataTable
  mantenimientosTable = $("#mantenimientos-table").DataTable({
    processing: true,
    serverSide: true,
    responsive: true,
    ajax: {
      url: getUrl("api/mantenimiento/preventivo/listar.php"),
      type: "POST",
      data: function (d) {
        // Si se selecciona "Todos", usar un valor grande pero finito en lugar de -1
        if (d.length == -1) {
          d.length = 10000; // Un número grande pero manejable
        }

        // Agregar filtros activos
        return {
          ...d,
          ...filtrosAplicados,
        };
      },
      error: function (xhr, error, thrown) {
        console.error(
          "Error en la solicitud AJAX de DataTable:",
          error,
          thrown
        );
        if (window.showErrorToast) {
          window.showErrorToast(
            "Error al cargar los datos de la tabla: " + thrown
          );
        }
      },
    },
    columns: [
      {
        data: "fecha_formateada",
        render: function (data, type, row) {
          if (type === "display") {
            let html = data;
            if (row.dias_restantes !== null) {
              const diasTexto =
                row.dias_restantes >= 0
                  ? `Faltan ${row.dias_restantes} días`
                  : `Hace ${Math.abs(row.dias_restantes)} días`;

              html += `<br><small class="${row.dias_restantes_clase}">${diasTexto}</small>`;
            }
            return html;
          }
          return data;
        },
      },
      {
        data: "tipo",
        render: function (data, type, row) {
          if (type === "display") {
            return data === "equipo" ? "Equipo" : "Componente";
          }
          return data;
        },
      },
      { data: "codigo_equipo" },
      { data: "nombre_equipo" },
      {
        data: "orometro_actual",
        render: function (data, type, row) {
          if (type === "display") {
            return `
                            <div>${data}</div>
                            <div class="progress mt-1" style="height: 4px;">
                                <div class="progress-bar ${row.progreso_clase}" role="progressbar" 
                                    style="width: ${row.progreso}%" 
                                    aria-valuenow="${row.progreso}" 
                                    aria-valuemin="0" 
                                    aria-valuemax="100">
                                </div>
                            </div>
                        `;
          }
          return data;
        },
      },
      { data: "proximo_orometro" },
      {
        data: "estado",
        render: function (data, type, row) {
          if (type === "display") {
            return `<span class="estado-badge estado-${data.toLowerCase()}">${capitalizarPrimeraLetra(
              data
            )}</span>`;
          }
          return data;
        },
      },
      {
        data: null,
        orderable: false,
        className: "text-center",
        render: function (data, type, row) {
          let acciones = '<div class="btn-group btn-group-sm">';
          acciones += `<button type="button" class="btn-accion btn-ver-mantenimiento" data-id="${row.id}" title="Ver detalles"><i class="bi bi-eye"></i></button>`;

          if (row.estado === "pendiente") {
            acciones += `<button type="button" class="btn-accion btn-completar-mantenimiento" data-id="${row.id}" title="Completar mantenimiento"><i class="bi bi-check-lg"></i></button>`;
          }

          acciones += "</div>";
          return acciones;
        },
      },
    ],
    order: [[0, "asc"]], // Ordenar por fecha por defecto
    dom: '<"row"<"col-md-6"B><"col-md-6"f>>rt<"row"<"col-md-6"l><"col-md-6"p>>',
    buttons: [
      {
        extend: "copy",
        text: '<i class="bi bi-clipboard"></i> Copiar',
        className: "btn btn-sm",
        exportOptions: {
          columns: [0, 1, 2, 3, 4, 5, 6],
        },
      },
      {
        extend: "excel",
        text: '<i class="bi bi-file-earmark-excel"></i> Excel',
        className: "btn btn-sm",
        exportOptions: {
          columns: [0, 1, 2, 3, 4, 5, 6],
        },
      },
      {
        extend: "pdf",
        text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
        className: "btn btn-sm btn-primary",
        exportOptions: {
          columns: [0, 1, 2, 3, 4, 5, 6],
        },
        customize: function (doc) {
          // Personalizar el PDF
          doc.pageOrientation = "landscape";
          doc.defaultStyle = {
            fontSize: 8,
            color: "#333333",
          };

          // Título del documento
          doc.content.unshift({
            text: "Reporte de Mantenimientos Preventivos",
            style: "header",
            alignment: "center",
            margin: [0, 10, 0, 10],
          });

          // Estilos
          doc.styles = {
            header: {
              fontSize: 14,
              bold: true,
              color: "#0055A4",
            },
          };

          // Metadatos
          doc.info = {
            title: "Reporte de Mantenimientos Preventivos",
            author: "SIGESMAN",
            subject: "Mantenimientos Preventivos",
          };
        },
      },
      {
        extend: "print",
        text: '<i class="bi bi-printer"></i> Imprimir',
        className: "btn btn-sm",
        exportOptions: {
          columns: [0, 1, 2, 3, 4, 5, 6],
        },
      },
    ],
    language: {
      url: getUrl("assets/plugins/datatables/js/es-ES.json"),
      loadingRecords: "Cargando...",
      processing: "Procesando...",
      zeroRecords: "No se encontraron registros",
      emptyTable: "No hay datos disponibles en la tabla",
    },
    lengthMenu: [
      [10, 25, 50, 100, -1],
      [10, 25, 50, 100, "Todos"],
    ],
    pageLength: 25,
    initComplete: function () {
      // Eventos para botones de acción
      $("#mantenimientos-table").on(
        "click",
        ".btn-ver-mantenimiento",
        function () {
          const id = $(this).data("id");
          cargarDetallesMantenimiento(id);
        }
      );

      $("#mantenimientos-table").on(
        "click",
        ".btn-completar-mantenimiento",
        function () {
          const id = $(this).data("id");
          abrirModalCompletar(id);
        }
      );

      // Evento para seleccionar fila
      $("#mantenimientos-table tbody").on("click", "tr", function () {
        const data = mantenimientosTable.row(this).data();
        if (data) {
          // Remover selección anterior
          $("#mantenimientos-table tbody tr").removeClass("selected");
          // Agregar selección a la fila actual
          $(this).addClass("selected");

          // Añadir animación al panel de detalles
          $("#mantenimiento-detalle").removeClass("loaded").addClass("loading");

          // Cargar detalles en el panel lateral con un pequeño retraso para la animación
          setTimeout(() => {
            cargarDetallesMantenimiento(data.id);
            // Quitar clase de carga y añadir clase de cargado para la animación
            $("#mantenimiento-detalle")
              .removeClass("loading")
              .addClass("loaded");
          }, 300);
        }
      });
    },
    drawCallback: function () {
      ocultarCargando();
    },
    preDrawCallback: function () {
      mostrarCargando();
    },
  });
}

/**
 * Carga los detalles de un mantenimiento en el panel lateral
 * @param {number} id ID del mantenimiento
 */
function cargarDetallesMantenimiento(id) {
  // Mostrar indicador de carga
  $("#mantenimiento-detalle .detail-content").html(
    '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando detalles...</p></div>'
  );
  $("#mantenimiento-detalle").addClass("active");

  // Obtener datos del mantenimiento
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/obtener.php"),
    type: "GET",
    dataType: "json",
    data: { id: id },
    success: function (response) {
      if (response.success) {
        const data = response.data;
        mantenimientoSeleccionado = id;

        // Determinar si se puede completar el mantenimiento
        const puedeCompletar = data.mantenimiento.estado === "pendiente";

        // Actualizar título del panel
        $("#mantenimiento-detalle .detail-header").html(`
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="detail-title">${
                              data.tipo === "equipo" ? "Equipo" : "Componente"
                            }: ${
          data.tipo === "equipo" ? data.equipo.nombre : data.componente.nombre
        }</h2>
                            <p class="detail-subtitle">Código: ${
                              data.tipo === "equipo"
                                ? data.equipo.codigo
                                : data.componente.codigo
                            }</p>
                        </div>
                        <div>
                            <span class="estado-badge estado-${
                              data.mantenimiento.estado
                            }">${capitalizarPrimeraLetra(
          data.mantenimiento.estado
        )}</span>
                        </div>
                    </div>
                `);

        // Calcular tiempo restante para mantenimiento
        let tiempoRestante = "";
        let colorClase = "success";

        if (data.dias_restantes !== null) {
          if (data.dias_restantes <= 0) {
            colorClase = "danger";
            tiempoRestante = `
                            <div class="tiempo-restante-container text-center mb-4">
                                <h3 class="tiempo-restante-titulo">¡Mantenimiento requerido!</h3>
                                <div class="tiempo-restante-valor text-danger">Hace ${Math.abs(
                                  data.dias_restantes
                                )} días</div>
                            </div>
                        `;
          } else if (data.dias_restantes <= 3) {
            colorClase = "danger";
            tiempoRestante = `
                            <div class="tiempo-restante-container text-center mb-4">
                                <h3 class="tiempo-restante-titulo">Mantenimiento próximo</h3>
                                <div class="tiempo-restante-valor text-danger">Faltan ${data.dias_restantes} días</div>
                            </div>
                        `;
          } else if (data.dias_restantes <= 7) {
            colorClase = "warning";
            tiempoRestante = `
                            <div class="tiempo-restante-container text-center mb-4">
                                <h3 class="tiempo-restante-titulo">Mantenimiento programado</h3>
                                <div class="tiempo-restante-valor text-warning">Faltan ${data.dias_restantes} días</div>
                            </div>
                        `;
          } else {
            tiempoRestante = `
                            <div class="tiempo-restante-container text-center mb-4">
                                <h3 class="tiempo-restante-titulo">Mantenimiento programado</h3>
                                <div class="tiempo-restante-valor text-success">Faltan ${data.dias_restantes} días</div>
                            </div>
                        `;
          }
        }

        // Construir barra de progreso
        const barraProgreso = `
                    <div class="mt-3">
                        <h4 class="fs-6 mb-2">Progreso del Orómetro</h4>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar ${
                              data.progreso >= 90
                                ? "bg-danger"
                                : data.progreso >= 75
                                ? "bg-warning"
                                : "bg-success"
                            }" 
                                role="progressbar" 
                                style="width: ${data.progreso}%" 
                                aria-valuenow="${data.progreso}" 
                                aria-valuemin="0" 
                                aria-valuemax="100">
                                ${Math.round(data.progreso)}%
                            </div>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <small>${formatearNumero(data.anterior_orometro)} ${
          data.unidad_orometro
        }</small>
                            <small>${formatearNumero(data.orometro_actual)} ${
          data.unidad_orometro
        }</small>
                            <small>${formatearNumero(data.proximo_orometro)} ${
          data.unidad_orometro
        }</small>
                        </div>
                    </div>
                `;

        // Construir información del mantenimiento
        let infoMantenimiento = `
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <i class="bi bi-tools"></i> Información del Mantenimiento
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Descripción:</span>
                            <p class="detail-value">${
                              data.mantenimiento.descripcion_razon
                            }</p>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Fecha Programada:</span>
                            <span class="detail-value">${
                              data.fecha_formateada
                            }</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Orómetro Programado:</span>
                            <span class="detail-value">${formatearNumero(
                              data.mantenimiento.orometro_programado
                            )} ${data.unidad_orometro}</span>
                        </div>
                `;

        if (data.mantenimiento.fecha_realizado) {
          infoMantenimiento += `
                        <div class="detail-item">
                            <span class="detail-label">Fecha Realizado:</span>
                            <span class="detail-value">${new Date(
                              data.mantenimiento.fecha_realizado
                            ).toLocaleDateString("es-ES")}</span>
                        </div>
                    `;
        }

        if (data.mantenimiento.observaciones) {
          infoMantenimiento += `
                        <div class="detail-item">
                            <span class="detail-label">Observaciones:</span>
                            <p class="detail-value">${data.mantenimiento.observaciones}</p>
                        </div>
                    `;
        }

        infoMantenimiento += `</div>`;

        // Construir botones de acción
        let botonesAccion = `
                    <div class="detail-actions">
                `;

        if (puedeCompletar) {
          botonesAccion += `
                        <button type="button" class="btn btn-sm btn-success btn-completar" data-id="${id}">
                            <i class="bi bi-check-circle"></i> Completar Mantenimiento
                        </button>
                    `;
        }

        botonesAccion += `</div>`;

        // Actualizar contenido del panel
        $("#mantenimiento-detalle .detail-content").html(`
                    ${tiempoRestante}
                    ${barraProgreso}
                    ${infoMantenimiento}
                    ${botonesAccion}
                `);

        // Eventos para botones en el panel
        $("#mantenimiento-detalle .btn-completar").on("click", function () {
          abrirModalCompletar($(this).data("id"));
        });
      } else {
        // Mostrar mensaje de error
        $("#mantenimiento-detalle .detail-content").html(`
                    <div class="detail-empty">
                        <div class="detail-empty-icon">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <div class="detail-empty-text">
                            Error al cargar los detalles del mantenimiento
                        </div>
                    </div>
                `);
      }
    },
    error: function (xhr, status, error) {
      // Mostrar mensaje de error
      $("#mantenimiento-detalle .detail-content").html(`
                <div class="detail-empty">
                    <div class="detail-empty-icon">
                        <i class="bi bi-exclamation-triangle"></i>
                    </div>
                    <div class="detail-empty-text">
                        Error de conexión al servidor
                    </div>
                </div>
            `);
      console.error("Error al obtener detalles del mantenimiento:", error);
    },
  });
}

/**
 * Abre el modal para completar un mantenimiento
 * @param {number} id ID del mantenimiento
 */
function abrirModalCompletar(id) {
  mostrarCargando();

  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/obtener.php"),
    type: "GET",
    dataType: "json",
    data: { id: id },
    success: function (response) {
      if (response.success) {
        const data = response.data;

        // Verificar si el mantenimiento está pendiente
        if (data.mantenimiento.estado !== "pendiente") {
          mostrarToast(
            "warning",
            "Advertencia",
            "Este mantenimiento ya ha sido completado o cancelado"
          );
          return;
        }

        // Establecer valores en el formulario
        $("#completar-id").val(id);
        $("#completar-tipo").val(data.tipo);

        // Establecer valor actual del orómetro
        let orometroActual = 0;
        if (data.tipo === "equipo" && data.equipo) {
          orometroActual = data.equipo.orometro_actual;
        } else if (data.tipo === "componente" && data.componente) {
          orometroActual = data.componente.orometro_actual;
        }

        $("#completar-orometro-actual").val(orometroActual);
        $("#completar-unidad-orometro").text(data.unidad_orometro);
        $("#completar-observaciones").val("");

        // Mostrar modal
        const modalCompletar = new bootstrap.Modal(
          document.getElementById("modal-completar")
        );
        modalCompletar.show();
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al obtener los datos del mantenimiento"
        );
      }
    },
    error: function (xhr, status, error) {
      console.error("Error en la solicitud AJAX:", xhr.responseText);
      mostrarToast(
        "error",
        "Error",
        "Error al obtener los datos del mantenimiento"
      );
    },
    complete: function () {
      ocultarCargando();
    },
  });
}

/**
 * Guarda el mantenimiento completado
 */
function guardarCompletarMantenimiento() {
  // Validar formulario
  if (!validarFormularioCompletar()) {
    return;
  }

  // Obtener datos del formulario
  const id = $("#completar-id").val();
  const orometroActual = $("#completar-orometro-actual").val();
  const observaciones = $("#completar-observaciones").val();

  // Mostrar indicador de carga
  mostrarCargando();

  // Deshabilitar botón para evitar doble envío
  $("#btn-guardar-completar")
    .prop("disabled", true)
    .html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...'
    );

  // Enviar solicitud
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/completar.php"),
    type: "POST",
    dataType: "json",
    data: {
      id: id,
      orometro_actual: orometroActual,
      observaciones: observaciones,
    },
    success: function (response) {
      if (response.success) {
        // Cerrar modal
        const modalCompletar = bootstrap.Modal.getInstance(
          document.getElementById("modal-completar")
        );
        modalCompletar.hide();

        // Mostrar mensaje de éxito
        mostrarToast(
          "success",
          "Éxito",
          response.message || "Mantenimiento completado correctamente"
        );

        // Recargar tabla
        mantenimientosTable.ajax.reload();

        // Limpiar panel de detalles
        ocultarDetalleMantenimiento();

        // Verificar si hay mantenimientos faltantes
        verificarMantenimientosPreventivos();
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al completar el mantenimiento"
        );
      }
    },
    error: function (xhr, status, error) {
      console.error("Error en la solicitud AJAX:", xhr.responseText);
      mostrarToast("error", "Error", "Error al completar el mantenimiento");
    },
    complete: function () {
      ocultarCargando();
      // Restaurar botón
      $("#btn-guardar-completar").prop("disabled", false).html("Guardar");
    },
  });
}

/**
 * Oculta el panel de detalles del mantenimiento
 */
function ocultarDetalleMantenimiento() {
  // Restaurar contenido por defecto
  $("#mantenimiento-detalle .detail-header").html(`
        <h2 class="detail-title">Detalles del Mantenimiento</h2>
        <p class="detail-subtitle">Seleccione un mantenimiento para ver información</p>
    `);

  $("#mantenimiento-detalle .detail-content").html(`
        <div class="detail-empty">
            <div class="detail-empty-icon">
                <i class="bi bi-info-circle"></i>
            </div>
            <div class="detail-empty-text">
                Seleccione un mantenimiento para ver sus detalles
            </div>
        </div>
    `);

  // Quitar clase de selección
  $("#mantenimiento-detalle").removeClass("active loaded");
}

/**
 * Valida el formulario de completar mantenimiento
 * @returns {boolean} true si el formulario es válido, false en caso contrario
 */
function validarFormularioCompletar() {
  // Validar que el orómetro actual sea un número válido
  const orometroActual = $("#completar-orometro-actual").val();
  if (
    !orometroActual ||
    isNaN(parseFloat(orometroActual)) ||
    parseFloat(orometroActual) < 0
  ) {
    mostrarToast(
      "warning",
      "Advertencia",
      "Debe ingresar un valor válido para el orómetro actual"
    );
    $("#completar-orometro-actual").focus();
    return false;
  }

  return true;
}

/**
 * Aplica los filtros seleccionados a la tabla
 */
function aplicarFiltros() {
  // Obtener valores de filtros
  const estado = $("#filtro-estado").val();
  const tipo = $("#filtro-tipo").val();
  const fechaDesde = $("#filtro-fecha-desde").val();
  const fechaHasta = $("#filtro-fecha-hasta").val();

  // Actualizar filtros activos
  filtrosAplicados = {};
  if (estado) filtrosAplicados.estado = estado;
  if (tipo) filtrosAplicados.tipo = tipo;

  // Convertir fechas de DD/MM/YYYY a YYYY-MM-DD para el servidor
  if (fechaDesde) {
    const partesFechaDesde = fechaDesde.split("/");
    if (partesFechaDesde.length === 3) {
      filtrosAplicados.fecha_desde = `${partesFechaDesde[2]}-${partesFechaDesde[1]}-${partesFechaDesde[0]}`;
    }
  }

  if (fechaHasta) {
    const partesFechaHasta = fechaHasta.split("/");
    if (partesFechaHasta.length === 3) {
      filtrosAplicados.fecha_hasta = `${partesFechaHasta[2]}-${partesFechaHasta[1]}-${partesFechaHasta[0]}`;
    }
  }

  // Mostrar toast de información
  mostrarToast("info", "Filtros", "Aplicando filtros...");

  // Recargar tabla
  mantenimientosTable.ajax.reload();

  // Limpiar panel de detalles
  ocultarDetalleMantenimiento();
}

/**
 * Limpia los filtros aplicados
 */
function limpiarFiltros() {
  // Restablecer valores de filtros
  $("#filtro-estado").val("pendiente");
  $("#filtro-tipo").val("");
  $("#filtro-fecha-desde").val("");
  $("#filtro-fecha-hasta").val("");

  // Actualizar filtros activos (mantener solo pendientes por defecto)
  filtrosAplicados = {
    estado: "pendiente",
  };

  // Mostrar toast de información
  mostrarToast("info", "Filtros", "Filtros restablecidos");

  // Recargar tabla
  mantenimientosTable.ajax.reload();

  // Limpiar panel de detalles
  ocultarDetalleMantenimiento();
}

/**
 * Función para obtener la URL completa
 * @param {string} path Ruta relativa
 * @returns {string} URL completa
 */
function getUrl(path) {
  // Obtener la ruta base del proyecto
  const base = window.location.pathname.split("/modulos/")[0] + "/";

  // Eliminar barras iniciales y finales
  const cleanPath = path.replace(/^\/+|\/+$/g, "");

  // Devolver la URL completa
  return base + cleanPath;
}

/**
 * Capitaliza la primera letra de un texto
 * @param {string} texto Texto a capitalizar
 * @returns {string} Texto con la primera letra en mayúscula
 */
function capitalizarPrimeraLetra(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Formatea un número para mostrar
 * @param {number} numero  + texto.slice(1);
}

/**
 * Formatea un número para mostrar
 * @param {number} numero Número a formatear
 * @returns {string} Número formateado
 */
function formatearNumero(numero) {
  if (numero === null || numero === undefined) return "0";
  return Number.parseFloat(numero)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Muestra un mensaje toast
 * @param {string} tipo Tipo de mensaje (success, error, warning, info)
 * @param {string} titulo Título del mensaje
 * @param {string} mensaje Contenido del mensaje
 */
function mostrarToast(tipo, titulo, mensaje) {
  // Verificar si existe la función showToast (del componente toast)
  if (typeof showToast === "function") {
    showToast(tipo, titulo, mensaje);
  } else if (window.showSuccessToast && tipo === "success") {
    window.showSuccessToast(mensaje);
  } else if (window.showErrorToast && tipo === "error") {
    window.showErrorToast(mensaje);
  } else if (window.showInfoToast && (tipo === "info" || tipo === "warning")) {
    window.showInfoToast(mensaje);
  } else {
    // Fallback si no existe el componente toast
    console.log(`${titulo}: ${mensaje}`);
  }
}

/**
 * Muestra un indicador de carga
 */
function mostrarCargando() {
  // Si existe un componente de carga, usarlo
  if (typeof window.showLoading === "function") {
    window.showLoading();
  }
}

/**
 * Oculta el indicador de carga
 */
function ocultarCargando() {
  // Si existe un componente de carga, usarlo
  if (typeof window.hideLoading === "function") {
    window.hideLoading();
  }
}
