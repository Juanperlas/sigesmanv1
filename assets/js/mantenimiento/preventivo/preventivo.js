/**
 * Módulo de Mantenimiento Preventivo - JavaScript
 * SIGESMANV1
 */

// Variables globales
let mantenimientosTable;
let mantenimientoSeleccionado = null;
let mantenimientoActual = null;
let filtrosAplicados = {};
let imageUploader;
let calendario;

// Constantes
const UNIDADES_OROMETRO = {
  horas: "hrs",
  kilometros: "km",
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
if (!window.ImageUpload)
  window.ImageUpload = () => {
    console.log("Componente de carga de imágenes no disponible");
  };
if (!window.showLoading) window.showLoading = () => {};
if (!window.hideLoading) window.hideLoading = () => {};

// Inicialización cuando el DOM está listo
$(document).ready(function () {
  // Inicializar DataTable
  inicializarTabla();

  // Inicializar validación del formulario
  inicializarValidacionFormulario();

  // Inicializar calendario si estamos en la pestaña de calendario
  if ($("#calendario-mantenimientos").length > 0) {
    inicializarCalendario();
  }

  // Eventos para botones y controles
  $("#btn-nuevo-mantenimiento").on("click", mostrarModalNuevoMantenimiento);
  $("#btn-guardar-mantenimiento").on("click", guardarMantenimiento);
  $("#btn-aplicar-filtros").on("click", aplicarFiltros);
  $("#btn-limpiar-filtros").on("click", limpiarFiltros);
  $("#btn-ver-imagen").on("click", ampliarImagenDetalle);
  $("#btn-editar-desde-detalle").on("click", editarDesdeDetalle);
  $("#btn-completar-mantenimiento").on("click", mostrarFormularioCompletar);
  $("#btn-guardar-completar").on("click", guardarCompletarMantenimiento);
  $("#btn-confirmar-completar").on("click", completarMantenimientoConfirmado);

  // Eventos para campos de formulario
  $("#tipo-equipo, #tipo-componente").on("change", cambiarTipoSeleccion);
  $("#mantenimiento-equipo").on("change", cargarDatosEquipo);
  $("#mantenimiento-componente").on("change", cargarDatosComponente);

  // Eventos para pestañas
  $('#preventivo-tabs a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
    if (e.target.id === 'calendario-tab') {
      if (calendario) {
        calendario.render();
      } else {
        inicializarCalendario();
      }
    }
  });

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
 * Inicializa la tabla de mantenimientos con DataTables
 */
function inicializarTabla() {
  mantenimientosTable = $("#mantenimientos-table").DataTable({
    processing: true,
    serverSide: true,
    responsive: true,
    ajax: {
      url: getUrl("api/mantenimiento/preventivo/listar.php"),
      type: "POST",
      data: (d) => {
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
      error: (xhr, error, thrown) => {
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
        data: null,
        orderable: false,
        className: "text-center",
        render: function (data, type, row) {
          let icono = '<i class="bi bi-gear-fill text-primary"></i>';
          if (row.componente_id) {
            icono = '<i class="bi bi-tools text-warning"></i>';
          }
          return icono;
        },
      },
      {
        data: "codigo",
        className: "align-middle",
        render: function (data, type, row) {
          return row.componente_id ? row.componente_codigo : row.equipo_codigo;
        }
      },
      {
        data: "nombre",
        className: "align-middle",
        render: function (data, type, row) {
          return row.componente_id ? row.componente_nombre : row.equipo_nombre;
        }
      },
      {
        data: "orometro_programado",
        className: "align-middle text-center",
        render: function (data, type, row) {
          // Para ordenamiento, devolver el valor numérico
          if (type === "sort" || type === "type") {
            return Number.parseFloat(data || 0);
          }
          const unidad = getUnidadOrometro(row.tipo_orometro);
          return `<span class="orometro-valor">${formatearNumero(
            data || 0
          )} ${unidad}</span>`;
        },
      },
      {
        data: "orometro_actual",
        className: "align-middle text-center",
        render: function (data, type, row) {
          // Para ordenamiento, devolver el valor numérico
          if (type === "sort" || type === "type") {
            return Number.parseFloat(data || 0);
          }

          // Calcular el progreso para la barra
          const programado = Number.parseFloat(row.orometro_programado || 0);
          const actual = Number.parseFloat(data || 0);
          const unidad = getUnidadOrometro(row.tipo_orometro);

          let porcentaje = 0;
          let colorClass = "bg-success";
          let textColorClass = "text-success";

          if (programado > 0) {
            // Calcular el porcentaje de avance
            porcentaje = Math.min(Math.max((actual / programado) * 100, 0), 100);

            // Determinar el color según la proximidad al mantenimiento programado
            if (actual >= programado) {
              colorClass = "bg-danger";
              textColorClass = "text-danger";
            } else if (actual >= programado * 0.9) {
              colorClass = "bg-warning";
              textColorClass = "text-warning";
            }
          }

          // Construir la barra de progreso
          const progressBar = `
            <div class="progress mt-1" style="height: 4px;">
              <div class="progress-bar ${colorClass}" role="progressbar" 
                style="width: ${porcentaje}%" 
                aria-valuenow="${porcentaje}" 
                aria-valuemin="0" 
                aria-valuemax="100"></div>
            </div>
          `;

          return `
            <div>
              <span class="orometro-valor ${textColorClass} fw-bold">${formatearNumero(
                data || 0
              )} ${unidad}</span>
              ${progressBar}
            </div>
          `;
        },
      },
      {
        data: "fecha_hora_programada",
        className: "align-middle text-center",
        render: function (data, type, row) {
          if (type === "sort" || type === "type") {
            return data ? new Date(data).getTime() : 0;
          }
          return data ? formatearFecha(data) : "-";
        },
      },
      {
        data: "estado",
        className: "align-middle text-center",
        render: function (data, type) {
          // Para ordenamiento, devolver el valor sin formato
          if (type === "sort" || type === "type") {
            return data;
          }
          return `<span class="estado-badge estado-${data.toLowerCase()}">${capitalizarPrimeraLetra(
            data
          )}</span>`;
        },
      },
      {
        data: null,
        orderable: false,
        className: "text-center align-middle",
        render: function (data) {
          let acciones = '<div class="btn-group btn-group-sm">';
          acciones += `<button type="button" class="btn-accion btn-ver-mantenimiento" data-id="${data.id}" title="Ver detalles"><i class="bi bi-eye"></i></button>`;

          if (tienePermiso("mantenimientos.preventivo.editar") && data.estado !== "completado") {
            acciones += `<button type="button" class="btn-accion btn-editar-mantenimiento" data-id="${data.id}" title="Editar"><i class="bi bi-pencil"></i></button>`;
          }

          if (tienePermiso("mantenimientos.preventivo.completar") && data.estado !== "completado") {
            acciones += `<button type="button" class="btn-accion btn-completar-mantenimiento" data-id="${data.id}" title="Completar"><i class="bi bi-check-circle"></i></button>`;
          }

          acciones += "</div>";
          return acciones;
        },
      },
    ],
    dom: '<"row"<"col-md-6"B><"col-md-6"f>>rt<"row"<"col-md-6"l><"col-md-6"p>>',
    buttons: [
      {
        extend: "copy",
        text: '<i class="bi bi-clipboard"></i> Copiar',
        className: "btn btn-sm",
        exportOptions: {
          columns: [1, 2, 3, 4, 5, 6],
        },
      },
      {
        extend: "excel",
        text: '<i class="bi bi-file-earmark-excel"></i> Excel',
        className: "btn btn-sm",
        exportOptions: {
          columns: [1, 2, 3, 4, 5, 6],
        },
      },
      {
        extend: "pdf",
        text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
        className: "btn btn-sm btn-primary",
        exportOptions: {
          columns: [1, 2, 3, 4, 5, 6],
        },
        customize: function (doc) {
          // Configuración básica del documento
          doc.pageOrientation = "landscape";
          doc.defaultStyle = {
            fontSize: 8,
            color: "#333333",
          };
          
          // Definir colores pastel con sus versiones oscuras para texto
          const colores = {
            // Colores pastel para fondos
            azulPastel: "#D4E6F1",
            verdePastel: "#D5F5E3",
            naranjaPastel: "#FAE5D3",
            rojoPastel: "#F5B7B1",
            grisPastel: "#EAECEE",
            celestePastel: "#EBF5FB",
            
            // Colores oscuros para texto
            azulOscuro: "#1A5276",
            verdeOscuro: "#186A3B",
            naranjaOscuro: "#BA4A00",
            rojoOscuro: "#922B21",
            grisOscuro: "#424949",
            celesteOscuro: "#2874A6",
            
            // Color primario azul
            azulPrimario: "#0055A4"
          };
          
          // Logo en base64
          const logoBase64 = "data:image/png;base64,...";
          
          // Encabezado con logos a ambos lados
          doc.content.unshift(
            {
              columns: [
                {
                  // Logo izquierdo
                  image: logoBase64,
                  width: 50,
                  margin: [5, 5, 0, 5],
                },
                {
                  // Título central
                  text: 'REPORTE DE MANTENIMIENTOS PREVENTIVOS',
                  style: 'header',
                  alignment: 'center',
                  margin: [0, 15, 0, 0],
                },
                {
                  // Logo derecho
                  image: logoBase64,
                  width: 50,
                  alignment: 'right',
                  margin: [0, 5, 5, 5],
                }
              ],
              columnGap: 10
            },
            {
              columns: [
                {
                  text: 'Empresa: VOL COMPANY SAC - Empresa Minera',
                  style: 'empresa',
                  margin: [5, 0, 0, 5],
                },
                {
                  text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
                  style: 'empresa',
                  alignment: 'right',
                  margin: [0, 0, 5, 5],
                }
              ]
            }
          );
      
          // Encontrar la tabla dinámicamente
          let tableIndex = doc.content.findIndex((item) => item.table);
          if (tableIndex !== -1) {
            // Configurar anchos de columnas proporcionales
            doc.content[tableIndex].table.widths = [
              40, // Código
              '*', // Nombre
              60, // Orómetro Prog.
              60, // Orómetro Actual
              80, // Fecha Prog.
              60, // Estado
            ];
            
            // Estilizar la tabla
            doc.content[tableIndex].table.body.forEach((row, i) => {
              if (i === 0) {
                // Encabezado
                row.forEach((cell) => {
                  cell.fillColor = colores.azulPastel;
                  cell.color = colores.azulOscuro;
                  cell.fontSize = 9;
                  cell.bold = true;
                  cell.alignment = "center";
                  cell.margin = [2, 3, 2, 3];
                });
              } else {
                // Filas de datos
                const estado = row[5].text.toString().toLowerCase(); // Columna 'estado' (índice 5 para mantenimientos)
                
                // Determinar color según estado (usando colores pastel)
                let colorFondo = colores.azulPastel;
                let colorTexto = colores.azulOscuro;
                
                if (estado.includes("pendiente")) {
                  colorFondo = colores.naranjaPastel;
                  colorTexto = colores.naranjaOscuro;
                } else if (estado.includes("completado")) {
                  colorFondo = colores.verdePastel;
                  colorTexto = colores.verdeOscuro;
                }
                
                // Aplicar estilos a cada celda
                row.forEach((cell, j) => {
                  cell.fontSize = 8;
                  cell.margin = [2, 2, 2, 2];
                  
                  // Alineación según tipo de dato
                  if (j === 1) { // Nombre
                    cell.alignment = "left";
                  } else if (j === 5) { // Estado
                    cell.fillColor = colorFondo;
                    cell.color = colorTexto;
                    cell.alignment = "center";
                    cell.bold = true;
                  } else if (j >= 2 && j <= 4) { // Datos numéricos y fecha
                    cell.alignment = "center";
                  } else {
                    cell.alignment = "center";
                  }
                });
                
                // Añadir líneas zebra para mejor legibilidad
                if (i % 2 === 0) {
                  row.forEach((cell, j) => {
                    if (j !== 5 && !cell.fillColor) { // No sobrescribir el color de estado
                      cell.fillColor = "#f9f9f9";
                    }
                  });
                }
              }
            });
          }
      
          // Añadir pie de página simplificado
          doc.footer = function (currentPage, pageCount) {
            return {
              text: `Página ${currentPage} de ${pageCount}`,
              alignment: 'center',
              fontSize: 8,
              margin: [0, 0, 0, 0]
            };
          };
          
          // Añadir texto de firmas
          doc.content.push(
            {
              columns: [
                {
                  text: 'JEFE DE MANTENIMIENTO',
                  alignment: 'center',
                  fontSize: 8,
                  margin: [0, 60, 0, 0]
                }
              ]
            }
          );
      
          // Definir estilos
          doc.styles = {
            header: {
              fontSize: 14,
              bold: true,
              color: colores.azulPrimario
            },
            empresa: {
              fontSize: 9,
              color: colores.azulOscuro,
              bold: true
            }
          };
      
          // Metadatos del PDF
          doc.info = {
            title: "Reporte de Mantenimientos Preventivos",
            author: "VOL COMPANY SAC",
            subject: "Listado de Mantenimientos Preventivos",
          };
        },
        filename: 'Reporte_Mantenimientos_Preventivos_' + new Date().toISOString().split('T')[0],
        orientation: 'landscape',
      },
      {
        extend: "print",
        text: '<i class="bi bi-printer"></i> Imprimir',
        className: "btn btn-sm",
        exportOptions: {
          columns: [1, 2, 3, 4, 5, 6],
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
      $("#mantenimientos-table").on("click", ".btn-ver-mantenimiento", function () {
        const id = $(this).data("id");
        verDetallesMantenimiento(id);
      });

      $("#mantenimientos-table").on(
        "click",
        ".btn-editar-mantenimiento",
        function () {
          const id = $(this).data("id");
          editarMantenimiento(id);
        }
      );

      $("#mantenimientos-table").on(
        "click",
        ".btn-completar-mantenimiento",
        function () {
          const id = $(this).data("id");
          completarMantenimiento(id);
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
            $("#mantenimiento-detalle").removeClass("loading").addClass("loaded");
          }, 300);
        }
      });
    },
    // Manejar el error de "Todos" registros
    drawCallback: () => {
      if (window.hideLoading) {
        window.hideLoading();
      }
    },
    preDrawCallback: () => {
      if (window.showLoading) {
        window.showLoading();
      }
    },
  });
}

/**
 * Inicializa la validación del formulario de mantenimientos
 */
function inicializarValidacionFormulario() {
  $("#form-mantenimiento").validate({
    rules: {
      equipo_id: {
        required: function() {
          return $("#tipo-equipo").is(":checked");
        }
      },
      componente_id: {
        required: function() {
          return $("#tipo-componente").is(":checked");
        }
      },
      descripcion_razon: {
        required: true,
        minlength: 3,
        maxlength: 500,
      },
      orometro_programado: {
        required: true,
        number: true,
        min: 0,
      }
    },
    messages: {
      equipo_id: {
        required: "Debe seleccionar un equipo",
      },
      componente_id: {
        required: "Debe seleccionar un componente",
      },
      descripcion_razon: {
        required: "La descripción es obligatoria",
        minlength: "La descripción debe tener al menos 3 caracteres",
        maxlength: "La descripción no puede tener más de 500 caracteres",
      },
      orometro_programado: {
        required: "El orómetro programado es obligatorio",
        number: "Debe ingresar un número válido",
        min: "El valor debe ser mayor o igual a 0",
      }
    },
    errorElement: "span",
    errorPlacement: function (error, element) {
      error.addClass("invalid-feedback");
      element.closest(".form-group").append(error);
    },
    highlight: function (element, errorClass, validClass) {
      $(element).addClass("is-invalid");
    },
    unhighlight: function (element, errorClass, validClass) {
      $(element).removeClass("is-invalid");
    },
  });
}

/**
 * Inicializa el calendario de mantenimientos
 */
function inicializarCalendario() {
  const calendarEl = document.getElementById('calendario-mantenimientos');
  
  if (!calendarEl) return;
  
  calendario = new FullCalendar.Calendar(calendarEl, {
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
    events: function(info, successCallback, failureCallback) {
      // Obtener eventos del servidor
      $.ajax({
        url: getUrl("api/mantenimiento/preventivo/calendario.php"),
        type: 'GET',
        data: {
          start: info.startStr,
          end: info.endStr,
          ...filtrosAplicados
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
    }
  });
  
  calendario.render();
  
  // Eventos para los botones de vista
  $("#btn-vista-mes").on("click", function() {
    calendario.changeView('dayGridMonth');
  });
  
  $("#btn-vista-semana").on("click", function() {
    calendario.changeView('timeGridWeek');
  });
  
  $("#btn-vista-dia").on("click", function() {
    calendario.changeView('timeGridDay');
  });
}

/**
 * Muestra el modal para crear un nuevo mantenimiento
 */
function mostrarModalNuevoMantenimiento() {
  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Preparando formulario para nuevo mantenimiento preventivo...");
  }

  // Limpiar formulario
  $("#form-mantenimiento")[0].reset();
  $("#mantenimiento-id").val("");

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

/**
 * Cambia entre selección de equipo o componente
 */
function cambiarTipoSeleccion() {
  if ($("#tipo-equipo").is(":checked")) {
    $("#contenedor-equipo").removeClass("d-none");
    $("#contenedor-componente").addClass("d-none");
    $("#mantenimiento-componente").val("");
  } else {
    $("#contenedor-equipo").addClass("d-none");
    $("#contenedor-componente").removeClass("d-none");
    $("#mantenimiento-equipo").val("");
  }
  
  // Resetear información de orómetro
  $("#orometro-actual").text("0");
  $(".unidad-orometro").text("hrs");
}

/**
 * Carga los datos del equipo seleccionado
 */
function cargarDatosEquipo() {
  const equipoId = $("#mantenimiento-equipo").val();
  
  if (!equipoId) {
    $("#orometro-actual").text("0");
    $(".unidad-orometro").text("hrs");
    return;
  }
  
  // Mostrar indicador de carga
  $("#orometro-actual").html('<small><i class="spinner-border spinner-border-sm"></i> Cargando...</small>');
  
  // Obtener datos del equipo
  $.ajax({
    url: getUrl("api/equipos/obtener.php"),
    type: "GET",
    data: { id: equipoId },
    dataType: "json",
    success: function(response) {
      if (response.success) {
        const equipo = response.data;
        
        // Actualizar información de orómetro
        $("#orometro-actual").text(formatearNumero(equipo.orometro_actual || 0));
        
        // Actualizar unidad de orómetro
        const unidad = getUnidadOrometro(equipo.tipo_orometro);
        $(".unidad-orometro").text(unidad);
        
      } else {
        $("#orometro-actual").text("0");
        if (window.showErrorToast) {
          window.showErrorToast(response.message || "Error al obtener datos del equipo");
        }
      }
    },
    error: function() {
      $("#orometro-actual").text("0");
      if (window.showErrorToast) {
        window.showErrorToast("Error de conexión al obtener datos del equipo");
      }
    }
  });
}

/**
 * Carga los datos del componente seleccionado
 */
function cargarDatosComponente() {
  const componenteId = $("#mantenimiento-componente").val();
  
  if (!componenteId) {
    $("#orometro-actual").text("0");
    $(".unidad-orometro").text("hrs");
    return;
  }
  
  // Mostrar indicador de carga
  $("#orometro-actual").html('<small><i class="spinner-border spinner-border-sm"></i> Cargando...</small>');
  
  // Obtener datos del componente
  $.ajax({
    url: getUrl("api/equipos/componentes/obtener.php"),
    type: "GET",
    data: { id: componenteId },
    dataType: "json",
    success: function(response) {
      if (response.success) {
        const componente = response.data;
        
        // Actualizar información de orómetro
        $("#orometro-actual").text(formatearNumero(componente.orometro_actual || 0));
        
        // Actualizar unidad de orómetro
        const unidad = getUnidadOrometro(componente.tipo_orometro);
        $(".unidad-orometro").text(unidad);
        
      } else {
        $("#orometro-actual").text("0");
        if (window.showErrorToast) {
          window.showErrorToast(response.message || "Error al obtener datos del componente");
        }
      }
    },
    error: function() {
      $("#orometro-actual").text("0");
      if (window.showErrorToast) {
        window.showErrorToast("Error de conexión al obtener datos del componente");
      }
    }
  });
}

/**
 * Guarda un mantenimiento (nuevo o existente)
 */
function guardarMantenimiento() {
  // Validar formulario
  if (!$("#form-mantenimiento").valid()) {
    mostrarToast(
      "warning",
      "Atención",
      "Por favor, complete todos los campos obligatorios"
    );
    return;
  }

  // Preparar datos del formulario
  const formData = new FormData($("#form-mantenimiento")[0]);

  // Mostrar indicador de carga
  $("#btn-guardar-mantenimiento")
    .prop("disabled", true)
    .html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...'
    );

  // Enviar solicitud AJAX
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/guardar.php"),
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    dataType: "json",
    success: function (response) {
      if (response.success) {
        // Cerrar modal
        bootstrap.Modal.getInstance(
          document.getElementById("modal-mantenimiento")
        ).hide();

        // Actualizar tabla
        mantenimientosTable.ajax.reload();
        
        // Actualizar calendario si existe
        if (calendario) {
          calendario.refetchEvents();
        }

        // Mostrar mensaje de éxito
        mostrarToast("success", "Éxito", response.message);
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al guardar el mantenimiento"
        );
      }
    },
    error: function (xhr, status, error) {
      mostrarToast(
        "error",
        "Error",
        "Error en la comunicación con el servidor"
      );
      console.error(xhr.responseText);
    },
    complete: function () {
      // Restaurar botón
      $("#btn-guardar-mantenimiento").prop("disabled", false).html("Guardar");
    },
  });
}

/**
 * Edita un mantenimiento existente
 * @param {number} id - ID del mantenimiento a editar
 */
function editarMantenimiento(id) {
  // Verificar que el ID sea válido
  if (!id || isNaN(parseInt(id))) {
    mostrarToast("error", "Error", "ID de mantenimiento no válido");
    console.error("ID de mantenimiento inválido:", id);
    return;
  }

  // Mostrar indicador de carga
  mostrarToast(
    "info",
    "Cargando",
    "Obteniendo información del mantenimiento...",
    1000
  );

  // Obtener datos del mantenimiento
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/obtener.php"),
    type: "GET",
    data: { id: id },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        const mantenimiento = response.data;
        mantenimientoActual = mantenimiento;

        // Limpiar formulario
        $("#form-mantenimiento")[0].reset();

        // Llenar formulario con datos del mantenimiento
        $("#mantenimiento-id").val(mantenimiento.id);
        $("#mantenimiento-descripcion").val(mantenimiento.descripcion_razon);
        $("#mantenimiento-orometro").val(mantenimiento.orometro_programado);
        $("#mantenimiento-fecha").val(mantenimiento.fecha_hora_programada ? formatearFechaInput(mantenimiento.fecha_hora_programada) : "");
        $("#mantenimiento-observaciones").val(mantenimiento.observaciones);

        // Establecer tipo de selección
        if (mantenimiento.componente_id) {
          $("#tipo-componente").prop("checked", true);
          $("#contenedor-equipo").addClass("d-none");
          $("#contenedor-componente").removeClass("d-none");
          $("#mantenimiento-componente").val(mantenimiento.componente_id);
          cargarDatosComponente();
        } else {
          $("#tipo-equipo").prop("checked", true);
          $("#contenedor-equipo").removeClass("d-none");
          $("#contenedor-componente").addClass("d-none");
          $("#mantenimiento-equipo").val(mantenimiento.equipo_id);
          cargarDatosEquipo();
        }

        // Actualizar título del modal
        $("#modal-mantenimiento-titulo").text("Editar Mantenimiento Preventivo");

        // Mostrar modal
        const modal = new bootstrap.Modal(
          document.getElementById("modal-mantenimiento")
        );
        modal.show();
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al obtener el mantenimiento"
        );
      }
    },
    error: function (xhr, status, error) {
      console.error("Error en la solicitud AJAX:", status, error);
      console.error("Respuesta del servidor:", xhr.responseText);

      let mensaje = "Error en la comunicación con el servidor";
      try {
        const respuesta = JSON.parse(xhr.responseText);
        if (respuesta && respuesta.message) {
          mensaje = respuesta.message;
        }
      } catch (e) {
        console.error("Error al parsear la respuesta:", e);
      }

      mostrarToast("error", "Error", mensaje);
    },
  });
}

/**
 * Muestra el modal para completar un mantenimiento
 * @param {number} id - ID del mantenimiento a completar
 */
function completarMantenimiento(id) {
  // Verificar que el ID sea válido
  if (!id || isNaN(parseInt(id))) {
    mostrarToast("error", "Error", "ID de mantenimiento no válido");
    console.error("ID de mantenimiento inválido:", id);
    return;
  }

  // Obtener datos del mantenimiento
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/obtener.php"),
    type: "GET",
    data: { id: id },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        const mantenimiento = response.data;
        mantenimientoActual = mantenimiento;

        // Mostrar modal de detalles
        verDetallesMantenimiento(id, true);
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al obtener el mantenimiento"
        );
      }
    },
    error: function (xhr, status, error) {
      mostrarToast(
        "error",
        "Error",
        "Error en la comunicación con el servidor"
      );
      console.error(xhr.responseText);
    },
  });
}

/**
 * Muestra el formulario para completar un mantenimiento
 */
function mostrarFormularioCompletar() {
  // Ocultar botón de completar y mostrar formulario
  $("#btn-completar-mantenimiento").addClass("d-none");
  $("#btn-guardar-completar").removeClass("d-none");
  $("#contenedor-completar").removeClass("d-none");
  
  // Establecer ID del mantenimiento
  $("#completar-id").val(mantenimientoActual.id);
}

/**
 * Guarda el completado de un mantenimiento
 */
function guardarCompletarMantenimiento() {
  // Mostrar modal de confirmación
  const modal = new bootstrap.Modal(
    document.getElementById("modal-confirmar-completar")
  );
  modal.show();
}

/**
 * Completa un mantenimiento después de la confirmación
 */
function completarMantenimientoConfirmado() {
  const id = $("#completar-id").val();
  const observaciones = $("#completar-observaciones").val();
  
  if (!id) {
    mostrarToast("error", "Error", "ID de mantenimiento no válido");
    return;
  }

  // Mostrar indicador de carga
  $("#btn-confirmar-completar")
    .prop("disabled", true)
    .html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...'
    );

  // Enviar solicitud AJAX
  $.ajax({
    url: getUrl("api/mantenimiento/preventivo/completar.php"),
    type: "POST",
    data: { 
      id: id,
      observaciones: observaciones
    },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        // Cerrar modales
        bootstrap.Modal.getInstance(
          document.getElementById("modal-confirmar-completar")
        ).hide();
        
        bootstrap.Modal.getInstance(
          document.getElementById("modal-detalle-mantenimiento")
        ).hide();

        // Actualizar tabla
        mantenimientosTable.ajax.reload();
        
        // Actualizar calendario si existe
        if (calendario) {
          calendario.refetchEvents();
        }

        // Mostrar mensaje de éxito
        mostrarToast("success", "Éxito", response.message);
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al completar el mantenimiento"
        );
      }
    },
    error: function (xhr, status, error) {
      mostrarToast(
        "error",
        "Error",
        "Error en la comunicación con el servidor"
      );
      console.error(xhr.responseText);
    },
    complete: function () {
      // Restaurar botón
      $("#btn-confirmar-completar")
        .prop("disabled", false)
        .html('<i class="bi bi-check-circle me-2"></i>Confirmar Completado');
    },
  });
}

/**
 * Carga los detalles de un mantenimiento en el panel lateral
 * @param {number} id - ID del mantenimiento
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
    data: { id: id },
    dataType: "json",
    success: (response) => {
      if (response.success && response.data) {
        const mantenimiento = response.data;
        mantenimientoSeleccionado = mantenimiento;
        
        // Determinar tipo (equipo o componente)
        const esComponente = mantenimiento.componente_id ? true : false;
        const nombre = esComponente ? mantenimiento.componente_nombre : mantenimiento.equipo_nombre;
        const codigo = esComponente ? mantenimiento.componente_codigo : mantenimiento.equipo_codigo;
        const unidad = getUnidadOrometro(mantenimiento.tipo_orometro);
        const imagenUrl = mantenimiento.imagen || getUrl("assets/img/equipos/default.png");

        // Actualizar el encabezado con la imagen
        $("#mantenimiento-detalle .detail-header").html(`
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2 class="detail-title">${nombre}</h2>
              <p class="detail-subtitle">Código: ${codigo}</p>
            </div>
            <div class="detail-header-image">
              <img src="${imagenUrl}" alt="${nombre}" class="detail-header-img" data-image-viewer="true">
            </div>
          </div>
        `);

        // Calcular tiempo restante para mantenimiento
        let tiempoRestante = "";
        let colorClase = "success";

        if (mantenimiento.estado === "pendiente") {
          // Verificar si hay orómetro programado
          if (mantenimiento.orometro_programado && mantenimiento.orometro_actual) {
            const restante = Number.parseFloat(mantenimiento.orometro_programado) - Number.parseFloat(mantenimiento.orometro_actual);
            
            // Determinar color según proximidad
            if (restante <= 0) {
              colorClase = "danger";
              tiempoRestante = `
                <div class="tiempo-restante-container text-center mb-4">
                  <h3 class="tiempo-restante-titulo">¡Mantenimiento requerido!</h3>
                  <div class="tiempo-restante-valor text-danger">Excedido por ${formatearNumero(Math.abs(restante))} ${unidad}</div>
                  <div class="progress mt-2" style="height: 8px;">
                    <div class="progress-bar bg-danger" role="progressbar" 
                      style="width: 100%" 
                      aria-valuenow="100" 
                      aria-valuemin="0" 
                      aria-valuemax="100"></div>
                  </div>
                </div>
              `;
            } else if (restante <= mantenimiento.orometro_programado * 0.1) {
              colorClase = "warning";
              tiempoRestante = `
                <div class="tiempo-restante-container text-center mb-4">
                  <h3 class="tiempo-restante-titulo">Mantenimiento próximo</h3>
                  <div class="tiempo-restante-valor text-warning">Faltan ${formatearNumero(restante)} ${unidad}</div>
                  <div class="progress mt-2" style="height: 8px;">
                    <div class="progress-bar bg-warning" role="progressbar" 
                      style="width: 90%" 
                      aria-valuenow="90" 
                      aria-valuemin="0" 
                      aria-valuemax="100"></div>
                  </div>
                </div>
              `;
            } else {
              tiempoRestante = `
                <div class="tiempo-restante-container text-center mb-4">
                  <h3 class="tiempo-restante-titulo">Tiempo para mantenimiento</h3>
                  <div class="tiempo-restante-valor text-success">Faltan ${formatearNumero(restante)} ${unidad}</div>
                  <div class="progress mt-2" style="height: 8px;">
                    <div class="progress-bar bg-success" role="progressbar" 
                      style="width: ${Math.min(100 - (restante / mantenimiento.orometro_programado) * 100, 80)}%" 
                      aria-valuenow="${Math.min(100 - (restante / mantenimiento.orometro_programado) * 100, 80)}" 
                      aria-valuemin="0" 
                      aria-valuemax="100"></div>
                  </div>
                </div>
              `;
            }
          }
          
          // Verificar si hay fecha programada
          if (mantenimiento.fecha_hora_programada) {
            const fechaProgramada = new Date(mantenimiento.fecha_hora_programada);
            const ahora = new Date();
            const diferenciaDias = Math.ceil((fechaProgramada - ahora) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias < 0) {
              colorClase = "danger";
              tiempoRestante += `
                <div class="tiempo-restante-container text-center mb-4">
                  <h3 class="tiempo-restante-titulo">¡Fecha vencida!</h3>
                  <div class="tiempo-restante-valor text-danger">Vencido hace ${Math.abs(diferenciaDias)} días</div>
                  <div class="progress mt-2" style="height: 8px;">
                    <div class="progress-bar bg-danger" role="progressbar" 
                      style="width: 100%" 
                      aria-valuenow="100" 
                      aria-valuemin="0" 
                      aria-valuemax="100"></div>
                  </div>
                </div>
              `;
            } else if (diferenciaDias <= 3) {
              colorClase = "warning";
              tiempoRestante += `
                <div class="tiempo-restante-container text-center mb-4">
                  <h3 class="tiempo-restante-titulo">Fecha próxima</h3>
                  <div class="tiempo-restante-valor text-warning">Faltan ${diferenciaDias} días</div>
                  <div class="progress mt-2" style="height: 8px;">
                    <div class="progress-bar bg-warning" role="progressbar" 
                      style="width: 90%" 
                      aria-valuenow="90" 
                      aria-valuemin="0" 
                      aria-valuemax="100"></div>
                  </div>
                </div>
              `;
            } else {
              tiempoRestante += `
                <div class="tiempo-restante-container text-center mb-4">
                  <h3 class="tiempo-restante-titulo">Tiempo para la fecha programada</h3>
                  <div class="tiempo-restante-valor text-success">Faltan ${diferenciaDias} días</div>
                  <div class="progress mt-2" style="height: 8px;">
                    <div class="progress-bar bg-success" role="progressbar" 
                      style="width: 50%" 
                      aria-valuenow="50" 
                      aria-valuemin="0" 
                      aria-valuemax="100"></div>
                  </div>
                </div>
              `;
            }
          }
        } else {
          // Mantenimiento completado
          tiempoRestante = `
            <div class="tiempo-restante-container text-center mb-4">
              <h3 class="tiempo-restante-titulo">Mantenimiento completado</h3>
              <div class="tiempo-restante-valor text-secondary">
                <i class="bi bi-check-circle-fill me-2"></i>
                ${mantenimiento.fecha_realizado ? formatearFecha(mantenimiento.fecha_realizado) : 'Completado'}
              </div>
            </div>
          `;
        }

        // Actualizar contenido del panel
        $("#mantenimiento-detalle .detail-content").html(`
          ${tiempoRestante}
          
          <!-- Información básica -->
          <div class="detail-section">
            <div class="detail-section-title">
              <i class="bi bi-info-circle"></i> Información Básica
            </div>
            <div class="row g-2">
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">Tipo:</span>
                  <span class="detail-value">${esComponente ? 'Componente' : 'Equipo'}</span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">Estado:</span>
                  <span class="detail-value">
                    <span class="estado-badge estado-${mantenimiento.estado.toLowerCase()}">${capitalizarPrimeraLetra(mantenimiento.estado)}</span>
                  </span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">Orómetro Programado:</span>
                  <span class="detail-value">${formatearNumero(mantenimiento.orometro_programado)} ${unidad}</span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">Orómetro Actual:</span>
                  <span class="detail-value">${formatearNumero(mantenimiento.orometro_actual)} ${unidad}</span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">Fecha Programada:</span>
                  <span class="detail-value">${mantenimiento.fecha_hora_programada ? formatearFecha(mantenimiento.fecha_hora_programada) : 'No especificada'}</span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">Fecha Realizado:</span>
                  <span class="detail-value">${mantenimiento.fecha_realizado ? formatearFecha(mantenimiento.fecha_realizado) : '-'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Descripción y observaciones -->
          <div class="detail-section">
            <div class="detail-section-title">
              <i class="bi bi-chat-left-text"></i> Descripción y Observaciones
            </div>
            <div class="detail-item mb-2">
              <span class="detail-label">Descripción/Razón:</span>
              <p class="detail-value">${mantenimiento.descripcion_razon || 'Sin descripción'}</p>
            </div>
            <div class="detail-item">
              <span class="detail-label">Observaciones:</span>
              <p class="detail-value">${mantenimiento.observaciones || 'Sin observaciones'}</p>
            </div>
          </div>
          
          <div class="detail-actions">
            <button type="button" class="btn btn-sm btn-primary btn-ver-detalles" data-id="${mantenimiento.id}">
              <i class="bi bi-search"></i> Ver Detalles Completos
            </button>
            ${
              tienePermiso("mantenimientos.preventivo.editar") && mantenimiento.estado !== "completado"
                ? `
                <button type="button" class="btn btn-sm btn-secondary btn-editar" data-id="${mantenimiento.id}">
                  <i class="bi bi-pencil"></i> Editar
                </button>
              `
                : ""
            }
            ${
              tienePermiso("mantenimientos.preventivo.completar") && mantenimiento.estado !== "completado"
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
              "Imagen del " + (esComponente ? "componente" : "equipo")
            );
          }
        });

        // Eventos para botones en el panel
        $("#mantenimiento-detalle .btn-ver-detalles").on("click", function () {
          verDetallesMantenimiento($(this).data("id"));
        });

        $("#mantenimiento-detalle .btn-editar").on("click", function () {
          editarMantenimiento($(this).data("id"));
        });

        $("#mantenimiento-detalle .btn-completar").on("click", function () {
          completarMantenimiento($(this).data("id"));
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
    error: (xhr, status, error) => {
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
 * Oculta el panel de detalles del mantenimiento
 */
function ocultarDetalleMantenimiento() {
  // Restaurar contenido por defecto
  $("#mantenimiento-detalle").html(`
    <div class="detail-header">
      <h2 class="detail-title">Detalles del Mantenimiento</h2>
      <p class="detail-subtitle">Seleccione un mantenimiento para ver información</p>
    </div>
    <div class="detail-content">
      <div class="detail-empty">
        <div class="detail-empty-icon">
          <i class="bi bi-info-circle"></i>
        </div>
        <div class="detail-empty-text">
          Seleccione un mantenimiento para ver sus detalles
        </div>
      </div>
    </div>
  `);
}

/**
 * Muestra los detalles completos de un mantenimiento en un modal
 * @param {number} id - ID del mantenimiento
 * @param {boolean} mostrarCompletado - Indica si se debe mostrar la opción de completar
 */
function verDetallesMantenimiento(id, mostrarCompletado = false) {
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
        
        // Determinar tipo (equipo o componente)
        const esComponente = mantenimiento.componente_id ? true : false;
        const nombre = esComponente ? mantenimiento.componente_nombre : mantenimiento.equipo_nombre;
        const codigo = esComponente ? mantenimiento.componente_codigo : mantenimiento.equipo_codigo;
        const unidad = getUnidadOrometro(mantenimiento.tipo_orometro);

        // Actualizar datos en el modal
        $("#detalle-nombre").text(nombre);
        $("#detalle-codigo").text(codigo || "-");
        $("#detalle-tipo").text(esComponente ? "Componente" : "Equipo");
        $("#detalle-tipo-orometro").text(capitalizarPrimeraLetra(mantenimiento.tipo_orometro) || "-");
        
        // Actualizar información de orómetros
        $("#detalle-orometro-programado").text(formatearNumero(mantenimiento.orometro_programado || 0) + " " + unidad);
        $("#detalle-orometro-actual").text(formatearNumero(mantenimiento.orometro_actual || 0) + " " + unidad);
        $("#detalle-fecha-programada").text(mantenimiento.fecha_hora_programada ? formatearFecha(mantenimiento.fecha_hora_programada) : "No especificada");
        $("#detalle-fecha-realizado").text(mantenimiento.fecha_realizado ? formatearFecha(mantenimiento.fecha_realizado) : "-");
        
        // Actualizar descripción y observaciones
        $("#detalle-descripcion").text(mantenimiento.descripcion_razon || "-");
        $("#detalle-observaciones").text(mantenimiento.observaciones || "-");

        // Calcular y mostrar tiempo restante
        if (mantenimiento.estado === "pendiente") {
          let tiempoRestanteHTML = "";
          
          // Por orómetro
          if (mantenimiento.orometro_programado && mantenimiento.orometro_actual) {
            const restante = Number.parseFloat(mantenimiento.orometro_programado) - Number.parseFloat(mantenimiento.orometro_actual);
            
            if (restante <= 0) {
              tiempoRestanteHTML += `
                <div class="alert alert-danger mb-2">
                  <strong>¡Mantenimiento requerido por orómetro!</strong> Excedido por ${formatearNumero(Math.abs(restante))} ${unidad}
                </div>
              `;
            } else if (restante <= mantenimiento.orometro_programado * 0.1) {
              tiempoRestanteHTML += `
                <div class="alert alert-warning mb-2">
                  <strong>Mantenimiento próximo por orómetro:</strong> Faltan ${formatearNumero(restante)} ${unidad}
                </div>
              `;
            } else {
              tiempoRestanteHTML += `
                <div class="alert alert-success mb-2">
                  <strong>Tiempo para mantenimiento por orómetro:</strong> Faltan ${formatearNumero(restante)} ${unidad}
                </div>
              `;
            }
          }
          
          // Por fecha
          if (mantenimiento.fecha_hora_programada) {
            const fechaProgramada = new Date(mantenimiento.fecha_hora_programada);
            const ahora = new Date();
            const diferenciaDias = Math.ceil((fechaProgramada - ahora) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias < 0) {
              tiempoRestanteHTML += `
                <div class="alert alert-danger mb-2">
                  <strong>¡Fecha vencida!</strong> Vencido hace ${Math.abs(diferenciaDias)} días
                </div>
              `;
            } else if (diferenciaDias <= 3) {
              tiempoRestanteHTML += `
                <div class="alert alert-warning mb-2">
                  <strong>Fecha próxima:</strong> Faltan ${diferenciaDias} días
                </div>
              `;
            } else {
              tiempoRestanteHTML += `
                <div class="alert alert-success mb-2">
                  <strong>Tiempo para la fecha programada:</strong> Faltan ${diferenciaDias} días
                </div>
              `;
            }
          }
          
          $("#detalle-tiempo-restante").html(tiempoRestanteHTML);
        } else {
          $("#detalle-tiempo-restante").html(`
            <div class="alert alert-secondary mb-2">
              <strong>Mantenimiento completado:</strong> ${mantenimiento.fecha_realizado ? formatearFecha(mantenimiento.fecha_realizado) : 'Completado'}
            </div>
          `);
        }

        // Actualizar imagen
        const imagenUrl = mantenimiento.imagen || getUrl("assets/img/equipos/default.png");
        $("#detalle-imagen").attr("src", imagenUrl);

        // Actualizar estado
        const estadoClases = {
          pendiente: "bg-primary",
          completado: "bg-secondary",
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

        // Configurar botones según el estado
        if (mantenimiento.estado === "completado") {
          $("#btn-editar-desde-detalle").addClass("d-none");
          $("#btn-completar-mantenimiento").addClass("d-none");
          $("#btn-guardar-completar").addClass("d-none");
          $("#contenedor-completar").addClass("d-none");
        } else {
          $("#btn-editar-desde-detalle").removeClass("d-none");
          $("#btn-completar-mantenimiento").removeClass("d-none");
          $("#btn-guardar-completar").addClass("d-none");
          $("#contenedor-completar").addClass("d-none");
          
          // Si se debe mostrar el formulario de completar
          if (mostrarCompletado) {
            mostrarFormularioCompletar();
          }
        }

        // Mostrar modal
        const modalDetalle = new bootstrap.Modal(
          document.getElementById("modal-detalle-mantenimiento")
        );
        modalDetalle.show();
      } else {
        if (window.showErrorToast) {
          window.showErrorToast(
            response.message || "Error al obtener los detalles del mantenimiento"
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
 * Edita un mantenimiento desde el modal de detalles
 */
function editarDesdeDetalle() {
  // Cerrar modal de detalles
  const modalDetalle = bootstrap.Modal.getInstance(
    document.getElementById("modal-detalle-mantenimiento")
  );
  modalDetalle.hide();

  // Abrir modal de edición
  if (mantenimientoActual && mantenimientoActual.id) {
    setTimeout(() => {
      editarMantenimiento(mantenimientoActual.id);
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
 * Aplica los filtros seleccionados a la tabla
 */
function aplicarFiltros() {
  // Obtener valores de filtros
  const equipo = $("#filtro-equipo").val();
  const componente = $("#filtro-componente").val();
  const estado = $("#filtro-estado").val();
  const fechaDesde = $("#filtro-fecha-desde").val();
  const fechaHasta = $("#filtro-fecha-hasta").val();

  // Actualizar filtros activos
  filtrosAplicados = {};
  if (equipo) filtrosAplicados.equipo_id = equipo;
  if (componente) filtrosAplicados.componente_id = componente;
  if (estado) filtrosAplicados.estado = estado;
  if (fechaDesde) filtrosAplicados.fecha_desde = fechaDesde;
  if (fechaHasta) filtrosAplicados.fecha_hasta = fechaHasta;

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Aplicando filtros...");
  }

  // Recargar tabla
  mantenimientosTable.ajax.reload();
  
  // Actualizar calendario si existe
  if (calendario) {
    calendario.refetchEvents();
  }

  // Limpiar panel de detalles
  ocultarDetalleMantenimiento();
  mantenimientoSeleccionado = null;
}

/**
 * Limpia los filtros aplicados
 */
function limpiarFiltros() {
  // Restablecer valores de filtros
  $("#filtro-equipo").val("");
  $("#filtro-componente").val("");
  $("#filtro-estado").val("");
  $("#filtro-fecha-desde").val("");
  $("#filtro-fecha-hasta").val("");

  // Limpiar filtros activos
  filtrosAplicados = {};

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Limpiando filtros...");
  }

  // Recargar tabla
  mantenimientosTable.ajax.reload();
  
  // Actualizar calendario si existe
  if (calendario) {
    calendario.refetchEvents();
  }

  // Limpiar panel de detalles
  ocultarDetalleMantenimiento();
  mantenimientoSeleccionado = null;
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
  if (!fecha) return "";
  const date = new Date(fecha);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
  if (permiso === "mantenimientos.preventivo.crear") {
    return $("#btn-nuevo-mantenimiento").length > 0;
  } else if (permiso === "mantenimientos.preventivo.editar") {
    return $("#btn-editar-desde-detalle").length > 0;
  } else if (permiso === "mantenimientos.preventivo.completar") {
    return $("#btn-completar-mantenimiento").length > 0;
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