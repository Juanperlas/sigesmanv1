/**
 * Módulo de Calendario de Mantenimiento Preventivo - JavaScript
 * SIGESMANV1
 */

// Variables globales
let calendarInstance;
let calendarFiltrosAplicados = {};

// Inicialización cuando el DOM está listo
$(document).ready(function () {
  // Inicializar calendario si estamos en la página de calendario
  if ($("#calendario-mantenimientos").length > 0) {
    inicializarCalendarioCompleto();
  }

  // Eventos para botones y controles
  $("#cal-btn-aplicar-filtros").on("click", aplicarFiltrosCalendario);
  $("#cal-btn-limpiar-filtros").on("click", limpiarFiltrosCalendario);
  $("#btn-vista-mes").on("click", cambiarVistaMes);
  $("#btn-vista-semana").on("click", cambiarVistaSemana);
  $("#btn-vista-dia").on("click", cambiarVistaDia);
});

/**
 * Inicializa el calendario completo
 */
function inicializarCalendarioCompleto() {
  const calendarEl = document.getElementById('calendario-mantenimientos');
  
  if (!calendarEl) return;
  
  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: 'es',
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día'
    },
    height: 'auto',
    contentHeight: 650,
    dayMaxEvents: true, // Permite "more" link cuando hay muchos eventos
    events: function(info, successCallback, failureCallback) {
      // Obtener eventos del servidor
      $.ajax({
        url: getUrl("api/mantenimiento/preventivo/calendario.php"),
        type: 'GET',
        data: {
          start: info.startStr,
          end: info.endStr,
          ...calendarFiltrosAplicados
        },
        success: function(response) {
          if (response.success) {
            const eventos = response.data.map(evento => {
              // Determinar color según estado
              let backgroundColor = '#4361ee'; // Pendiente
              let borderColor = '#4361ee';
              let textColor = '#ffffff';
              let classNames = [];
              
              if (evento.estado === 'completado') {
                backgroundColor = '#c8c8c8';
                borderColor = '#c8c8c8';
                textColor = '#333333';
                classNames.push('evento-completado');
              } else if (evento.vencido) {
                backgroundColor = '#ff6b6b';
                borderColor = '#ff6b6b';
                classNames.push('evento-vencido');
              }
              
              // Si es una fecha estimada (no programada explícitamente)
              if (evento.estimado) {
                classNames.push('evento-estimado');
              }
              
              return {
                id: evento.id,
                title: evento.title,
                start: evento.start,
                end: evento.end,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                textColor: textColor,
                classNames: classNames,
                extendedProps: {
                  id: evento.id,
                  descripcion: evento.descripcion,
                  estado: evento.estado,
                  tipo: evento.tipo,
                  equipo_id: evento.equipo_id,
                  componente_id: evento.componente_id
                }
              };
            });
            
            successCallback(eventos);
          } else {
            failureCallback(response.message);
            if (window.showErrorToast) {
              window.showErrorToast(response.message || "Error al cargar eventos del calendario");
            }
          }
        },
        error: function(xhr, status, error) {
          failureCallback(error);
          if (window.showErrorToast) {
            window.showErrorToast("Error de conexión al cargar el calendario");
          }
        }
      });
    },
    eventClick: function(info) {
      // Mostrar detalles del mantenimiento al hacer clic en un evento
      verDetallesMantenimiento(info.event.extendedProps.id);
    },
    eventDidMount: function(info) {
      // Agregar tooltip con información del evento
      $(info.el).tooltip({
        title: info.event.title,
        placement: 'top',
        trigger: 'hover',
        container: 'body'
      });
    },
    dateClick: function(info) {
      // Al hacer clic en una fecha, mostrar modal para crear nuevo mantenimiento
      if (tienePermiso('mantenimientos.preventivo.crear')) {
        // Limpiar formulario
        $("#form-mantenimiento")[0].reset();
        $("#mantenimiento-id").val("");
        
        // Establecer fecha seleccionada
        const fechaSeleccionada = new Date(info.date);
        fechaSeleccionada.setHours(9, 0, 0); // Establecer hora por defecto (9:00 AM)
        $("#mantenimiento-fecha").val(formatearFechaInput(fechaSeleccionada.toISOString()));
        
        // Establecer tipo de selección por defecto
        $("#tipo-equipo").prop("checked", true);
        $("#contenedor-equipo").removeClass("d-none");
        $("#contenedor-componente").addClass("d-none");
        
        // Actualizar título del modal
        $("#modal-mantenimiento-titulo").text("Nuevo Mantenimiento Preventivo");
        
        // Mostrar modal
        const modal = new bootstrap.Modal(
          document.getElementById("modal-mantenimiento")
        );
        modal.show();
      }
    },
    loading: function(isLoading) {
      if (isLoading) {
        // Mostrar indicador de carga
        if (window.showLoading) {
          window.showLoading();
        }
      } else {
        // Ocultar indicador de carga
        if (window.hideLoading) {
          window.hideLoading();
        }
      }
    }
  });
  
  calendarInstance.render();
}

/**
 * Aplica los filtros seleccionados al calendario
 */
function aplicarFiltrosCalendario() {
  // Obtener valores de filtros
  const equipo = $("#cal-filtro-equipo").val();
  const componente = $("#cal-filtro-componente").val();
  const estado = $("#cal-filtro-estado").val();

  // Actualizar filtros activos
  calendarFiltrosAplicados = {};
  if (equipo) calendarFiltrosAplicados.equipo_id = equipo;
  if (componente) calendarFiltrosAplicados.componente_id = componente;
  if (estado) calendarFiltrosAplicados.estado = estado;

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Aplicando filtros al calendario...");
  }

  // Actualizar calendario
  if (calendarInstance) {
    calendarInstance.refetchEvents();
  }
}

/**
 * Limpia los filtros aplicados al calendario
 */
function limpiarFiltrosCalendario() {
  // Restablecer valores de filtros
  $("#cal-filtro-equipo").val("");
  $("#cal-filtro-componente").val("");
  $("#cal-filtro-estado").val("");

  // Limpiar filtros activos
  calendarFiltrosAplicados = {};

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Limpiando filtros del calendario...");
  }

  // Actualizar calendario
  if (calendarInstance) {
    calendarInstance.refetchEvents();
  }
}

/**
 * Cambia la vista del calendario a mes
 */
function cambiarVistaMes() {
  if (calendarInstance) {
    calendarInstance.changeView('dayGridMonth');
    
    // Actualizar clases de botones
    $("#btn-vista-mes").addClass("active").siblings().removeClass("active");
  }
}

/**
 * Cambia la vista del calendario a semana
 */
function cambiarVistaSemana() {
  if (calendarInstance) {
    calendarInstance.changeView('timeGridWeek');
    
    // Actualizar clases de botones
    $("#btn-vista-semana").addClass("active").siblings().removeClass("active");
  }
}

/**
 * Cambia la vista del calendario a día
 */
function cambiarVistaDia() {
  if (calendarInstance) {
    calendarInstance.changeView('timeGridDay');
    
    // Actualizar clases de botones
    $("#btn-vista-dia").addClass("active").siblings().removeClass("active");
  }
}

/**
 * Formatea una fecha para input datetime-local
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} - Fecha formateada para input
 */
function formatearFechaInput(fecha) {
  if (!fecha) return "";
  const date = new Date(fecha);
  return date.toISOString().slice(0, 16);
}

/**
 * Obtiene la URL base
 * @returns {string} - URL base
 */
function getUrl(path) {
  return window.location.pathname.split("/modulos/")[0] + "/" + path;
}

/**
 * Verifica si el usuario tiene un permiso específico
 * @param {string} permiso - Permiso a verificar
 * @returns {boolean} - true si tiene el permiso, false en caso contrario
 */
function tienePermiso(permiso) {
  // Verificación basada en elementos del DOM
  if (permiso === "mantenimientos.preventivo.crear") {
    return $("#btn-nuevo-mantenimiento").length > 0;
  } else if (permiso === "mantenimientos.preventivo.editar") {
    return $("#btn-editar-desde-detalle").length > 0;
  } else if (permiso === "mantenimientos.preventivo.completar") {
    return $("#btn-completar-mantenimiento").length > 0;
  }

  return false;
}