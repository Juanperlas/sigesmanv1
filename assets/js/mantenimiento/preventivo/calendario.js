/**
 * Módulo de Mantenimiento Preventivo - JavaScript para Calendario
 * SIGESMANV1
 */

// Variables globales
let calendarInstance;
let mantenimientoSeleccionado = null;
let mantenimientoActual = null;
let filtrosAplicados = {};

// Constantes
const UNIDADES_OROMETRO = {
  horas: "hrs",
  kilometros: "km",
};

// Colores para eventos del calendario
const COLORES_EVENTOS = {
  pendiente: {
    backgroundColor: "#3788d8",
    borderColor: "#2c6fb1",
    textColor: "#ffffff",
  },
  completado: {
    backgroundColor: "#28a745",
    borderColor: "#1e7e34",
    textColor: "#ffffff",
  },
  vencido: {
    backgroundColor: "#dc3545",
    borderColor: "#bd2130",
    textColor: "#ffffff",
  },
  proximo: {
    backgroundColor: "#ffc107",
    borderColor: "#d39e00",
    textColor: "#212529",
  },
};

// Declaración de variables globales
const $ = jQuery;
const bootstrap = window.bootstrap; // Asegúrate de que Bootstrap esté disponible globalmente
// Verificar si las variables ya están definidas en el objeto window
// Si no están definidas, no intentamos redeclararlas
// Esto evita tanto el error de "no disponible" como el de "ya declarado"
if (!window.showErrorToast)
  window.showErrorToast = (msg) => {
    console.error(msg);
  };
if (!window.showSuccessToast)
  window.showSuccessToast = (msg) => {
    console.log(msg);
  };
if (!window.imageViewer)
  window.imageViewer = {
    show: () => {
      console.log("Visor de imágenes no disponible");
    },
  };
if (!window.showLoading) window.showLoading = () => {};
if (!window.hideLoading) window.hideLoading = () => {};

// Inicialización cuando el DOM está listo
$(document).ready(function () {
  // Inicializar calendario
  inicializarCalendario();

  // Inicializar validación del formulario
  inicializarValidacionFormulario();

  // Eventos para botones y controles
  $("#btn-generar-mantenimientos").on("click", generarMantenimientos);
  $("#btn-guardar-completar").on("click", completarMantenimiento);
  $("#btn-aplicar-filtros").on("click", aplicarFiltros);
  $("#btn-limpiar-filtros").on("click", limpiarFiltros);
  $("#btn-ver-imagen").on("click", ampliarImagenDetalle);
  $("#btn-completar-desde-detalle").on("click", completarDesdeDetalle);

  // Cargar equipos y componentes para los filtros
  cargarEquipos();
  cargarComponentes();

  // Verificar si hay un ID en la URL para seleccionar un mantenimiento
  const urlParams = new URLSearchParams(window.location.search);
  const mantenimientoId = urlParams.get("id");
  if (mantenimientoId) {
    setTimeout(() => {
      cargarDetallesMantenimiento(mantenimientoId);
    }, 1000); // Esperar a que el calendario se cargue
  }

  // Inicializar tooltips
  $('[data-bs-toggle="tooltip"]').tooltip();
});

// Función para obtener la URL base
function getBaseUrl() {
  return window.location.pathname.split("/modulos/")[0] + "/";
}

// Función para construir URL completa
function getUrl(path) {
  return getBaseUrl() + path;
}

/**
 * Inicializa el calendario con FullCalendar
 */
function inicializarCalendario() {
  const calendarEl = document.getElementById("calendario-mantenimientos");

  if (!calendarEl) {
    console.error("No se encontró el elemento del calendario");
    return;
  }

  // Verificar si FullCalendar está disponible
  if (typeof FullCalendar === "undefined") {
    console.error("Error: FullCalendar no está disponible");
    if (window.showErrorToast) {
      window.showErrorToast(
        "Error: La biblioteca FullCalendar no está disponible"
      );
    }
    return;
  }

  try {
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      locale: "es",
      buttonText: {
        today: "Hoy",
        month: "Mes",
        week: "Semana",
        day: "Día",
      },
      height: "auto",
      contentHeight: 650,
      dayMaxEvents: true, // Permite "more" link cuando hay muchos eventos
      events: function (info, successCallback, failureCallback) {
        // Mostrar indicador de carga
        if (window.showLoading) {
          window.showLoading();
        }

        // Obtener eventos del servidor
        $.ajax({
          url: getUrl("api/mantenimiento/preventivo/calendario.php"),
          type: "GET",
          data: {
            start: info.startStr,
            end: info.endStr,
            ...filtrosAplicados,
          },
          dataType: "json",
          success: function (response) {
            // Procesar eventos para añadir colores según estado
            const eventos = response.map((evento) => {
              // Determinar color según estado
              let colorConfig = COLORES_EVENTOS.pendiente;

              if (evento.estado === "completado") {
                colorConfig = COLORES_EVENTOS.completado;
              } else {
                // Verificar si está vencido
                const fechaEvento = new Date(evento.start);
                const hoy = new Date();
                if (fechaEvento < hoy) {
                  colorConfig = COLORES_EVENTOS.vencido;
                  evento.title = "VENCIDO: " + evento.title;
                } else {
                  // Verificar si está próximo (7 días)
                  const diferenciaDias = Math.ceil(
                    (fechaEvento - hoy) / (1000 * 60 * 60 * 24)
                  );
                  if (diferenciaDias <= 7) {
                    colorConfig = COLORES_EVENTOS.proximo;
                  }
                }
              }

              // Aplicar colores al evento
              return {
                ...evento,
                backgroundColor: colorConfig.backgroundColor,
                borderColor: colorConfig.borderColor,
                textColor: colorConfig.textColor,
              };
            });

            successCallback(eventos);

            // Ocultar indicador de carga
            if (window.hideLoading) {
              window.hideLoading();
            }
          },
          error: function (xhr, textStatus, error) {
            failureCallback(error);
            console.error("Error al cargar eventos:", error);

            if (window.showErrorToast) {
              window.showErrorToast(
                "Error al cargar los eventos del calendario"
              );
            }

            // Ocultar indicador de carga
            if (window.hideLoading) {
              window.hideLoading();
            }
          },
        });
      },
      eventClick: function (info) {
        // Mostrar detalles del mantenimiento al hacer clic en un evento
        cargarDetallesMantenimiento(info.event.id);
      },
      loading: function (isLoading) {
        if (isLoading) {
          if (window.showLoading) {
            window.showLoading();
          }
        } else {
          if (window.hideLoading) {
            window.hideLoading();
          }
        }
      },
      eventDidMount: function (info) {
        // Añadir tooltip a los eventos
        $(info.el).tooltip({
          title: info.event.title,
          placement: "top",
          trigger: "hover",
          container: "body",
        });
      },
    });

    calendarInstance.render();
  } catch (error) {
    console.error("Error al inicializar el calendario:", error);
    if (window.showErrorToast) {
      window.showErrorToast(
        "Error al inicializar el calendario: " + error.message
      );
    }
  }
}

/**
 * Carga los equipos para el filtro
 */
function cargarEquipos() {
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/equipos.php"),
    type: "GET",
    dataType: "json",
    success: (response) => {
      let options = '<option value="">Todos</option>';
      if (response.data && response.data.length > 0) {
        response.data.forEach((equipo) => {
          options += `<option value="${equipo.id}">${equipo.codigo} - ${equipo.nombre}</option>`;
        });
      }
      $("#filtro-equipo").html(options);
    },
    error: (xhr, status, error) => {
      console.error("Error al cargar equipos:", error);
      if (window.showErrorToast) {
        window.showErrorToast("Error al cargar equipos");
      }
    },
  });
}

/**
 * Carga los componentes para el filtro
 */
function cargarComponentes() {
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/componentes.php"),
    type: "GET",
    dataType: "json",
    success: (response) => {
      let options = '<option value="">Todos</option>';
      if (response.data && response.data.length > 0) {
        response.data.forEach((componente) => {
          options += `<option value="${componente.id}">${componente.codigo} - ${componente.nombre}</option>`;
        });
      }
      $("#filtro-componente").html(options);
    },
    error: (xhr, status, error) => {
      console.error("Error al cargar componentes:", error);
      if (window.showErrorToast) {
        window.showErrorToast("Error al cargar componentes");
      }
    },
  });
}

/**
 * Recarga los eventos del calendario
 */
function recargarCalendario() {
  if (calendarInstance) {
    calendarInstance.refetchEvents();
  }
}

/**
 * Carga los detalles de un mantenimiento en el panel lateral
 * @param {number} id - ID del mantenimiento
 */
function cargarDetallesMantenimiento(id) {
  // Mostrar indicador de carga
  $("#preventivo-detalle .detail-content").html(
    '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando detalles...</p></div>'
  );
  $("#preventivo-detalle").addClass("active");

  // Obtener datos del mantenimiento
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/obtener.php"),
    type: "GET",
    data: { id: id },
    dataType: "json",
    success: (response) => {
      if (response.success && response.data) {
        const mantenimiento = response.data;
        mantenimientoSeleccionado = mantenimiento;
        const unidad = getUnidadOrometro(mantenimiento.tipo_orometro);

        // Actualizar título del panel y añadir imagen en el encabezado
        const imagenUrl = mantenimiento.imagen
          ? mantenimiento.imagen
          : getUrl("assets/img/equipos/default.png");

        // Actualizar el encabezado con la imagen
        $("#preventivo-detalle .detail-header").html(`
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2 class="detail-title">${mantenimiento.nombre}</h2>
              <p class="detail-subtitle">Código: ${mantenimiento.codigo}</p>
            </div>
            <div class="detail-header-image">
              <img src="${imagenUrl}" alt="${mantenimiento.nombre}" class="detail-header-img" data-image-viewer="true">
            </div>
          </div>
        `);

        // Calcular tiempo restante para mantenimiento
        let tiempoRestante = "";
        let tiempoRestanteValor = 0;
        let colorClase = "success";

        if (mantenimiento.estado === "pendiente") {
          const fechaProgramada = new Date(mantenimiento.fecha_hora_programada);
          const hoy = new Date();
          const diferenciaDias = Math.ceil(
            (fechaProgramada - hoy) / (1000 * 60 * 60 * 24)
          );

          if (diferenciaDias < 0) {
            colorClase = "danger";
            tiempoRestanteValor = Math.abs(diferenciaDias);
            tiempoRestante = `
              <div class="tiempo-restante-container text-center mb-4">
                <h3 class="tiempo-restante-titulo">¡Mantenimiento vencido!</h3>
                <div class="tiempo-restante-valor text-${colorClase}">Hace ${tiempoRestanteValor} días</div>
              </div>
            `;
          } else if (diferenciaDias <= 7) {
            colorClase = "warning";
            tiempoRestanteValor = diferenciaDias;
            tiempoRestante = `
              <div class="tiempo-restante-container text-center mb-4">
                <h3 class="tiempo-restante-titulo">Mantenimiento próximo</h3>
                <div class="tiempo-restante-valor text-${colorClase}">${tiempoRestanteValor} días</div>
              </div>
            `;
          } else {
            tiempoRestanteValor = diferenciaDias;
            tiempoRestante = `
              <div class="tiempo-restante-container text-center mb-4">
                <h3 class="tiempo-restante-titulo">Tiempo para mantenimiento</h3>
                <div class="tiempo-restante-valor text-${colorClase}">${tiempoRestanteValor} días</div>
              </div>
            `;
          }
        }

        // Actualizar contenido del panel - SIMPLIFICADO
        $("#preventivo-detalle .detail-content").html(`
          ${tiempoRestante}
          
          <!-- Información básica -->
          <div class="detail-section">
            <div class="detail-section-title">
              <i class="bi bi-info-circle"></i> Información Básica
            </div>
            <div class="detail-item">
              <span class="detail-label">Tipo:</span>
              <span class="detail-value">${
                mantenimiento.tipo === "equipo" ? "Equipo" : "Componente"
              }</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Estado:</span>
              <span class="detail-value">
                <span class="estado-badge estado-${
                  mantenimiento.estado === "pendiente"
                    ? "pendiente"
                    : "completado"
                }">
                  ${
                    mantenimiento.estado === "pendiente"
                      ? "Pendiente"
                      : "Completado"
                  }
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Fecha Programada:</span>
              <span class="detail-value">${formatearFecha(
                mantenimiento.fecha_hora_programada
              )}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Orómetro Programado:</span>
              <span class="detail-value">${formatearNumero(
                mantenimiento.orometro_programado
              )} ${unidad}</span>
            </div>
          </div>
          
          <!-- Descripción -->
          <div class="detail-section">
            <div class="detail-section-title">
              <i class="bi bi-chat-left-text"></i> Descripción
            </div>
            <p class="detail-value">${
              mantenimiento.descripcion_razon || "Sin descripción"
            }</p>
          </div>
          
          <div class="detail-actions">
            <button type="button" class="btn btn-sm btn-primary btn-ver-detalles" data-id="${
              mantenimiento.id
            }">
              <i class="bi bi-search"></i> Ver Detalles Completos
            </button>
            ${
              tienePermiso("mantenimientos.preventivo.editar") &&
              mantenimiento.estado === "pendiente"
                ? `
                <button type="button" class="btn btn-sm btn-success btn-completar" data-id="${mantenimiento.id}">
                  <i class="bi bi-check-circle"></i> Completar
                </button>
              `
                : ""
            }
          </div>
        `);

        // Inicializar el visor de imágenes para la imagen del encabezado
        $(".detail-header-img").on("click", function () {
          if (window.imageViewer) {
            window.imageViewer.show(
              $(this).attr("src"),
              "Imagen del equipo/componente"
            );
          }
        });

        // Eventos para botones en el panel
        $("#preventivo-detalle .btn-ver-detalles").on("click", function () {
          verDetallesMantenimiento($(this).data("id"));
        });

        $("#preventivo-detalle .btn-completar").on("click", function () {
          mostrarModalCompletarMantenimiento($(this).data("id"));
        });
      } else {
        // Mostrar mensaje de error
        $("#preventivo-detalle .detail-content").html(`
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
    error: (xhr, status, error) => {
      // Mostrar mensaje de error
      $("#preventivo-detalle .detail-content").html(`
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
 * Muestra los detalles completos de un mantenimiento en un modal
 * @param {number} id - ID del mantenimiento
 */
function verDetallesMantenimiento(id) {
  // Mostrar indicador de carga
  showLoadingOverlay();

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Cargando detalles del mantenimiento...");
  }

  // Obtener datos del mantenimiento
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/obtener.php"),
    type: "GET",
    data: { id: id },
    dataType: "json",
    success: (response) => {
      // Ocultar indicador de carga
      hideLoadingOverlay();

      if (response.success && response.data) {
        const mantenimiento = response.data;
        mantenimientoActual = mantenimiento;
        const unidad = getUnidadOrometro(mantenimiento.tipo_orometro);

        // Actualizar datos en el modal
        $("#detalle-nombre").text(mantenimiento.nombre);
        $("#detalle-codigo").text(mantenimiento.codigo || "-");
        $("#detalle-tipo").text(
          mantenimiento.tipo === "equipo" ? "Equipo" : "Componente"
        );

        // Mostrar u ocultar contenedor de equipo
        if (
          mantenimiento.tipo === "componente" &&
          mantenimiento.equipo_nombre
        ) {
          $("#detalle-equipo-container").show();
          $("#detalle-equipo").text(mantenimiento.equipo_nombre);
        } else {
          $("#detalle-equipo-container").hide();
        }

        // Información del mantenimiento
        $("#detalle-descripcion").text(mantenimiento.descripcion_razon || "-");
        $("#detalle-fecha-programada").text(
          formatearFecha(mantenimiento.fecha_hora_programada)
        );
        $("#detalle-orometro-programado").text(
          formatearNumero(mantenimiento.orometro_programado) + " " + unidad
        );

        // Información de orómetros
        $("#detalle-orometro-anterior").text(
          formatearNumero(mantenimiento.anterior_orometro || 0) + " " + unidad
        );
        $("#detalle-orometro-actual").text(
          formatearNumero(mantenimiento.orometro_actual || 0) + " " + unidad
        );
        $("#detalle-orometro-proximo").text(
          formatearNumero(mantenimiento.proximo_orometro || 0) + " " + unidad
        );

        // Mostrar u ocultar sección de completado
        if (mantenimiento.estado === "completado") {
          $("#detalle-completado-container").show();
          $("#detalle-fecha-realizado").text(
            formatearFecha(mantenimiento.fecha_hora_realizado)
          );
          $("#detalle-observaciones").text(mantenimiento.observaciones || "-");
          $("#btn-completar-desde-detalle").hide();
        } else {
          $("#detalle-completado-container").hide();
          if (tienePermiso("mantenimientos.preventivo.editar")) {
            $("#btn-completar-desde-detalle").show();
          } else {
            $("#btn-completar-desde-detalle").hide();
          }
        }

        // Calcular y mostrar tiempo restante
        const fechaProgramada = new Date(mantenimiento.fecha_hora_programada);
        const hoy = new Date();
        const diferenciaDias = Math.ceil(
          (fechaProgramada - hoy) / (1000 * 60 * 60 * 24)
        );

        if (mantenimiento.estado === "pendiente") {
          if (diferenciaDias < 0) {
            $("#detalle-tiempo-restante").html(`
              <div class="alert alert-danger mb-3">
                <strong>¡Mantenimiento vencido!</strong> Hace ${Math.abs(
                  diferenciaDias
                )} días
              </div>
            `);
          } else if (diferenciaDias <= 7) {
            $("#detalle-tiempo-restante").html(`
              <div class="alert alert-warning mb-3">
                <strong>Mantenimiento próximo:</strong> ${diferenciaDias} días
              </div>
            `);
          } else {
            $("#detalle-tiempo-restante").html(`
              <div class="alert alert-success mb-3">
                <strong>Tiempo para mantenimiento:</strong> ${diferenciaDias} días
              </div>
            `);
          }
        } else {
          $("#detalle-tiempo-restante").html("");
        }

        // Actualizar imagen
        if (mantenimiento.imagen) {
          $("#detalle-imagen").attr("src", mantenimiento.imagen);
        } else {
          $("#detalle-imagen").attr(
            "src",
            getUrl("assets/img/equipos/default.png")
          );
        }

        // Actualizar estado
        const estadoClases = {
          pendiente: "bg-primary",
          completado: "bg-success",
        };

        const estadoTexto = {
          pendiente: "Pendiente",
          completado: "Completado",
        };

        $("#detalle-estado").attr(
          "class",
          "badge rounded-pill " +
            (estadoClases[mantenimiento.estado] || "bg-secondary")
        );
        $("#detalle-estado").text(
          estadoTexto[mantenimiento.estado] || mantenimiento.estado
        );

        // Cargar historial de mantenimientos
        if (mantenimiento.historial && mantenimiento.historial.length > 0) {
          let historialHtml = "";
          mantenimiento.historial.forEach((item) => {
            historialHtml += `
              <tr>
                <td>${formatearFecha(item.fecha)}</td>
                <td>${item.tipo}</td>
                <td>${formatearNumero(item.orometro)} ${unidad}</td>
                <td>${item.descripcion}</td>
              </tr>
            `;
          });
          $("#detalle-historial").html(historialHtml);
        } else {
          $("#detalle-historial").html(`
            <tr>
              <td colspan="4" class="text-center">No hay registros de mantenimientos anteriores</td>
            </tr>
          `);
        }

        // Mostrar modal
        const modalDetalle = new bootstrap.Modal(
          document.getElementById("modal-detalle-mantenimiento")
        );
        modalDetalle.show();
      } else {
        if (window.showErrorToast) {
          window.showErrorToast(
            response.message ||
              "Error al obtener los detalles del mantenimiento"
          );
        }
      }
    },
    error: (xhr, status, error) => {
      // Ocultar indicador de carga
      hideLoadingOverlay();
      if (window.showErrorToast) {
        window.showErrorToast("Error de conexión al servidor");
      }
      console.error("Error al obtener detalles del mantenimiento:", error);
    },
  });
}

/**
 * Muestra el modal para completar un mantenimiento
 * @param {number} id - ID del mantenimiento a completar
 */
function mostrarModalCompletarMantenimiento(id) {
  // Obtener datos del mantenimiento
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/obtener.php"),
    type: "GET",
    data: { id: id },
    dataType: "json",
    success: (response) => {
      if (response.success) {
        const mantenimiento = response.data;

        // Llenar el formulario
        $("#mantenimiento-id").val(id);
        $("#mantenimiento-orometro").val(
          mantenimiento.orometro_actual || mantenimiento.orometro_programado
        );
        $("#mantenimiento-observaciones").val("");

        // Actualizar unidad de orómetro
        $("#unidad-orometro").text(
          getUnidadOrometro(mantenimiento.tipo_orometro)
        );

        // Mostrar el modal
        const modal = new bootstrap.Modal(
          document.getElementById("modal-completar-mantenimiento")
        );
        modal.show();
      } else {
        if (window.showErrorToast) {
          window.showErrorToast(
            response.message || "Error al cargar datos del mantenimiento"
          );
        }
      }
    },
    error: (xhr, status, error) => {
      console.error("Error al cargar datos del mantenimiento:", error);
      if (window.showErrorToast) {
        window.showErrorToast(
          "Error de conexión al cargar datos del mantenimiento"
        );
      }
    },
  });
}

/**
 * Completa un mantenimiento preventivo
 */
function completarMantenimiento() {
  // Validar formulario
  if (!$("#form-completar-mantenimiento").valid()) {
    if (window.showErrorToast) {
      window.showErrorToast(
        "Por favor, complete todos los campos obligatorios"
      );
    }
    return;
  }

  // Obtener datos del formulario
  const id = $("#mantenimiento-id").val();
  const orometroActual = $("#mantenimiento-orometro").val();
  const observaciones = $("#mantenimiento-observaciones").val();

  // Mostrar indicador de carga
  $("#btn-guardar-completar")
    .prop("disabled", true)
    .html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...'
    );

  // Enviar solicitud AJAX
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/completar.php"),
    type: "POST",
    data: {
      id: id,
      orometro_actual: orometroActual,
      observaciones: observaciones,
    },
    dataType: "json",
    success: (response) => {
      if (response.success) {
        // Cerrar modal
        bootstrap.Modal.getInstance(
          document.getElementById("modal-completar-mantenimiento")
        ).hide();

        // Actualizar calendario
        recargarCalendario();

        // Mostrar mensaje de éxito
        if (window.showSuccessToast) {
          window.showSuccessToast(
            response.message || "Mantenimiento completado correctamente"
          );
        }

        // Si el mantenimiento completado es el seleccionado, actualizar detalles
        if (mantenimientoSeleccionado && mantenimientoSeleccionado.id == id) {
          cargarDetallesMantenimiento(id);
        }
      } else {
        if (window.showErrorToast) {
          window.showErrorToast(
            response.message || "Error al completar el mantenimiento"
          );
        }
      }
    },
    error: (xhr, status, error) => {
      console.error("Error al completar el mantenimiento:", error);
      if (window.showErrorToast) {
        window.showErrorToast(
          "Error de conexión al completar el mantenimiento"
        );
      }
    },
    complete: () => {
      // Restaurar botón
      $("#btn-guardar-completar")
        .prop("disabled", false)
        .html('<i class="bi bi-check-lg"></i> Completar');
    },
  });
}

/**
 * Genera mantenimientos preventivos
 */
function generarMantenimientos() {
  if (
    confirm(
      "¿Está seguro de generar los mantenimientos preventivos pendientes?"
    )
  ) {
    // Mostrar indicador de carga
    if (window.showLoading) {
      window.showLoading();
    }

    // Enviar solicitud AJAX
    $.ajax({
      url: getUrl("api/mantenimiento/preventivo/generar.php"),
      type: "POST",
      dataType: "json",
      success: (response) => {
        if (response.success) {
          // Actualizar calendario
          recargarCalendario();

          // Mostrar mensaje de éxito
          if (window.showSuccessToast) {
            window.showSuccessToast(
              response.message +
                ". Se generaron " +
                response.mantenimientos_generados +
                " mantenimientos."
            );
          }
        } else {
          if (window.showErrorToast) {
            window.showErrorToast(
              response.message || "Error al generar mantenimientos"
            );
          }
        }
      },
      error: (xhr, status, error) => {
        console.error("Error al generar mantenimientos:", error);
        if (window.showErrorToast) {
          window.showErrorToast("Error de conexión al generar mantenimientos");
        }
      },
      complete: () => {
        // Ocultar indicador de carga
        if (window.hideLoading) {
          window.hideLoading();
        }
      },
    });
  }
}

/**
 * Completa un mantenimiento desde el modal de detalles
 */
function completarDesdeDetalle() {
  // Cerrar modal de detalles
  const modalDetalle = bootstrap.Modal.getInstance(
    document.getElementById("modal-detalle-mantenimiento")
  );
  modalDetalle.hide();

  // Abrir modal de completar
  if (mantenimientoActual && mantenimientoActual.id) {
    setTimeout(() => {
      mostrarModalCompletarMantenimiento(mantenimientoActual.id);
    }, 500);
  }
}

/**
 * Amplía la imagen del mantenimiento en el modal de detalles
 */
function ampliarImagenDetalle() {
  const imagen = $("#detalle-imagen").attr("src");
  try {
    if (imagen && window.imageViewer) {
      window.imageViewer.show(imagen, "Imagen del equipo/componente");
    }
  } catch (e) {
    console.error("Error al mostrar la imagen:", e);
  }
}

/**
 * Aplica los filtros seleccionados al calendario
 */
function aplicarFiltros() {
  // Obtener valores de filtros
  const tipo = $("#filtro-tipo").val();
  const equipo = $("#filtro-equipo").val();
  const componente = $("#filtro-componente").val();
  const estado = $("#filtro-estado").val();

  // Actualizar filtros activos
  filtrosAplicados = {};
  if (tipo) filtrosAplicados.tipo = tipo;
  if (equipo) filtrosAplicados.equipo_id = equipo;
  if (componente) filtrosAplicados.componente_id = componente;
  if (estado) filtrosAplicados.estado = estado;

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Aplicando filtros...");
  }

  // Recargar calendario
  recargarCalendario();
}

/**
 * Limpia los filtros aplicados
 */
function limpiarFiltros() {
  // Restablecer valores de filtros
  $("#filtro-tipo").val("");
  $("#filtro-equipo").val("");
  $("#filtro-componente").val("");
  $("#filtro-estado").val("");

  // Limpiar filtros activos
  filtrosAplicados = {};

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Limpiando filtros...");
  }

  // Recargar calendario
  recargarCalendario();
}

/**
 * Obtiene la unidad según el tipo de orómetro
 * @param {string} tipoOrometro - Tipo de orómetro (horas o kilometros)
 * @returns {string} - Unidad (hrs o km)
 */
function getUnidadOrometro(tipoOrometro) {
  return tipoOrometro && tipoOrometro.toLowerCase() === "kilometros"
    ? "km"
    : "hrs";
}

/**
 * Capitaliza la primera letra de un texto
 * @param {string} texto - Texto a capitalizar
 * @returns {string} - Texto con la primera letra en mayúscula
 */
function capitalizarPrimeraLetra(string) {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Formatea un número para mostrar
 * @param {number} numero - Número a formatear
 * @returns {string} - Número formateado
 */
function formatearNumero(numero) {
  if (numero === null || numero === undefined) return "0";
  return Number.parseFloat(numero)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formatea una fecha para mostrar
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
function formatearFecha(fecha) {
  if (!fecha) return "-";
  const date = new Date(fecha);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Muestra un mensaje toast
 * @param {string} tipo - Tipo de mensaje (success, error, warning, info)
 * @param {string} titulo - Título del mensaje
 * @param {string} mensaje - Contenido del mensaje
 * @param {number} duracion - Duración en milisegundos (opcional)
 */
function mostrarToast(tipo, titulo, mensaje, duracion) {
  // Verificar si existe la función showToast (del componente toast)
  if (typeof showToast === "function") {
    showToast(tipo, titulo, mensaje, duracion);
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
function showLoadingOverlay() {
  // Si existe un componente de carga, usarlo
  if (typeof window.showLoading === "function") {
    window.showLoading();
  }
}

/**
 * Oculta el indicador de carga
 */
function hideLoadingOverlay() {
  // Si existe un componente de carga, usarlo
  if (typeof window.hideLoading === "function") {
    window.hideLoading();
  }
}

/**
 * Verifica si el usuario tiene un permiso específico
 * @param {string} permiso - Permiso a verificar
 * @returns {boolean} - true si tiene el permiso, false en caso contrario
 */
function tienePermiso(permiso) {
  // Verificación basada en elementos del DOM
  if (permiso === "mantenimientos.preventivo.generar") {
    return $("#btn-generar-mantenimientos").length > 0;
  } else if (permiso === "mantenimientos.preventivo.editar") {
    return $("#btn-completar-desde-detalle").length > 0;
  }

  return false;
}

// Añadir función showInfoToast si no existe
if (!window.showInfoToast) {
  window.showInfoToast = (msg) => {
    console.log(msg);
    // Si existe showSuccessToast, usarlo con un estilo diferente
    if (window.showSuccessToast) {
      try {
        // Intentar llamar a la función con un tipo diferente
        window.showSuccessToast(msg, "info");
      } catch (e) {
        console.log("Info toast:", msg);
      }
    }
  };
}
