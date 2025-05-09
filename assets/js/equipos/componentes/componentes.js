/**
 * Módulo de Componentes - JavaScript
 * SIGESMANV1
 */

// Variables globales
let componentesTable;
let componenteSeleccionado = null;
let componenteActual = null;
let filtrosAplicados = {};
let imageUploader;

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

  // Inicializar el cargador de imágenes
  initImageUploader();

  // Inicializar validación del formulario
  inicializarValidacionFormulario();

  // Eventos para botones y controles
  $("#btn-nuevo-componente").on("click", mostrarModalNuevoComponente);
  $("#btn-guardar-componente").on("click", guardarComponente);
  $("#btn-confirmar-eliminar").on("click", eliminarComponenteConfirmado);
  $("#btn-aplicar-filtros").on("click", aplicarFiltros);
  $("#btn-limpiar-filtros").on("click", limpiarFiltros);
  $("#btn-ver-imagen").on("click", ampliarImagenDetalle);
  $("#btn-editar-desde-detalle").on("click", editarDesdeDetalle);

  // Eventos para campos de formulario
  $("#componente-tipo-orometro").on("change", actualizarUnidadesOrometro);
  $("#componente-orometro, #componente-mantenimiento").on(
    "input",
    calcularProximoOrometro
  );

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
 * Inicializa la tabla de componentes con DataTables
 */
function inicializarTabla() {
  componentesTable = $("#componentes-table").DataTable({
    processing: true,
    serverSide: true,
    responsive: true,
    ajax: {
      url: getUrl("api/equipos/componentes/listar.php"),
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
        data: "imagen",
        orderable: false,
        className: "text-center",
        render: function (data, type, row) {
          const imgUrl = data
            ? data
            : getUrl("assets/img/equipos/componentes/default.png");
          return `<img src="${imgUrl}" alt="Imagen" class="componente-imagen-tabla" data-image-viewer="true" data-id="${row.id}">`;
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
        data: "anterior_orometro",
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
            return Number.parseFloat(data);
          }

          // Calcular el progreso para la barra
          const anterior = Number.parseFloat(row.anterior_orometro || 0);
          const actual = Number.parseFloat(data);
          const proximo = Number.parseFloat(row.proximo_orometro || 0);
          const notificacion = Number.parseFloat(row.notificacion || 0);
          const unidad = getUnidadOrometro(row.tipo_orometro);

          let porcentaje = 0;
          let colorClass = "bg-success";
          let textColorClass = "text-success";

          if (proximo > anterior) {
            // Calcular el porcentaje de avance
            const total = proximo - anterior;
            const avance = actual - anterior;
            porcentaje = Math.min(Math.max((avance / total) * 100, 0), 100);

            // Determinar el color según la proximidad al próximo mantenimiento
            const restante = proximo - actual;

            if (notificacion > 0) {
              if (restante <= notificacion / 2) {
                colorClass = "bg-danger";
                textColorClass = "text-danger";
              } else if (restante <= notificacion) {
                colorClass = "bg-warning";
                textColorClass = "text-warning";
              }
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
            data
          )} ${unidad}</span>
                            ${progressBar}
                        </div>
                    `;
        },
      },
      {
        data: "proximo_orometro",
        className: "align-middle text-center",
        render: function (data, type, row) {
          // Para ordenamiento, devolver el valor numérico
          if (type === "sort" || type === "type") {
            return Number.parseFloat(data || 0);
          }
          const unidad = getUnidadOrometro(row.tipo_orometro);
          return data
            ? `<span class="orometro-valor text-danger fw-bold">${formatearNumero(
                data
              )} ${unidad}</span>`
            : "-";
        },
      },
      {
        data: null,
        orderable: false,
        className: "text-center align-middle",
        render: function (data) {
          let acciones = '<div class="btn-group btn-group-sm">';
          acciones += `<button type="button" class="btn-accion btn-ver-componente" data-id="${data.id}" title="Ver detalles"><i class="bi bi-eye"></i></button>`;

          if (tienePermiso("componentes.editar")) {
            acciones += `<button type="button" class="btn-accion btn-editar-componente" data-id="${data.id}" title="Editar"><i class="bi bi-pencil"></i></button>`;
          }

          if (tienePermiso("componentes.eliminar")) {
            acciones += `<button type="button" class="btn-accion btn-eliminar-componente" data-id="${data.id}" title="Eliminar"><i class="bi bi-trash"></i></button>`;
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
          columns: [1, 2, 3, 4, 5, 6, 7],
        },
      },
      {
        extend: "excel",
        text: '<i class="bi bi-file-earmark-excel"></i> Excel',
        className: "btn btn-sm",
        exportOptions: {
          columns: [1, 2, 3, 4, 5, 6, 7],
        },
      },
      {
        extend: "pdf",
        text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
        className: "btn btn-sm btn-primary",
        exportOptions: {
          columns: [1, 2, 3, 4, 5, 6, 7], // Excluye la columna de imagen y acciones
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
          const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZ0AAADNCAYAAABjJq3hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFu2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuYTg3MzFiOSwgMjAyMS8wOS8wOS0wMDozNzozOCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIzLjAgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0wNC0wNFQxMTowNzowNS0wNTowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjUtMDQtMDRUMTE6MTQ6MzQtMDU6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMDQtMDRUMTE6MTQ6MzQtMDU6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmVlMzFkN2ZhLTc0MDMtOWE0NS04NDA2LWJkOWU4NjdlMWNiYSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpmMWIyNjEzOS0xNTc2LTJlNDctOGExYi0wM2JlYzI1ZmMxNGEiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpmMWIyNjEzOS0xNTc2LTJlNDctOGExYi0wM2JlYzI1ZmMxNGEiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmYxYjI2MTM5LTE1NzYtMmU0Ny04YTFiLTAzYmVjMjVmYzE0YSIgc3RFdnQ6d2hlbj0iMjAyNS0wNC0wNFQxMTowNzowNS0wNTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIzLjAgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDplZTMxZDdmYS03NDAzLTlhNDUtODQwNi1iZDllODY3ZTFjYmEiIHN0RXZ0OndoZW49IjIwMjUtMDQtMDRUMTE6MTQ6MzQtMDU6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMy4wIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5JmHwjAADoLklEQVR4nOydd5hV1dXG3733abdMZYYmCCgoio3YomIwVjQxmphYEo39wxJbTIyJiX4mGo09tthiEmtsnx0RGyii0hQQ6b0MzAzTbjtll++Pfc5lZigz9OL5Pc99Zm455+5z7r1n7bXXWu8iSinExOysBI1gZgXEth5HTEyMhm7rAcTEbEnaG5wXXnzm/Af/ftctmWVLrW01ppiYbzMk9nRivg2Ilno24rWnbqzaZcVuCMTZmYbSh48/9qw70XWPhdt6bDEx3yZiTyfmW8GKFSt6UkpvdF33bCklbNu+7Llnn71+W48rJubbRmx0YnZ6lkyb1nf86Hv/3b9rDUryTSjlWVQlazBgd9/55KW/3wi3kW3rMcbEfFuIjU7MTs+kSZNO6NGjx9EtLS1IJpMQQsDzPBBCzqWU3vzA3Xc/sq3HGBPzbSE2OjE7LU01C1P/eeDKV7uVzz60XOVgBhKmn0QK5TAJgfJr4bA5+O7eBJ+89dD1QbY29nhiYrYwcSJBzE7LB2+9crqJxS8QtwZdDA9EKhBJEAQBVEJCMQohTYBUYGU+AZLY9bxhp5z1n2097piYnRljWw8gJmZL8NmIJ64gjXMPLC9pAmOA4qVQAAT1AdsClALhgMM8CLEMPRIJtLi1J339CbD3fsc+T8uq/W19DDExOyPx8lrMTsf86ZMHNDQ09Eyn0+d29FpCCJRSEEIgmUyevmTJkn9PmTLlsK0xzpiYbyOxpxOz09CcWc5kNlvx5cevX7t7r5bhhsthwgYABEYLBAWEcgAATOlbIAQYoQDPIWkrgDYiV5M9a+Usw++251GfbcvjiYnZGYk9nZidhrKSnuLtt9++omfPnsOllGCs47wASimCIEA6nUYul4PjOEgkEsM/++yz06aM//iQrTDsmJhvFXEiQcxOw6jn7r6lomLZAMdXp8u8BcuyIGgdACBgUr9IMUAZMMO7nvSRTCYRZFwYhgFqSvi+D484qG2irw055pzfJ8t3nWOWd43122JiNgOxpxOzU/DxyFdPsyyr4Lru6UIIOI4Dz/M63M6yLBQKBTDGQCmFEAKWZcFxHJSXl5/68ccfz8hkMqVb4RBiYr4VxEYnZodnybRpff3My9d1Sc64pSJwkWYKgSzASDEUmIOCYUIRCaokTAnYAqAKoJJB0RSIUYICAXxwGIrCz7lAvhldzQy6pBfi7Tf+9kJTbnrvbX2cMTE7A7HRidmhWbpwQenHH398ZiqVOiQIApimCc55MSOtIwqFAkItttZZbDAMA67rwnEc9OnT57g333zzihW1C2KPJyZmE4ljOjE7NOOfH/6OZVnDDMOAlBJKCRBCAABKqeL/q5Ft79JwCU7agLJBlU7oJPABIhDABzENuILBlxWPHvq9n9zNnJ7zWbo6jvHExGwEsacTs8Py6ouvncUYk5Ruua8xpRSMMTDGQAgZ/s4778xe05DFxMR0ltjoxOyQfDnu+XMrrYlHM8ZO2iQjoAx9A4X2gjgADkWUjgNRAi+XA1EcaUeixHHx9iuP/Y3Xz+22eY4kJubbRWx0YnY45k+eOWD27NmHGIZxUeTlKKUQLRUTQtayrLZxcM5hmiYYY/A8D6ZpIplMXjt58uSjN8sbxMR8y4iNTswORX7FnKr5M166ok95zWWpoBaAjuNIydE+XrN2w0Pb3Kg0QaWp7xMFSYW+EQ4JwDEtMBCIfBYW8ig1m1Fm14Hnvjzh8b/+4ouCuzxWpo6J2QBioxOzQ/H6669fnUgkrnAcp/hY+2SYzZkck8/nYds2TNMEpRSe50EIAaXUuQMHDjxk3Lhxp222N4uJ+RYQZ6/F7DB8/Na9NzM185CEIMOsQBdz8vVMmyIxz/VBld6BJNpLUmS1t8QUQBQghIBpmgiCAITpglKPByCmgbpCyb+sVO8ZQ4484Vmkd1u+6UcZE7NzE3s6MTsE7775/LnZbLbCMIxhAMAYa2NQWsdxWsd3NhVKKaK4UfS/7/sQQkTG6HzP8+6YNWvWfry5Ll5qi4npgNjoxGz3LJz46UGqccyZ3ZPLr0irADYJoEChWn1915ZI0DnDI9vdWqEMCMlAlQXJCQxqQwUKNrNhEgIWcKT5clQa87Bkxph3Zn75/tmb65hjYnZWYqMTs12TXVZvffrpp6eVlZUNA/RSF+ccADqlIr05aG3QDMMoarVZllVcdispKcHChQv3nT9lwqCtMqiYmB2U2OjEbLfIxhWJ55787aiDBvLrS0QT0tQACywwlEAYCgXZsaBnhxCpb0XCzLZImSBcsrNMG74XIOAEiWQZAmEhVwC4kEgaBqgQKBRy106d+uVxmz6omJidl9joxGy3vPvuu7/cf//9hzY3N0NK3XKAcw7LsqCUgmFs+R6EQRDAsiz4vg/HcWCaJjzPg1IKtq0bxAkhMG/ePNTX14889bTTHt7ig4qJ2YGJs9ditktGv3bvzTZp6pYwaoYbgUSJU4VMJgPTtpDzXMDQhsck7SXQOppH0Xb39FKdDJvoRr8GEsZ3DAp4ngfbtsEDANQEDBtcKPjCgHJKMWHKHBx55EkYfND3bCS7+Jt25DExOzexpxOz3VE7d26F7/sJSulwIQSklKivry9mjhmGUex7szUwDAOEkKK34/s+CCFIJpMYNWpU/WmnnXb84IMPrpRSdryzmJhvObGnE7NdUTtn3OBPPnr5+j49jdMNmQVRPhKmBc/zQAgBZSXggQIog5QSlLR3LDbQ01HaUEhCdVfR4qsEQDgCnodlWZCgYNRC1hOQJAGhFN58ewzOv+GJ3ffsv//8zXDoMTHfCmJPJ2a7Yvz48Sf36NHj9MjDIYQgl8tFKs8IgmCrjieZTOqi0NDTiTLm5s6dO+f222//QWxwYmI2jC0fiY2J6QRu05yqt1988q5e1SwwCg1IOQRSEXBhgRlJeCL0QqgEUwIUeVAK+EQH84nSCgJA+DdUGlBh9pkk+kmqJEA4CHQsiKEUnHMwOweXB1A0AWIZEErqZAWZBWyA0gT8QgmagypMmD7vlXN/c9+56NI316mD8xdXzZ3532uXL18+4JDBF/zG6bbfws1z1mJidjxioxOzXTBx4sQf9OjR41zwWjiOA89r0UoAW7BXDrBap01KCcMwwCwH+cADKIFpmlCBlr3JteSRz5Ln5y5psq699jfn2F16FTr7HpMmTRrq5Wqvr6qqwhdffDH2wMOqHkhX94ybwMV8K4ljOjHblvyK1NL5E47+8otPT6suM891VAG26YEg0J1AwSCIAUG0p0Mj1YEw60zBDO/razgNs86ikL4iobZauJJMw697pD+tuIBt28gqD4Zh6NiRUCi3zVDssxQ+T2FRo4Emr/TPv7zi1zdtyOE1zLz35qaVr129i91QapeWIpvPYNqSRfjOQa8cY/c+9sMNP2ExMTs2cUwnZptSt3Jlt7Fjx75RWVl5rm3bYIwVa3K2RodO0zTBOQelFIVCAYZhFDPUUqkUgiDA/PnzJwohnjj77LNv3ZB9L5+5rNtXX311dGlpaamdSsHPZJBIJLDrrrvio48+OnvmV5MGbqnjionZXok9nZhtypuPXPrOHn17DvPdAoSXR8oChPRAmdKGx9RejiAAlKFnSWGWmVaBjmI32tORRHtAgrZfvWKhygDR+wm/9sLIQSkF5qdRlkojk1sO0zThKxMFkcY33zAcPOT4I/c9+oixG3RgTS9dNOH9Wx4/sA8FpR7g5/XjhAFOF4AaWN5CC8mKC35TvtvRr3iCZO10n87FiGJidmBiTydmm/Hiv/91WVVV1dJCoQDf95FMJpHP50EIgRACrXvmbCkopUXvKpvNghCiU7Epxccff5z7xS9+0X3fffcdvyH7rJlbX/HWa69d3K9fP+2tRRl3tg04DrjnwXNdpNPpRG1t7UNfT5q0YmvVHMXEbGtiTydmmzBh9L+HZ+u+GdIjGZwNLhAEQhdhKq13xmUAIQTCkI32dABQxcCkAQmmPR1EHk74OhrV3ei/NHyeKBJuj9DjWd1HR0oJm1EIISCNSjT7Kfzn5dHLr/nDbUcN2v87c9Z3HC2qzqKEijS66DdqGTv08/fvfHyvATMHlClTGxxCAKMUQTYL07K07IHMAIaBQBHUcgs19d9786Cjfnsx0n1Wbo7zGxOzvRJ7OjFbna/HjRu8aNGi/RzHOTufz+uUZcYQ1eZwzrea4kDUIyfKXsvlcpg2bdrE227r2OAAQCmp9l3PLVaVvv3668P79u07wDRNBL4PKAUQAuW6MCPPjRCdlSclTNNEIpFAVVXVye+NGnXWljvSmJjtg9jTidmqtCye2veT9579S/cembMtASgR5pkpBsAAQo9EhXU1kkaKAyqswyFg0gCR+jqvqFaaFoQCMCAQXv+JBJMAIxIGlVDCLxab6v1HdT+6706WdcfSeoGFK/1nzr3giguruvXaMA21ltl9Z73/16f37PvpEBCCAA44URCGPr5kIEEFiuJukib0OIwslFLgMgClFBO+HLjksGP/eAbtffhnG/T+MTE7CLGnE7NVef755/+3rKzsbKXUVlEX4JyDcw5CSNFzirTUOOfFMaxcuXJkoVB4fvjw4ZdvsMEB8PHIkb/o2rXrECkElAjTtztRYxQZwiiWtM8++/QeN27cDzb0/WNidhRiTydmq/H20zc9Ul1V3zsl6EnS82CaJgpKFnvX6Ayz8ELdPiYT1uXQ8Pli1lrk6cAElI716O0AJgGTcUg/gFJ6ua7AfTAzgUAKGHYpcgxYWJd5M8jvM+YXw4ffvcEHlZ2525zxj91WlZ74gwqaS8FtAEpLoQoUkhFIphUQTB4aWF4NAPBTC/V9qT03JroCnAPMBQyCr1cMmNlr3zNuLe915jMbPKaYmO2Y2NOJ2So8+eAdtzmOk6WUnuT7PiilxQ6gW5Ig0MtWyWSyWPsjhCjGbxYuXDhx+vTpQzbK4AD45MMPT3Mc53TGWApSAo4DuC5I6E11RJQ5BymL8R8hBLp37z5w2rRpRy9cvCi1MeOKidleiT2dmC2KaFyemjX182H5pm+GMFV/tW0XEORdmKwLhBBQYbZZGMopKglEs6HIo4nqaqKsNBX+NcJ2Apzqbp9RFhuFjumIoIBUKoVM1oWdrACnDgo+AQwbMxauet7ovtfYs0+/oPON1xobGYxsBUw3PX32W+dXLL3txp69uoMHnl5O4ylQUIigAGbZgAxX6ogEiABoqKSgdEyHkBzAGKSbAIEBAkMnGtg18AIfNZl+fs/dzrjd6nPVBikhxMRsr8SeTswWpaWlJT1lypSX8/n81aappWWijp9bQ3HAcRy4rgvDMBAEAVzXBQB8/vnnc4499th/bZDBAYCKCgFKxdfTpi3I5XI39uzTB4Hvw3AcUEq1lpsQYKkU4HWinTYh4K4LalkghgEoBeF5AKWwEwmk02lr0aJFAz99562TNub4Y2K2N2JPJ2aLUT9vZrfPRj/8yK7VxqllFtDS0gJKKmCaJvIkgFIBHKEA8KLnoiIlAUWxOsazus+NCLPaBNMehM21hyPC6ZMIPQkKASZRXE6jZhoSZWj0GN7/+CtcevX1e/Xc/aCZG3pMsmV5Kt/wwVnzZj32+ICeEsxbBZNQUJGGEALMygBOgCBohGmakEEJIJOgIqEz12h29eEB4MKAaZoA9REEeZiWAXAJmfVAk6WAkpCUoS5X6k+ek2w58bS//gBlh4xfkZOJ7inaadHRmJjthdjTidlivPfeexd169btVCEEWlpa4DgOlFIQQmyVeA6gs9dM04QQAp7nYfLkyTN/+9vf7t+1a9flG7O/lStX9vz6668f79WrF4IggGma2mOjFMyyAMMAD705IToWkjYtS9clca49QCEAzkHTaf0/tBJ2SUmJNWjQoKqvvvrqcAAwDCoaglbWOCZmByFubRCz+cmssj544+G79trFTTO/HgahoMyB8ChAODiRMA2dzVWQCoQQMOZoT0FZOp1ZaGOhQoUCEWhRTkidimwo7VnkDR0rMcDBFGByG0opKErhKQlpE2QIhyu6Yfy0ZSPPvvDBn5fu2rNxXUOv8wWjlKKLQdpYDNVUZwWrFg9onHnH04O6LkRJYZUu+gxK9QtIBlAc4AEMmgI8BiZtAHa4BxlKW5uAEiAy1IhDBsywgKAMRFEIUgNmGpB+DtRMAlKBeQrM8UFFDp+N/+Lkvnv/4OGq6l02OK078GqZISkjiaoN3jYmZnMRG52Yzc7UiROHUkqvEEKAKgUVVkRSSsEIA4eClFp+xjJ1lX4Q8GKMRwhR9E6E0FX7UY1NEAQIggCMaQ9AGygBo9V9Qgh8EcBybLjKRS6XG//l1IlVv7rq1ktLu67b4ERj1EvObeNNnudhwhdffL3X7l2RTNYCbr1Ocd7EX5DOXlOghIAHAZhDAaVAk0kg4wKmDSQSWDB/AaYtrMX55z/6O6dqww1OTMz2QhzTidl8uPXW0pkTjv5q/Ohf9Oxqn81IHgR5nRJMtEFQZPVVmknA9GloLBQYY1BEGw9JJIIggJ00dfDfIG3kapipWxHYvCpsZa2Qz+dB7QyMhA1fGPBEOWpr02hxkzf94qor/7yxhxUs+mrgtJlnzhjUMw0bAfxCIwjlMJNJwOOt1BQM6Py7KBZlQEbJEtQFiAuCsF5H2boUSXDAslAQLkwzAYN0gXQ90CADWBZWBbvg81n2nBoc9fxF510TZ7DF7PDEMZ2YzYabzZoTJ058p6qq6mzTNOH7a07IldJeTjTZ0UtoqhgDiepqlFKwbRuFQgHJZBLR/kzTRBAEaG5uDo2NThRwtWozGGNwXRdKKSxatOgzz/Me/sUG9sFpz6RJk47bZZddIKWE67qwEgmYjgMRZsJtEpwDoaK253lA6AHCNAGlMGvWLPTt23d6bHBidhZiTydm89A0Y8B9t1/7wdDD+/dOgMEtFGBZFgJJdGaZIfTymVQAF2CBA0IIXFO3E4jSqIvB97DghhKjKP7peR6sVunWBAY8VGkpGUMhm83CKS0FDBsTvlyC7xx4zI+GHPejN1sPs8VfZlmECcfs3nGUv2GV9dH7R3n79kn7VSWWxVc1wkiVAkGALBqQSFhgUUKE0nLY0a9Jsah/Tlh5JBOAslenrdEcqOIAM0IlAhNQli5YohWYl+mPF0bMbzzxx38+fvAhQya2HlZNLs96pJJrHf+qAphSClVJstbno+SDShNxu+yYbUIc04nZLEycOHHoEUcc0Vvw5fDDmTulFDyQoJRAQitIEwWYhgGTWFBKgVIK27aRz+dhmmbRo3FsR6tPU91COpFIwLZtOGG2Vy6XQ2NDHWqb6z/79NNPD2tsWQXP83DBJZe8skuf3b4899xzX0yle81vPcamQg0zLVZsc7Au8i3LWbK0p5j06acn7LHHHkgZzZbMN8MwTZ1RJiWS6SQ49zY9fSzyliQAasD1AnCZxeuvv45rrnvy3ETXtgYHANZlcACgSwKifTwqJmZ7IvZ0YjaZ99557OqgsGRQwmi+qNzxQDwO6VEQmDBYSotZKg9S+jAJYFEGBAS+S9BckgCjNoSSIDCQSJYi7wEr65rgBRTLV9Sjprb5syVLVu6mpFX40U9+duegvfcfa9p2trKyssa0PVR123Wj6lUymRpWUtJjzQt4I9i490+dMaDHyj7VJQULng+lJIjjIMhxmIkEIMO3jH4+YcmMUiVtdkVYvf5HGtrTEZXhExIAB6Q2YkglkZMEUwpHY8ZU9uiFw/98SfthNbhglc5qD0U11VmkvFqvYTatSIFSCcaEKBQcrqSwq3eNO5HGbHfEnk7MJrFg7rS+uVyuojTpXGSSPHw/A1MCluWAEgu+p3XOGGOg1ABVul9OvqWApoYCvpndUL+qvrkqkUq28ECxgXvtO2bvfQ9627TTVq9dB0y0nHSjoomWqt77LNncY1+rwQEwc+KkoX369BmQYC1QPAMCgJgm4PswTZ0CLXwfzDSxWbwKw4DI5/HN/EVYau4x9owzrltrDKq1wUG2kRUNjt5HAEK8umXLMH78eBi2dfGxx5zwFKvsFme6xWxXxJ5OzEazctlS64uXb3m9R4/qYUZCz18CSPieQEuLxMIltQgCE83ZAOnyLiCG/WhF9+olpRXVizwlzH33PeD9ipLqlbv07LrdXBiXTLjztnzDmDN367q8r6l8QGkpG0V0yrYyGgAA1NNq0SiKAhjQWWvRPI5rL0hI3bCNOLqLaIIB0kOgmsFsC4FXhsAdgCcnpDFw4LHnHX/iz/+zwYPO1CUgfKd22qQGNv4/OlEjUYlGo/o/e15y+3kbfTJiYrYAsacTs9E8+eSTd/VSzVXffDPV7zug71QpJYPJguqq7gttu7T+ggsueMIwSpuJkWphyZIWKYmgJV222wB2w+wlVbW1tX36dOvS17TqwTNZGIaelEW1RsVJWvu/UPrW+r5CaHCIftwwIAt50IQBBq0uzRjDp+PH46jv//ni/fY7/vmNGjgh4vOxYxsa5kzHd4luSuf7PnzpJ15/6l+XnfLL8zdMXy4mZgsSezoxG8WMGdN7l5SU1JcmTL+0y9qXqXYUZGZeT9E07uTPPnzooe8ekGEG9SG5p1toK63tRhVApQEIrUCgWAEAX113I8v1X5oDiAdAaKNDukBlsyBJCSE5aMoBNyz4bhorG7rjxa9snPajX+0/YPfvTt3Qca/ML7W6ZeoGzXvjhauqs3PPtShDwVOwqQHq1cNJJLCCm9MbqvYcv/cFt16wWU5WTMwmEtfpxGwUe+01aEmvXrsWdnSDk22qYcuWLes1c+bMR/bff39GCAG1rKJiwibj+zoexBiY4yCXy8HzPNTU1OCLL77AxRdffPhuu+3WaeHR3CpYq3ftO6NeeWUyIeTcQqGgi2MphRc2yGtpboZpmoOEEPS5p/4zfNMPJiZm04k9nW8p2aZllhCCpUhjHyIVIzB8CsK47zE3m0u5brZSgZuKSCYoIMD8QJpBS0Hh6ede+e1d9z1+/LY+ho0mM2OAJN8cvmj2u79YOHfscQfv2wUmmkBzHiiXoJSCJC1ACHAVdTDl0K1/tPKAjMptwnqi9r8ioiLb4AFJG7lcHVTaRsD2xIw5lWhccdBNP7jwqo1SSVDuslL5zaxDp7z57PUDnNqjlVIwmNacc5QPpRSyMqHT1r16bUBLqyYuEGX1g67+x4nRfkRLPWOlVTv0pCFmxyM2Ojs4U76aPIBzbhGimJSSAUAikWiuW7li90mTJp1k26bLGBOWZfimaRYMRkAIkUopKqW8o9LJg4HANBwkTAuEAOACUvoAEXCSNrJeAdR0kPeABUvrH95z78HvHXXsKa9t2yPfeD554+HfsuSCO3pUNqMk0QxLLgUVq5CSFIQwQEoIFYRFp1H76400OozDL2RhlVto5AV8MqERvfud+d7gw249BYnqjUr1/ubL94c2fzFxdHVhJXaRC7Vit9IxIkf5YIwhD91wNEmyWrHBKcUKq/ubo9w9pl7xmyv+yJvrmGEYQKoiNjoxW5XY6GxnqPwq5heaSqdP+fzUlsYVu/v5VT2Z8lIG8RMm46ZtUumYRFCqGCFE5APTD4LgNMvWaclBoC86JiPwPA+GQUEIASVRIFyGUjRctxkw9MWJKQIqFaiSAOEgVIIQgpZ8AUa6BJKWYPaCZvTrf/DlR5ywgwWm3WUVhYZ3z5ox9aXre1Wv6J0QBEmWAgskQOsgXBc0VQrCbPBAgBJTGxjDALhWFgiMcKmN6BiOyc0296N+PjIqF6WRIoEFqcrgeUfgn89OxY/PvO87fQ/f98uNOo7c8tK5Lz9wf0XLir6kuXFohWVC+i4IIcgyS0sJSW0sy4gH7nmgZhqCMAgC5AIKUpoaW2eXNu555m8uRlmflRs1jpiYTSDOXtvOUEph8uTJDU31K5FOMFRUVAA8DyILIMoFIxJKCd3qWSkYRkILaYaPMcaglEIQ8PB/HZuQxUbQWniTUm2MAqmXk1q/PwlFN8M+LsgJieZM84iGhoYeZx9xxIhtc2Y2jmULZ1fNnfrp6eWlsx/q3r07IFaAMQbf95EA010+EwlwIcC9PAzT1ueWSyAIQMKmciKSswnVZVhoZVR4X0TttKM3VqL4+nwhhzFjPsBVV91yBi3fc4MTBiJGPfvs77vx3LnpIEAq1KBjQNgagmmPJxRWFb4Pw7IgpAIXHDAYEokEWnx/iAcPTz/11A3nXPGnKzd2LDExG0vs6WxP5FakVi2YfOTMyR+/k7YzsGwKocKZNJxWNSAAI3plRipdrKiIDC+IoRYYiVJ6o+LF9jkjEkwBjFAIQZAhgG3bYEICXMA08vB9H4p1R302gdnZ1O2XX3rd77fQkW8Rxn81eVDz/JkHUUqFaySbCSEgUoFJMNBCGgA4Mzu1xNW6tXZokJlSCgxMAACBnwAAl1kFKCZMCWEJMJNkKgzDeHLAvvvt0q33XhvVOA5zxg6d9/7rw6ualw4ok9mDAt+HSOvWDyyguvMotG6dIjJUgAhVvSmDxxUMy4RiFnwegMAEGCa6gbB6/O7F/TdqTDExG0lsdLYjVsyeNHD028/MGLhrJVJWCwJegETU7GvLGB0RcNh2CllK4Ps+0paNoOAi4figlCLvl2H05/Nm/vw3dx7evevu6+1Fs12SrdeBqlSXNgWosrCKAQBNbOG6ofzKlJvNWk55RQusyg1+r4UzJg+Y8+Fr1/bizcN3RwZWrg5gDHmiPx+D6+W8SLmbGvrzjowOmIGCLyChoJgFRQCDOQADfKEmvpE+aMQpPzrtjqoefWLJnJitQmx0thf8JVVvPvfPm7t3MS9zRA7CbwSlFDQMEYjiRFsbDyajx0NjEi3/oG2aL4lUjdeVHW878H0fZUobHTAKatjgCsi5Cu/Obxhzxk8vvXzgngdPX/u4pw4C91KFbEvCpDKhFKfgwjItA57rMtO021xoJYmkXHTSg4DdAhSNpgVaSOnDMX0o3V6UUgpOXEcIwaCsgkmYtOBXKKVAqGIAUBdUziur2mOSbfTYbtQN1katchOMMNEF5vrH2by4Kv/lxyc3fPTqtRVJc5BBAhQKBdDSUgRBgFJPL5/mDK3WrSB0HIpwqIAD0PJDkofGKfwiiTCmF6l015XtilWs7NH9fvzjh5GuXoLELuudWKhCvQUAcffRmI0ljulsJ7zy0ktXVKbTlynl6lgMpbAsC1xs2d+2G6kcE6YD0VC6vQBlqKurG3vssSf8a50GB0BLfX3FpPGffSKUQMox4PuFMAtOgXOus8FaIYvGUxtHgXaeWigrQ6QJKKO4rCWZDyEEpDBggMKhvHix9X0fn0yr/ew3v7/zqM13ZrYMUkoQRjoUp/587NgfmItnPNkvmYRSPijTy2hB2MSOBjpWp7uoMhCqwtbeKMb1AMCytJo3D3joCekeRFJKQOk+RIGVHP7Gs88OP/YXF3VPJrb4KYj5lhN7OtsY0bSwatGc8cctXvLNkCTzLiNBEwwQOKYF3/eLKbuCecVtmASo1FcHQcPltNCTIcWPM/RswuU1qtp5OqFn5DkMnuehGhakXwCBTlAY17T7nRLphgsv+dXt6xp73aqFqdoR+2UH7bMXoAS4l4ORsHV/GBU2IuPrKLAsLv+ZYb6xt/o+ADABEK7HKSVAKgAQgPuA8gHDBZRCozocL32wBIefftvB++x2xBptAHY46mfuNuf/nrtuQEtTn1xh0bBkOUN9cyNk0kIikQBvCGCaWkxVCAFq5LQnyDmI0LI6JqHaQEsJSAWDOaHx1gZHSQYJ3anV8PWkI8O6oLG0+792PfXnd2CXQR0Wq64K+/J0ifvyxGwgsSLBNoZzjs8+++w5SullURYSY6yYibaliRqkRc3TLMsCpXQkAKzP4ADAmDFjzt57772hfB+gFIalCypBCEQQaGOxqbdwjFGHTchQQJNSQEpMnjwZ55xzzjW777b7jPWNdZUHtmoztL/ZkqxoXph6/oknbuGcD3fz+WGWZaGhoQElJSVgTE8OGNMeaaTbFk0aKaXFjqtS6mQC0zSLzfGibETOOYTQmY7Fzq5h91bTNM8f9dxz13krFqW21TmI2fmJPZ1tyMqFXw74+I3H7t+9d9kwQgVMGiAICnAME0LodXceSudLoj0aqgCmoLtMorWnA70cFXk2qx8M/7b1OGQYC/KoniknOYGUBHW8G0aOnj799n+8vM/6xj5n7PX/TquvjqtK1/YEOLjw9QVO6WUcyzQg2yyv0fB928aeqIqcnjCJTJTrvyxKOWZAsPoYFclDpCwU3Cosbtjts6krTn78rF+c/q/1jRUAAn+FBQCm1d0HgFqpLKUUujG6fcQmpr1/Ut2I/15bJuuPBoDAZBCcIGFXobm5GVZJEnnJkTV1G+9c1odjl0EJB1JKCCgwywRhJgrch8cDKGbCowp1jS1Y1ZJB3ufIcx++JCgUcmjO5uHzJHzKUFB8ZV4C1DYLu/buN+2Bex780bY+JTE7J3FMZxvyxRdf/Kh3797DpGwCJXqGSikNvY7wL9uyH1E0Q5ZSgFITc+fOHX/rrbf+dH3bTJ8wcRDP58uqKxM99XhVMXYgpTaW2uCQ1arMkUoz2t0vGp22qs3RdkpwUEKKng0hBEIINDU1YeHChfuddWHHBgfQHqVSipmhUEAQBPo9mN25E7U5aWhiqCwvLkt9On7cQc6Ej3/US8qjlVLwPA+ZXIBV9c1oaZoHSilavDy4QdGgPDQ0NGCXnn0BZfuMpBs9z0s7qWTz7nsMmLT7gD3HJUrTri+4EISJrPATAxPphoqu3VaS0vJaSG5KYrjUoOBCCaNLv+nS8y2SsHzibHh2XUzMhhIbnW0AzyyqmDLt3XMZvh6aVkT3AZMU+h/9kUgaQFf+BYBioNICwEBU2NmYeG32SRQN4zeRjyMBCEjlayNAVKvC0QCGqWfIllLgnoec0wcffrpg7DGn/u4SVrnnuhumFUadnF925+MH77qsG5QC/CQYLN0BEwBgrjkuoDgu2s7T4UxBEoBFKs1GmLmrHEDaoH4i7KxZB1CFRpFEQQzAiC964+eXXNut9Xu11hJb4jYn0k7arwATc1597tyqbz493cSqHnnqpimlIhk4WWqZbg3NlwIo1t1E/8uw6pMQAs65JQkRjuNk0+l0o23bLgBwzk3GJaOUCmr56QL3LUXSDb6sXjpTphoT/Qd9ctDRJ7+5xjlsZXDee2nkWTNmzDhs1/2+M7Km73dGUuYniJCMEsX69ev3ZWlF9RJGLRckCUKI6FVV2SnPzAn/rm2dLPpEoh8/TWKj5HhiYjaG2OhsRfKNYMkKiOXLl/ddtmzZvSXJJBBs2d97tKbPGCmu59u2DRBWXOO3bRvfzJkzfsiQo145+JD91pmplq3j7O23/nvt9/bt1Q1yCcBY+1W7zQ8hgG3rBmiWhaSdxCtvjMAPT37zmFQq5UYvk5lVTMqiCA1s20bez1t1Cxd0W1FTM6AsCE5Kp224bq4YD+FCgBpt1RiK/0PHRxhjME0TMsyiy+VyyOVyxdenTRue50GQHDhRIEwh69IRU5fMO+DS08+5paPDO+5nw54/DsPW7KMjG5kUAtSMBTljdi5io7MVSVZA5JdN6/vJiH/9rd8AA0lKQAOtOKBUAgCDKl429eMk7A1WzOpaG8WiUQoaXTeJAoiEL7RHJEL1ZEEouDKQL3hIJ7sAogtmz2x+ze166IdDTjr/gXW9Bc/XsoVfP3z/Gd8ZNxQKUK4CYQygUcp1FHeJrFCUPde+Tki2eT0FBWBAhUWuoLozJ5EAoS4UrQchDMoswap8Ct8s3APfO/qmH+yyz/Efth4fLekiWmfFdCVOoaVuWUXN//1uwd7KQlWJrkeyaBLEMtCommBZFkrXZfNDAyR8XpQN0suH2thEMkIk04i0ZQHUgWQEM2gXfJmR4vIHnzt4XeeyU9AKQdeT5rMSTSmlFLqTirioM2aHIs5e28q8/fbbl/Xv3/84AMWMsS1JNFNnTKfLJhIJSClh2zZ830c2m30RAC48Z90GBwCmTp06JJfLXQaloDxPp+Byvr5NNgvE0kEYQimampqQy+Vm7rHHHt90Ztt33nlneElJCaSUWtJHqWIqsWEYxbhO61t7ovMWPRdlj0V6dbZtIwgC3anT9/Hll1/mTj311Ls31/GvCwIiKaFb2s+MidnsxJ7O1iI3p+8HI17+1YBekolCLSosC57nQdFQN4sCaF3yEHo2tOgZhFPy0HOQrT0HwsPHw/hQ9DhkcWYulK7T8AsAUUkQw4RCEu98sqj0lkceLfZYaY3M1lk0Xe2vmPvVbumW347eo58BFAogCQvwUlBSgtCwc2bR22p/HaSAapWpHGmYhdd3KqLnw+28rmF9jvbQOKHwrTLUtwzG3Jr0Kyf+5L6fowLrjWsEXi2b9vdrxp1oUFGqHHjMhyKuzvKiCVAQpAIOcAGDhq0Jiu2n24+eQoZV/ACKxiZKTQ4Ig2mn0IQSTG3ycMgVF/+07KBjx9QHknHO0T1hbZGZRVeUbZ512Vyj/nDiFgcxW4nY6GwFeHalNWXSxKGGYVzb0lKPEpvCdfM6VrA5ulOuh6jmR3s2AqZhQnIKISXefust/5a73jxlXdvSdLXvN69gn3zyyVknHtwT+eY5sCkHCwUmCWOIlgG35PiVUnjuuedw/Z9e+w+6wOeNYEbFuosSJ0+efHR1efkhhbqV8LN5VFalACLhum4bcUyLsaKRaZtpt5ogCIpLaQCKnxelFIZhgFADhbyLZk9+WV7eff5e++wzEQCqTCpgWmvsb7sjNjYxW5nY6GwFPH9Fr/kLxvy7awlQUWbC4QALysHzHIEDAByKtL14ExnFcKjubxNW7BdDJErnJRG0WuIitHgR1fUwFCJcAvMKHAmnHC1ZCctMYcqUr3HF5Tf+EJVd1us1zP7ozIYf7++XGrweSBHA2BWu68I2C1A+B6XtLqyk1f+KYY0VXNXudYToAA7N6vsiBcCAogEEBTLYE2+Pbq6/4s+zdkVV7wIArM/g5N9/7dQuY98ZnrZXoiQhkKiw0NRYCyKqkUiUwfcKoDKAHWrOCZsUh6NtTttJADUMSEKKRilaniNQICDICIpMeQ98olLTL7r6jnPWdy5jYmLimM4Wp6FuqfXyyy//vlu3bnAcB57n6WynraQ4EMV0IqkU27YxZ86csccdd9yVVf37r1fuZNL4MYdVVlYul1KGvVoIcrkcGNNdKqm5nuSGzcSMGTOwzz77jEmFBmd9ZBatSn3zzTdDksnkMMMwwDlHpqUFjuPAtm1wzoseCoA1zj8JjUvrm5QSQohi5h8hBIahG+ZRqvXQpkyZUjjzzDM3qvX0jsA3k2cNmDl1ft9tPY6YnYPY09lM5Hgt0ym03drMwr/+4IUb96kgFyXd2jBYTUCIgbwjoBQHDbO4yBraaHo34WIOgFCJsbgCFD4jtSSK6dgIfAlfaPkTorKgCqBeGpZlIeD1QInCyvpdbmqxy6y+Qy5cd+KA18BWzPnXzSUNH/yyuvvi3qaAVgpwgZTRDMh8mFEXQBo0VEKgIJK1it+0bXrW6sD0U8TT+xCmLvwUocdmZBEQC0T1wOy5VVilTrjy8GNWj9X3aizGGJjRta2HtnLWbnOevP3JgXZ2qCk9mIaAEAqemQYXACXNYCQMKSkDLlibwlsVtnowJQ8VH/Tn4VraA2XcAEUCfqIS2WwWCScLQggeXFny4fnXPXpeuvugddc2bSFWNHAL1DCVAurqVlUvWbJk75Zcvpox5iulWBAEJmWmrKur67O0ZsXApqamqoDLBCFECCEszrnJlAwaGhp61NSu7JvNFCCUBCUWlCLhxIigeVUDEg7DlZdfeOsvzzn9pq7lRrwkF7PRxEZnM2EYxmotq5Dxo947mhAiWjcAa826Ht8QTNOE67rwPA9QDIZh6/ReSWAaBnig4Ps+kqkkljc1Yv78+YOvuPH+H69vn81NTalFixbdMKBbFYDFmzzG9WLbQC4HOBRQCtz3QRMO8tkC5syZg5Mvu/+J9pt4nseS7b65X7377llVVVVDaS6/2t5thvMLaDUDg5ighKK5uRnpdBqMFrBo0SKccPLZT/QduHEGZ1ldjTVt2oyh+ZxXms/nS13XTTc2Nvasq6vrlckVqgCAUkO6rus0Njb3XLVqVc9sNlsadY2VgkCEStz5fB6ZTAaBVG2SHUB0TM8XYUsDahSXCpVSsKj+nyupJwyUgMCECuWUfN9FwrTgFgTuu+++G3yvxfnDby75zWY5sTHfSmKjs5mwUSnsMLwhg3q2eO7441bVfXB+RYqcbkgJpWz9Q4cI4xhR1temvW8Q5ECpgjAtSCIhWDM8KcHyFkANWLYPzjmWNfTDjGUl/zn98ouuWde+RANYkJ8wcOw7fxw1dOhymFkfLGwxgDA7VxVjSXr8tFgdE8ZmiuGWqJ1zaAEUA2DovwQgEGEgBVCWDWKHrRBQCb+hJx4YVzX2f4bf9ANa1r3Nsppl9/Ct1so1mcVVc0e9epndOH+wXWiEQwQkM+ALAIZVbKUQJRcTJQFwMEgIMKhwnKmwnknKFASAnK3vp3gSScvEqnwGlObQo6IUbqEZn2TLUOj307tPOeZnaxZ2dpKHHnnlkX/884Xzo3TuKOnD8zxIqScUEqERUbTYB0cnNtAwtpRrY0QoMQCBcDuGINBLioTaoFFcSkodp6IEbiDAmFFsecCVhJQUCJcXEyVlUD6HryRWtXi4/9Enr23OFrr96orh/9O7SzJWMojZYGKjswVYunRpn/Hjx7/TvSwFSt2iWnKEzpLSP2qsJWNqQ9F9cMK6H6KLQG3bhkkYlPJgWRZmfjnzs9MvvObW6i7919mki1VCTJ0047C99967ZxAsgkXIJhvFziCEABHRRZNg1qxZOP30y26t6tKvpaNtZ0+desiiBQtu7mXqi3RQ0NlmjDHw8DxvCkop5HI5pNIpcM6RzWYR+BJAeuwpF15408bu9++PPHnjM888c3426xU9k9ZK35FQqs/DIuHQCERIqfvpmK0UFSilIKDFDLvWdVlCts28i06LGWrmFb0nAhDQ4pgK+TwsaoAyCqq0p/fss8+eXXBb0ldefskF/Xt32/G6ycZsU2KV6c0Mb1iWGjXi8Tu6dm26zOABIDioUMX+N5KENR80vIjITTv/Zjj7bQ6X2RkBqFQwuYKSDHll4ZsF7siDjvzVH/Y7bNCX69xRdpU1f/xTNzB6z419Krpp2Rkpdd8aIiBDNWvi99KvZ/paQ0QyvN/WPkQejoo01ULrRVi9vhvsAgDwSQts24abycFxHLw9cw+kuv7o4qOOPWeNZbX2yLlTB37zxu1P95DqIOK7KDMYSNisrEANENNAEK61WZKDKQGq9H1JKARB8bjSrv58slY02rAeimljWBa2A5idqsTIr+sXnveXp/tX9tg4gczPpswbfNpp501e1VSAMHSSh4CCDI0OoRQAhRICpq3dusjIFLt+hgaICC9M7ECxpUGUAEEI0W2qw9/4ai+JAEp7PTprT7Vqbx1l6umxUmqA+z4Sjo3AzYFSgHsFWI6JH5543NS7/nb94X2qu8SqCDGdJs5e24wEDWCjR48+PZlMXpbL5bZ4DQ6gLzQ8TIs2w74oUW0JYwwrV66cWF1dvWi9BgdAQ01NtyAIbqyoqNDGhnMd4N/ChIKacFIpFAoFlJSUjDn88MNf68y2L7300rWU0oOklEilUnBdt6iarZWzN/38Rxlrvq+FU5cvX77y17///XkbbXC+nDL4vPPOm+y6blFOJ0rDpoyBhnVJusungcB1EYTZjsDqOJWUEjL0Tlobk+jYIyWFKNvOsiydYBIapNbnJsroi2qidIdWfeO+D9O2USgUivuKvmcjRozY78wzz2yYvWBJ1Saf6JhvDbGnsxmZ8tELZ2caZj+dZi0wSUu45h7+kGmranZJoYQTXhS8Dva6fgyZhpQSrpXRFx6P6wuIVYb6JuvhOYWecy688OL71ruT/KJun7573Ip9elkoM3zA8wBZpTt/0iyA1W2kIXVMR4b2iPKo06d+fnUMR8dvVi8ICQAcoOG1WoWxIqEAowILMv3x6POTcfsj0zpeD8s2srn//MtzFd6iQWmjMIj6AlQQMMOB7wkYhg3fsVAoFGCEw7OkCHXp9PgCqleWDRXWP8lSfTyh2EHO0r8L0/WRSqWwODAxaRUdXznkjFuGnrwW5ehOcsovLp/99siPBgiRRCKZhJD5NsterYtUI6PRXqandUq3L1YbC90aQ79P6yW2yFBFr4nei1IKyaOgV7S81tYr0j35CFi4HBz4LgghsCxTTxaMAr578HfqH3zw/n2qykvqq9JrpCvGxLQh9nQ2E9m65Wzu3LkHRheOaIa8pYkC0NF7RTPWmpqaMR988MG5HRocAO+99trwPfbYA47jaA/HNPUt2LJqA+GAoTwPM2bMwO333NOpxmEfv/32L4UQpxNCBkVdMJlpwnfdoi5aoVAoqg9sCqZpwvd9NDc3L9xzzz2/2BSDc9b5v5owZsyYAaZpIplKIQiCog5c1A00UsCmlCIIgtVtp7HaUABoZWRoG2MCrDY4rXXjoqW5yAsCUKxbiryfaJvoecE5ICUsywLnHIHvw3EcHUMMv99BEODzzz+v+uUvf7lizpw5+23suYn59hAbnc1AruHr3m/8319f3aV749VJVgNT5mHyFEyeApUmCKFQhEAoBaEoJAxQokA2Q18ARSQC4cPgCiyQ8KWCTwzMX1615OZ/fpwGgFXZdbdpnvbuxaMO6PPKdWk+EzZvAWQZIEoB2gxYOSgitPI1LweCcgA5ADkQSUAkgTIKUEYBEglIJKBggEgDRKRBRAIgOcDMAmgEeCMQ9ILyukOxLLjZhLwcgH99YPq9D7vnYCSP6/CC3vzRM+f3XPb+Bf3kfCSDLAxBQZmJQBAQM4GAGPCUgs0oqPJhqAC2DGBIGcZzKCRMcMLACYOgCXBughkFUJaHJAYUNeEEOSRFARkCzHGqMcLvN23vC/505cZ+Tvc89uLN742ZclDBS0PSNFzuhRnKCUhhQgoGSmwQWBCcQnEGkyZAlQWqLK1QIQxAGCDSBFEGiDKglIBSApQoUKKAMBmDEgIlJaC0egIlACUAgQKUBFMKJiFQSgCQYJTo56UPIn0wcBhUwqASwnNhUAaDGeCBhJIEOhOBQJBSKNoFk6csxEWXXDv5hTc+OXtjz1HMt4PY6GwGRo0adVHfvn1Pjmp1WgdztzSEkOJaPaBnw6NHj8aPfvSjv0ev6ZLWeczLcnVtNGumfDL6MNu2XcMwUjotV7Xe8Wpxzk1BSvBMBnAcXZPDuV52DGfTM2bMwDHHHPPUvvsPmdjRruZOmjpw6tSpRxuGMcR13Y5e3snhSSSTyaLXES1hGYZR9CLnzp3bcuWVV16wse/xwmujzr799ttvzGazxbRoYE1FhB0Rxhg8z4PjOFi8eDF+//vfP/3Ca6NiwxOzTuKU6U2Ar1phfTH+xd86fM4hyiWgYEhYDryCC4ulQRmFIAXoPjehmrIKr/s0o/+qTfsIAlarl1B4GoqXY+ryLI766e3HdFvLRXyXVHWxetVf/MapVbkXfl9d9ckhFjMArycgJaRZG3Ya1b0nCXI6FiITYYfTsE6H6HGrKLjDoo6fVliTEy7NmV1hiBSQzwJOEkGiFsosQ97dDctW7Iop5v63/mDvszpOPV46p2/u4+evP4zPO5tzDjdRAmGakIUoJmaHacBRQU4ABg5AZ2hJwgBlQIJBtBLjJsxGXUsWjpNA0jLguc1wkmnkPAc+LcEz9S6OPe/mYYnee9R36gNpx6dffXPQn2+/92mPJyAI4HECx0kjEC3wvRyIGWb/rTH/C5fU1hly1UfAOhuTJe0mQKTtP0U1c7WWiZKixfHI4nb6fQOfgDIHvpQAN7G8Lotrf/eXpwNhmCedcPRTlel16+TFfDuJPZ1NoLGxsaq+vv6W8vLyYZZlgTGmG4VZVlGza0sTBXwBYNmyZR9alvWfAw444LP1bbO8oZmNGDFiuOM4hxiGsc4stc2SZJLJAOF7BNlsMd7l+z7mz59fOPXUU+/uVtazwxP13ogRv2SMnRt5JEEQYHN5O8lkEnaYoaWUgpvXwf358+cXDj/88Jv22m+/8Ruz35mLFna79NJLJyxatAgtLS1F7bsoVuMkkx3vZDvHMFYrHER9mzKZDH77298++fTTz96wrccXs/0RezobStDIID0HheZuo9584IHBe6fg5fJw7CQKbgGMWhCEQhp+20QCpWsvIlXoaAa7qQtwgUiAU4rmbCVk9V4jzzr70jsBoDG7MJVKpQKLVLfR5pGFeT2bpr7462GHzxrm8GaAJ3X/GmOFNjKyHEoBlDWCSAWoEr1ha08GLGoAFNaUAEXPRiagSKhYQAAkSvWyndEFQYIDiVI0+SmMG9f7vRN+ct3PS5zd119cmFtlTX/vhauOaBlzllIKnCRhWiYcngEjDCRcwmxjHgkHAQ/PLYEkBqC0JxSqu8BQOtuOygBKUjQrB8RMo8wqQz6fx5dmN3hDj779hJOv2ighz1UZxf52+xMvzF3UAhgVgKOQTCaRb2mBZdpgikH6wWqphDXYyPlgew2/do/Ldium0Xlb3e+1/fZhn6b2W4SagVwonbxBGPLZLJySNHzuIZ/x8efb77+5tjHT98rLLrm8Wzli9YIYALGns8FIIRDkctmXX3553oABA07K5/MwDAPZbFankDoOgiBo44FsScIYwYhp06ZNHzZsWLGgMpFIBGvLnpswYcLRQohrXTdUSlA6+LzFUud9X79HWE9UKBQwfvx4HH/88f8q2W1Ah0tWUyZMGFpTU3OH53kDo+MpFArFjKpNJcr+ArRnl8/nIYSYM3v27PoTTjzxqY3d7+233/70a6+9NlQpFeriKeQzGbCwY+vW6KW0NRFCwEwmwbkuzk0kEshms3jooYfO/9WvfvV5TYO74wewYjYLsaezgVDmlk6a/CHKSwsweA4OD0AER5lTCUGBfCEH0zbAlYdABqBEV7pTSDDlr65TkeHSyiaWNTDVF+MnLBC/ufOVfVo/7rBubT2cfJ0VLJ8ypF/wyEOlZXWwUzlw14chSwBlQ0R1KmyV9sJ8e7VeGgE4LdGzW+oB4DBU6NmEqs2El7Y9HhlW0pvLQBMOCp4J6eyKFcsPRGWXi35Tul+oWZav1Sco2bVQ09zEepSVF0+I+vLTIV0+/+ddvaUPw2JQPIDDOAAJmmewKAUPPayok6okUuu5RfUqoIAyoUjYeA4KTHEY4XYeMaAMoNoEkMthVroPJjfyef/z+CNr7abaGZ56/pWLnvvv62dxlYYvGGAwEMqhJIGCD8sm8N0AjBrFr0N7VodO1iEWG/6N6mqKHsw6cj/UOp5Y7fnQ6IVt7tPw/aPXtR+OYSowJuF5AZRUME0bitjIZHNIOqXwpI93Pxy3329/d+O4e+68/ciu5XS9/Ztidn5iT2cDmfjFF8c1NDQgmUy2qanwfR+e5xXrOlrXVGxJxo4dO/MnP/nJHR29zvM8jBgx4oPy8vJSwzDgeV6xr8w62QzZa9Q0oTiHZVlYuXIlvvnmm4XfO+64F1e/gAoobSJ6lJWL2oKyGgKd4v3mm29eZBjGfrZttxHE1ENbe6fPDSWKRfiNjQAhmDhxojj11FPv2dj9TZv+dd+//vWvjzc3NxdrcHSiBy8uRQohtsp3Y2sgpYSby8G2bUQ9jIQQuvld6MkFQYC33nrrkMsvv3zC4mX1iW085JhtTKxIsAH4K+ZWvf/ufU/2KLVOtg0RGpdNcxZZmC3kopt+gGYB6sFUGVgCICKlix1ZAZIR5CEAMFDVC4vm5v+z6xGn/P2wQ7+7XomboGl2zykfXzZlcK9sFRM1gGHAlwldKKjaTrVJ8euwzilzWyJFBascgevCMAUCXoAFHgqdJuEZveAGgzFmsv/mjy598EcAUCs8C4SjK02tMfNV9XN6T/33/Q/1Zc1Vjl93GAAUDAIoA6Vu2G6aeZAEkAglp0kBTAGGBKAMNIaaZaYQcBQFYwF839dGACY8TsAYgyEKYIxheqIbpmbIyN5HnvzAkUN/MGJ953NdfDVr8W4XXHTFvOkzF4IYFiTVqs1AK6UG0KJaA1Or1brbZ5etVnYIY2fA6kxHtXqlKjJdInSZJGm15KiM0FMxWn2uEiACqvg6Y/Xjrf6u9rTa93mKsur0XxFmMbJ2WW+R58mhRW0Ni4BKjoMOGFj4219v+t6Q/ffoMEU+Zudk55hubQWaaxcnHn/88Xurq6tP9jyvWN29NQiC1UrDkYZWXV3da5WVlTUdGRwA+Pzzz0/q2rVrVTGGwHkbFYNNghCIIICMxkgpLMcBGNOxHMbAOcfbb7+NI488sujhKKVg0LU3A/voo49OA3ByEASHberwoi6nUS1J1DogqqOK6kx830cikchtrMEBgJtvvvnt+fPnF/XLtkb24vaOaZpAeK59z8NXX32VuPbaaz+fNnth3209tphtQ+zpdIb88tKPRj52W7cS47JCphkGEZBh9hMjmxgWCzXNqIhUqPXDIlJ15kDKdpDP50GJBZcmsawRqM1bT/zPlX+5uKPdL5t8x23NS0cOH9Dbq2CkAC5zMBQBDT0ERdoG40lHX4f2zzMtnePbeS0cWaCApPCFD6TL4fNKjJ+dnl6+95UXf2e/ocVUbumuSCilwBI9WmU1rUit/Ofz15GaBfuV0PypijbDM7Unlfa1wSwY2kswQ/spwpl3OtAX+Lqk9oTKw70GhjaGQijYli4CdQwTROXBOUcT64LGZDUmL2/GWb+9uRqVvTe4Hqc+D+tPN936+n+fe3WY61JQy4EntMpz8fyGsS59fhmobPe9aefpyPZ1Ne0JPRAWlsGIYsyl7XZRR9r29T7F/Stzre/f/n3WHGeYfBGKXRBIsFa7UCT00EwLXj4PUCBhGQA8BIUc9hm4J27/603Hn/D9we+t/0BjdjZiT6cTTJk8eUihULisubm5mJUWrdVvaVjoKURKwYQQ1NXVjTnzzDM7lcq7ePHiQT169KhYQ78rzFrbZPL5YuyHc649HABWSQk451i6dCls2y60NjjRONqzcOHC3VesWHGj4zinbq7JUPR5WZYF13WLqgORIjXnHBMnTsRZF198JAxjo4LcTz755M0vvPDCsCibTrd5ZlsuI3AHwvM8WIkEjFAHz/M82LaNhQsX4vrrrx814u0PTtrGQ4zZysRGpwMys8YPapz96en9SrIoYRkYIgciPLhuHqa56VmgVGlNMEIKICQAVQhvWsWAMCAXFOCjBA0tpfjg0+WfnfKz351R2rWDFslNY4e+cd8h6rBeo06uwHjYrADiFQAjgM9creMlTRCFNrcOIe1udkJ3KPUDOFzAlR48I4W8m0ZTwwC8NfuEF4/48XMHr7Efq2uBetbqi/zM0cfNufcvr+9tLISZnwEiVsKUAZzAhBOYOn4T9r+RVEDAApQFUymYSqHRMdHomCgvaC/HMyQ8Q2rlhAAwAx9JwkFsgRa48JwSNLMuGL2qDCde93egy25forRHh03j2vOf1z4Zfu8Dz1wfyBRyPgWx0pCKIQgECGFaIw0AU9GNgikFCg4Krj2HtXgZ0ecffR+0Z6Gg1bqF7jxLAijCoQgHhQRVBESx8Ea1l0P4mjcAVDFQxdb5/qs/b9n2tvoJrK9BXvR9MpmBwPPBiIFCgcOySsGJjawwMHNhHS779S1vP/Gft67Y0PMes+MSG5310LKoOfXGG29cXVZWdi7nHDzMwopiK1tjzT6q6aCUYvny5SN//vOf39S1/54rO9pu4oQJRx955JGAZRU9kdaKw+EDmz5AxiB8X6sOMAYnkSiqEH/22Wc4//zzf7euTUl5l+IJ/OzTT0/q379/XyklEuk0EonEZjm/rdWQjbBiPrqtXLly+aGHHnp5Za9eSTC2wZLaixYvTd12222PtLS06Bm9Za3R1+bbTuSlc85hOU7R04y07RoaGnDrrbfef8PNdz+5rccas3WI63TWhbe04pMPH7578D7ifCNYBe4nYBkMvgzApQvTpBCCg6xbwLlTkFDLTLTaD1OAKfWMlBkp5JSNid/UYc8Dvv/f3gcOW/8auF+bmD72qRv6lv7jhgpYkM0uaFkKCBoBg8D0EzAkgbICnQxRLLxo7+Z0VLgYXlCJB8oCCG6C2TYamvNwrQReGXEQzrnkP0jZpWv1yBoawSorINCyrOLTf9z1+MGemyJmI7JsFXKBghAE5aUVYKFEXd7S75f09dhEqOwQxTLM0D4xeOHodOyHCgbTslBQDSCEQ7gURJVhgqxAy+7f/dePz7jg4Q4OdK0sWJkrPfn0XzUvXFYLRalOLKMMudwqwDCQTKVQKORBWVhHgyi2E8VYorqidrZuXYoC0dORtxH+lQphVptWvKCyVb1SqxowESofEGkAhKyOKUV9ksL3XbMsqP33gLb5u3r8EiBrxo5sywLnLojB4AcuTMdBEEhASFDDQSA5Ck0Bnnj2tfNZosT/83X/c8l6T0DMDk88FVsHr7z88hVlZWXnFwqFonJ01Nsk6n2yNWI6nuchCIIX+/Tpc98xxxzzYkevX7JkSR/f92+IanBoOg0UCgAhULojl1bB3kydNcE5SNSDhXOUlJRg0aJFOOKII84rr6iw19XTprJCR8BnTZlyqOM4pwkhhimlYFkWDMMoaqFtKpEGXhSDi7wQ3/fH/vhnP7tvY/d70003jVy0aJHOygrrsjjnYI4DM4wfbY3vx/ZOpJVHCAELO6GaplmMJ0YeYSaTwQMPPDD8yutufnUbDzlmCxN7Omth8pj/O63SmXeQTTzYRAIU8GVVuIztQioBU+ofDd/E64pPErrlsApgMwLCtdikkSiB6yWwyrPw/rgZA+74x91ndLQvuWp5asG0H884aLfuSOYTAAsAkgFMQKlyPcUIDY2ULijD6hag69qnEKCOAwQBlJQgRAfICUXY/gAADyCtAAUT+GrWIVjWdMbtp5/28/90NN6G8e8Pdd5/6q/VloBIEQAcxCUwYEBSBsJM5IkEU4AlIk9Qz96N0KPJS100mhbac8taFAQGkoGWtymwHKidgJ/XRbwr0rvi2TFf+5fc9fwwVO2a62iMa+PXN97xwpvvTTsszx1QJmCZFFIAgIKSAlJJmIZuQ80MCi+bBUultSCsWwCoBRCdsk6VWywWZYxBCW0oLcsJjVmYHdaq+6fu8Bl1BQWkkrCYBeH5oKY2fkoK2LYNXynwIAAMBtM0wQMJKlp1JA33aRgMUhBIocKCWZ3AQhkNW2KvlgoiMKAoC5vIRcu1RNd/eR4M2waRCoHnIZFIaiFV7uuJCaXgXIFZCQjOISkBtUz4PkEQEDzz4vun1jf6E/7ypz8cv/uuqfXr8sXskMSezlpYsmTJIMdxTt4a/U4IIUX14SjrKaq8D4IA8+bN++y22247vjP7GjFixAUDBgzQP24pN5+igOdpg2MYgGHoXjiE6PcIO41GHkVDQ8Oc08888+6O9tuyYjn74osvTrVte3DrTMD27ZU7Ito26rrZ+hZ5Tvl8vnhe58+fX//rX//6nK59+2yUwXnymacue/nll0/PZHR78Oi4I2WDqLdRNIYgCOCUlED4PvxCQZ+/MPtRhZ07I+8uKBSKXnQUC4mOo3W76jUIVQAidfMo09HzPEgpkQjVrDnnUOF+Iw8kyrLzC4Wi4bNtW3ttYS1XdCyRVxKNJTr+6HeilIIRbss5R7q0FIVCAYlEApZl6W3C9xO+rxUaCIEMgmI9VS6Xw8iRIw/69a9//cXipU2xesFOSFyn047nHrj87X69qbBl9mTDMKCk7ivDoxCGNHXMRWiPgbNNC3bnia0NTvMiJCxdO8OojZVeF3zw6ewvL/r1PUfu2neX9V4gvZYVbO6Em96qcr4e2q28PlFoySKRKgN8Q/fBAQDWAkkBobRGmomwHEVFv+t1xHQYg/A8MMMKC0G5NgxRDMr04PIAgX8U/jtySf0Jl/+zb5/ufdc7Xr/2qwHjH/7bc4PK+EFpntXHQCxIQZAO9EWbE19fZGnbepC8pe+XeTrxTVAznPnr+xwV+k2o0mrTXi0cx0Ez6YlPVgTjyfd+cvePTj6tw2XKtTFy9ITjrr3uplGz5i6BMlNgzAaknukzEs74Vah6EN4PggCO44CDQCkKBYAHCsSwQlVvP5RSAgLPg+3YIGL1Rb5ogCUgJS1+SpEShrT1EpZFABV4MI3VaclBEECaJgADIvydM0Jggha71vpShO9jQHBS9GQVD7RhRADT0v10tBEDEk4aBCZc14XhaI9OSKo7lYbGXUFAuj4Mi4IpQIYxSsLCdu5R/VBCtwMBZ7AME37BRdJ2QGQBBx6wV8u999560Hf27j1nYz6vmO2T2NNpxagXXzprt912+9JxnJO3lgowYwxBECCdToMQgkhnbPHixWMvvfTSyzsyOAAwZ86cA5VSw9LpdMIP+9hz398sno4KZ6EIvSdKKahlgRiGvoUz9cmTJ+Piiy/+Y0cGBwDef//9cysrKw8CUMym29hzHc2622eMRZOpVCqFQqGA5uZmVFdXL9lYgzN7wZKqm2+++a0FCxYgkdASQoHvt9Hfi7ypyFgIIeA4TjG+U+wYGno5UVZiNH4nmYQX9vQBVnvBPOq2SkgbT9j3fQT5fFElPMqojLxF0zSLmnWtiYxhaw241nVchmEUj4NSikKhoA1MGGvjnBfjnL7vF9/DDNUyotinGWbzRV6TbdtFLy5a3vOzWR3fCT0qI9zeMAx89dVXpVdcccWUcROmDN6Yzyxm+yT2dACI3MKqiaPfPyu/au6BlcmGc5VSSCbTcAscwgh/sDSv/0gbTK7+EctNVIkOlF72SKa08cl7Scxd5qGqz4FX/vC0Cx9Y37b5zMJUMpj+g+mfPX5L/12/GcDyPgwrCQgKCQVKrTC9aXXWkwr74lA/FR5X2wrz1aUXUcW6XquHlFAcIKYBKANB4IISEw1GF0z82lxil11z5dGnHP9aR8c785mbHrFrZx7ST2FwId8MHkqnWdwGgQFOw2UawkEVwMKLYS5MSIiyqxwRhKMOZ8y6GgYeYeBKQjEBSQl8n4GZVXhgSf30q3734P5VPbtv8Ae2dFXeuvzKG75+9/3PBnCll5QcU6djgznwPQ+mzcAUByEBwD14XgHl6ZKiAKZl28jlPChKYDAHhsXgewLEKg0vxD6oErAdBhV44MKHaRJIHqxe5hJay40SK+xhYyKr9JIezzfApAGEl0MqlQKXCoIDgjkIJCCVTmdXwgNVAorrJUdf6iVdqgwd05HaYNqmAc/PgzIOyhRMSkJjJQDFYDBHe0eQUMyEVASeUFBSwrAsUEagAhdUCd3BlesYnGWZMAwDPg/gewKwbVhmEnnXhWUm4fnhsqLSnpHBJPrs0h333nvb8Yd8Z78PK5NxJ9IdnTiRAMC8efMGNTY23t+1rAwWyUIIEc5O1555tTmJui26bjZa936lR48ey084+eQnOtrW87z0u6+89MIRg6sBYHUsRyhQ0wiDvpsIIbqzKOd66UVKBL4Hw2SgzERzUzOSyV1bhnbC4Ix7793jrGy2wlJqcLYlg0TSgghTbimlIFjdFllPhjo3ekIIlFRQSkJFAXmmN7csC59+9jlufPSpH5tdNtzgAMA999zz9IcffjhAShuUGWHdj4tEIoGCr2Mmnp+HkhyEcFRXVKwcNuyMV3/yo1Oe69ev32zbtr2C6yaEIMZX06Ye8uADj1w/Z97sQYZBEkHowViWhV136fHJ8EsufIRKLrnwDcMAp1BSCGEopUCJKd3Ad5Ysrtl18uTJg2d8M3uQlLIsCIKujm3DYgzX/PaaZ0tKSlYJBWYajl/blNvtjrvvPYVRS/d5UgKOY+HyKy95vbKycimHspRSrJD1Sh568JGfZbMuSkpKcM1VV95nO4ar4MG0qA/B4XmeY1mOa5mJwrKlKwfOmDH7u+O++GzPrOsj8AM4yTT8UIPP930YUGCM5fbec48p55x1+mPf//7337Fty2eMBUuWLe330Ycfn/DMSy/9z9IlK/oAsKOYppQSCkp7RsLF4sWLceGFF4669eYbLznvzJMf3ZjPMGb74Vvv6cj8oqqX/nPfI316eKfZnkSplQ7Xqm34kkMyHSswoiyv0LPxQ4PENvH0Ob5e02+2EmgUJXj1/RlfPvjQC9/paLt885yqaV//+45Dy148H4TAaymFbduAqNfLFZYFFDi4YwEAKCmAKgGEa+uQVeHxRKIA7T2d8GVCgFoWVMBBjASUFNoY2xYydQ24/4Mj37vhL491nOgwf8xxY59+6K7vlAT7mVyBqCSIVGBCAEqhKRnaA8VBpYItdJA9F6pLG4LAkoAVvqxJh9qQ8PWSX5bpLMBS1aiXLKVCjlOMaClBn8N/9tMhP/rJKx2OcS08/p9Xr77xlnvurcsGoEQvV3HOkWY6xoGkjaBQgO0QMCJw2SXn//XOP/2mwzbNn0+YusewYcO+KtDuCaUUDFNhyHcPfmbUq4+fsyHjG3rKNS+MGzfudMKbUJo0UL9septPcOYSr89eg76zMJkuB+ccJuEoS5v46IORvffoW740el1txmdHDjmKr1yxCqWlpZgwfpzdrcLslCzQVdfd/vpjTz75Ixg2Ahkt8wWwDGRGvvHyQUcM3nP2+rZ/690vDz/7nHPe9JWohOnAl4CkJpSkAJe60yqRcCyFv99188Xn/PS4DidkMdsv3/qYzksvvXR1z549T7NtuxhfibpSbo06i6h6X0qJefPmfXbHHXcc2Zntxo0bd5pS6nz4PuD7qztphl4JpNT/byJt1vyjDCpCUGhsxOjRM/Gb3/ymw4vkstrl1uv/93+XVVdX7xepL0cxBQBFVebWcZ0NOfetM96isbqui6ampsLuu+/+xJDvfe/NTu+sFe+O+vC4v/3tb/e2tLRAKYUgCNrEjKIYCtOZh8F11113dWcMDgB89+D9Zo8aNWo/x3EK0ezeNE2/wd+w3+Szz9574ZAhQ/5r2zYsy1rjecuyClbYrTTKRAtjK20CPZ7nJU3TLGa1ddbgAMDf77j+lHPOOecDpbR34vs++vfvP+Xrr6f16MjgAMAPTxg87sMPPzwgkUjU8zCjL4KEcS/XdcE5x3XXXff4HX9/9LbOji1m++Nba3SUX5Oa8MFjVw9IzjswHSwALQQAo/BNiQINwJmAANfaWcqAIFTfYELALGppGcqDoTwIJMKbDUGY9ixIQfebIRwBIfqmdOZRkltwfANNykBjKo2Rny7DsFN+c3Yy1XEq79Kp7w89pPR/Hzk0+Tqg0oBMgaAZBssCoFoPTRHAIDCkgCEFqLDCTLYSfaNe2AXUAGDANyV8UwLggOIANwFuIueYyBoCkgYA80F9CTRbeGbmT57o9eNPDrbL9li/JE/zkqrF//fwQ0f5K0/t39yAEs+BzRlcWQs/lUFjwkVTUsBWFtKBifKCiVLP0n1xpNJjJx44U8gbFFmTomBQJAOBEl/AAqA8D2mVh0lyyBgOViTKMa3iAHxUesQr3734lotRXrXBQp6zlhe6/e6vj49a0sDBkQAFgcEAKXwYDMXPkyEB4TP8z9k/u/umq879OwB4LSvszrzHIQfuM/ekE773sh/kdACdmkal1aEURBt6pZG96NT9nxK+g1xQghqeS9Qhl2jM1TEAYLzFt/0AsCUCAD4tRUZWgFoNbZYaqUxxwUsgaSk40qjLr0jleZNT8BvXtGQAcvDbGK0LL/rVdSmnBNLlYK70/nnrtWf3KUOn09K/s0/XJU/98x8/ROB68DksYoJKCSICBNyF7Zgo+D6aXeC+R/97/fDr73pnSTZKVYzZkfjWGp3x48cfV1NTcy8hZFjrWXLrepHNQZT6Gs2Mo2yeKBspkUhgzpw5888444wzevfuvaij/S1fNKdq1qxZhyWTya2i/RZll7GoNodSLFy4EP379584eP8hHTbiev/dd89yXfeiSH9LCgFiGEin05tlfJGXUwhrXAghyGQymDZt2spf/vKXN3VmH7nm5W0uoHOWNFWdc845K2bNmtWpMZSWljZdddVVtwCAyNeX26XdPQAY+d7o7x5x9E/H9ux3YN33j/3Zh5MnLdgt2sZvrqcAcN555z3MGEMuk1nrvseOH797/732Hddv9wM+33/fIz58/B8P/7T9a/bcc8+ZnuchnU6Dc24AQEWqepO+HNH3P8p8m71wYY/e/fZWe+53lDpv+O/HNjY2Oq1f37VrxeIuXbqAMYazzz77se9+b8jX7ff5yDNvnHXiGRe9+tMLrnrqs3Fj1shI+8Fxh35x3HHHvR2le1uWVfzNRGEAzjlWrFiBN954Y9h11904qqZ2UWpTjjNm6/OtTCRoWTK3onnZ+B91SblaybmVgWkd4+qM4eGqHABg0iYAYcdExSCg62EMFsAtuChJliEoSJg0hUAEyFoFwKD4YoGHXXqd/MCAgzqXypv56qJ5R/VXpUqZYJRgzfqaDaUBAGAFYYxHac/MTeqLoO12hUkoQBuAQgEzM0dgQWn/B0486rwOA7qNY9866YAZr1+dSCQgGIFnSVjMBbgAC8pBfY6koQAiIGgB3IgkwAwI6PohpZ9GQnqgYUYTlIGCoZ0J7jejPJFESWBCZgTml/bEJw3NOPkPVx9j7DpofmfOQKqsZ5sL9N333P/0jBmzoJRZ7G/UHgnt6SqVRf8+3WbusWtFDgBYsqopes1FV//va8tWZbtRZmDljIXfP+TUn877/OMPdl84d37/r7/+5juzZ83fe9KUBYdJUolUCcDz7hq/R8XK6KomcpgfmFiVFXj1zQ+XXHzpZS+3fo2QBnWMEuRXuejtlLWxXoagIPDBFNGCGsqGKQHbK2vj/UnmGYK5kARQlECJcjeZsIvnhfGkyDRkkMswvPXqiCOuu/rqKlQgl8vVOclkUhqG5SeTgJJ5XHLJuWsUB9987wvX/PmWe+4C1SJ6r74w+hdvv/rv7w47fvCE1q876qij3h353sc/MewkhM+hwqw5XRtmw7QICOVYsawOb7016iBWKHx4+603HtmrZ8lGtaWI2fp864xOc+1S6+mnnrptn72t85NJCpLfst/VyMPJ5XJw7BQktPeTSiYxd+H86Y7TZ/rJJ5/8eGf29emId4cNrKpaEgTLBxEidOMsumXjTpRSgFCosBfNp59+iguu+9VTHW03Y+rkAfM+/fT0o5PJ3SilcAOvWPchFA9VU3Tx4aaQTCaRbcmi1EpH9U0Ljxz6w4erqqqWb8z+fv+/d/z7jTfeGKYlbBwIuX6jLqXESSed9HL7xx984vmf19bWdiOmHpcSHMQADj7wwHngEiAMpplEoEpgmiZyuQySyWS+/X7y+XyScz7PMFK7K6Xmff/73/+o/Wtqa2u7EkLgOA5WtEireyld55d6XROpqG4mer46bbcxxFJKJoSAogKmacIIew8xxmSoysAYY+jateu8ysrKNo3wapbV0qeffvp/LMuiQSjBk0yn6QsvvHBee6MzcODAr2UQwEgZCHxZrDuKVgiEkFq7DYmoI+0huZa6KXfedfvh/ft1j2VzdgC+VUYnX1fDvvzi8fuPGIzhxM9DNOVh2GSTmm1FHT6j2h1GdM8Tn+h6BhHYcAwTSZvDdV0ERgCRtLE0K1Ejes65eHjHmmoAsPDzP98/sHTysFL6xQAzkYYMBKiTBgqbuMRGjbBNi75OBRYAGGASYBKgvA6gFpqsYzBibN2cC//39T062mXTskWp1Pv3P3mcwYeoXADCfJSaLgQFXC5hWA5I4EBJCUpc6DiShCCAZxg6HqUMUAnYPAxxUP2wVobgMEVYt8N9JFMp1JAyzFFJOAd99/ZBp5y7UWm1L705+qynnn753IbmPJxkKZqzeRiWg7Ypfa2+K4QDJMC+ew2Y3H5fb7z23ummkUQQ+Bi4117T9hrY9SsGKVMmzTBFBFEl8H3fdm1pf/TRRye1NATdZMDXWO4+4cjBUz757LXDFTFo165da3cpSa8R8xkx9pNhgfIgaQLtDY4irhBUQBIJSSQoKYDBBqjX5osjaMB0jx4BQtcMK6XS3L3gwtPesZ10y89+9rPb9xjQpQYAHKfSB4BstqnX0qVL0bNn94bdeyXaxHLyfku56zcN5ERAmbpleFYJfP7V199r/z49u3VdwgzdQty2kkAQGR0DlBJ4gQ8uFQATQgCMVuHdj2YNzFx10+w7//anwwfv1StWL9jO+VYZnfnz5w/O5/PDbZMgyajO4lHeFn1Px3HgZnOghq7JMRMOGnwfH3zwIW7622N/BICaVatYjy5d1ms9VqxYsXuXntYAM5EGz+UAw4LI5WBSZ32bbTq2DQiCTz7+BEOPGv58ZzZ57rnnbj7VNoa4mSzSpgmfuzAoBRiB5BzE0NX5REjQTe32Hc6A80F+6qy5S3pffNENG6U48NEnk4fccMMNz+VyuUiFGpFS9/qQUqJbt27L2j9eW1vbo1AogNg2Tj/99H/d/Ksf37uuffT/7jHfZBrru1G6lqs9gAP671G7rm1femPUkf/5z3/Otax+G9S/Z31Lx2t7rmfPXo1///sDbbp8ZnONLJ2qEADw2Wef/bilpQUHHLBfzYpGRbtXrO74lslkyjKZDDi3QE1oZQtG4bruGtpqjuMUgNUZjZH6QpRNulotPOxUGwqfjhs3ruq8886bfdddNx9z3JFHfNjpExGz1fnWJBKsnPv+0CUzX7q+e7IZadIIS3Jwd9MNDiNZMJKFUgkolYBQDoRywJQEQ4DAbUEyZcBngEsk6lyJSTMaxpx3xaP7OCUHTweA9RmcoPGDo1978ED13V1Hn5QmU1BwE4DTAyyRgrmWFNkNhaMcnJQjsIDAEsXukqZHQX0THi/Fp4urGnsc8d99eg3+dYeB+bmP3/TI+dbsg7o0LUWZJRAkODyTIONTQCZQxlNI+QaUkQdJBgjMgs6MkzaYSOkMO2WBKh+WKsCS+sYJRd4wi7cELyDBC5CwscLpgUcaCS5+6sNKdOu1wUss81eKqj/99Z5Ry2tzyEsD1EzDFwqWmQTW1y9JGbBMBwpijReZhhEkGYUtBSzBi180IXKm8rNtLrZVyUQtkQUURKbTM4jlKxdbV/3+hj+cMfyqlwOzV58C5XDlaicnk6lJAAAnhhXAglAlELAgiIRkHIHhtvnyRJ1GqZJgnYgTNmTqrcjgjJtSc/DlV/zhLmpUoK6u0I22K/ZKpxI5RjiocMGkB9sEFPdgJOw11la58AylAiQTRlgTpgBI+MIHVxxQWtFbSAIFhlwAyEQJPGVjxrxaXHblHz4Y9cn4ozt7HmO2Pt8ao/Pee+9dVFlZeVprLaqoe2FE+3qPzQFjeqkgUuSdM2fOzP3222/MnnsdMr0z23/22WcnH3744YCUIKF6QdTDZWtkrzU3N2PhwoUVBx8yuMPxvvHa26c2NTV1c113qGma4L6PQqGAqAaqKMsf1uRsjvFLKfH555/joosuumZjtl/ZhMTw4cO/nj59esIP6508z9NSLX7H8T7PdbFkyZI+7R/v37//zFaZf8VZfySL05pCoZAKMxnd9vuZt2RB8p0P3l0j06tnt1396urq2igOE32na/NZBgAlJT0K+Xztps9KWtGcaSga18qSKn9lQ03p7fc9ftewYcPGR99LKSXtWtE27TsIAjuZTC6K1Dc410vS7WM/AJDNZksjbbhIe6615hyA4vkzDAPMMIqfl+M4WLZsGS6//PIPXn/3vVM357HHbD52eqPjNtewN/990yP79s1UpoIlKOFJGNyGz/MgTKyRubah8R2TGCAC4GYBgeHBB0AdBzKQIEqAsAIMy0dLQLDcrUSPPU69+3s/vKZDj8F3F5V+9PJlb+/b/fmrK/n7Ol0qELA4gcUJFE0gYJu+tMaU9mxgC3jwYEoTZsGCT23UmJV44+sfP/GLa+Z3aIndcS+dtcf0/153UDDv1AqRQZ4kkSdJmAYguAsDDCKw4BpVyNNKJGgLbDRBEomAmMU6KEMChgRMpbQSsiXhyjxMKCQVhRkwWNxAk5NAo+3gzUYb3/3dw4fuOej4jVpSufWuh5+bMHlGt7xLYdhp+AHATAteoMCsjmWQDGlg0hfTjmj/+Jnn/PgJyVRBKIqHH3n8twcf9dOxBx950tg/3nz3H41EWZvudKpgmQgoqDDWWF5burCp9y9/fsXTl1x641/aP/fHX1/9xHcP/d44IRSIJJAuhwpWfyeSya6+Y6cyFmVwACQIATwP5SU2iLTaWD4VGOAuASMWiDLQkFvVxmDNXdDUde99T+G773OG6r/vmaq67xA1aPBPm2/860PXBjAgYYIwBzUrGnovWYk2ntxeA/ddskt59yWGJ2D7AmlF4QiCw/Y97OP2x7SibkVPYhAIJUGYhGIckqiwk4ZOZGAWgSQSXHEIVoBiBQiDIucDxKjG4qUefnPd3a/e8+CLN6/7k4vZVuz0Rufdd9+9KJlMDldKnRSpGUe9SjaHVxOlc0Z/I1Ve27bbZN1ks9mRS5cu/fCYY455tjP7nTNnzuDKysqTivL20W0zE6kfu1FHx1xOC3wC+PDDT/DjH//4jo720VCzKDVmzJizysrKDgMhUEEAzvlaK+Q3lKhPjFIKrusWazaklGhqakK/fv3Qq1evTqVGt+eBBx644ZVXXjm1ublZZ9WFfXEo1fE+z+t4+dVxHIwePbooA9TUssoEgFOOO+LzvfbaawqlFDU1NbtNmzbtiBkzZuzb0tJS1n4fjDFhWRaCIFgjiMQY40qpQa+//vopNUv8NWYZjz322JXpdHqOUgrZbBaTJ08+pfXz3ast/6abbnokn8sVFRW+973vTd5t195t4kSZTKZrbW0tIkUA0zTbGCXf9xMtLS2oqanB8uXLkclk0NLSUlTUjn5bLS0t3b/+esY+7cf5pz/96Xec80IQBHBdF67r8p///OdryNlMmDBhiGVZRY++U0SqGWGmWyKRwMKFC/H3v//9xhtuvvfJzu0kZmuxUycSzPh8zGEy894FXXv0AM0QGEYKkZ0NIMEow6Zq1spAS/t74BASILQARgEBCq44Cl4agbErFjW1rBz++9vO68w+M3UfDG2c9/vR3+lDYMEHIwCUqccq9YXQjjTUNvUjVBnYlgU7A61CUJJEo2/gg6mDccRpj+/TZdfvrD8bqObrgTP/de9DJ6Saj3abMmgkSRiOA4f4kLwFLJz0UgiABPDCBRqb68ctqb2JvBkACJCIErgUgYSJZuWjJJ2GnfFhQIKyFOolwSxLYrKRxk/OuwWZJGssaa5jjDGQdGWnPtE3P/ry5L/9441b6hqa4CRLIaDAlb7g+lzCNKPlnHV5vhSCAFwKLFjetMdHn8/a6/vf3XNGeWmXYpzilf8+9r1//+v5X82cOXPfrmVlTccc9f2Rp/70mFEAkGlpoCWllRIAfNtkilFwvmadjmcaTp6Y8F2574W//f0/Rvz37vNbP79vNyz5+SmHPf/0v167MeUwvPf2R1ee+P1D/q/1a35z5U8v3Xfv6pFff/31cf136/fZKT86aY2Jzzsjx16j4IBQHS/JeZlSRmUhaZS7ABAQ4rhSgCUS8H0fTrpEK48rgYLnwUkkIFwfUrr4231/+8uJx/x7WOv9//DEQ8Z9+smLe3700ZgT0+l05ocnn/hSr+7lfM1xfHAqiA2h9DnWp7+VPFL4cVASGhroJVBGbAjKkHMJLOZAGQwrmwQe+edL5xc8pP7wh2vOqUojruXZDtipjc6sWbMO7d279yHC80AR9a7RM2dP6rqTTfUdWmtxRTM+y7Lg57UKsZeTGDlyZMsVv7vjns7sL5NfZo0ePfrsA/r3AaVLQRC2hJZq0+tA14IQAoxwnaWWLwAEqK9vwi677PLwLrvs0qEH8eH775++S5cuRwcNNboXCzNgGAYK2WYkk8mwjfPGU+xH4wWwSkqQz+UgjSSWLVu28lfX/fWHDQ77MpoQd9bgzP5meu8//OEPbzQ0NBQ/vyAIovoTeJ7X6XhT6CGV33PPPf/7/RcfbZP+3q9nZXDzDZevNWstlUqhJdtIS9MVMp/Pp/L5/FpjOr7vWzrLEnjn9ddP+vSLs3Y/4tCD5rV+zWmnnfbif595+wzhBXs+//zzQy8bfl6P/gO61bR+zQnHDn39hGOHvr62sSxe3FB+5513XiKEAJf698EY89uvBFBK4eXzcFIpFAotQNi23DB1Q7e0nUA+n8fnn3/+vX/8+/mzLj3vrDbZjgceMGjJgQcMemxd5/KGWx64fs6cOQM9nyJRUgIedNw9Vrd8EAhEANO0IYUBGdbymEyhUMjgqaeeOt3zmtM3XH/Nj3pWl8WtEbYxO+XyWr6mlv3jr6fO7ttlziFJzwPyBTCLgSuOvOIIDAJGTah1lZtvAMqmyEsPhmBwiA1DUChXQJkp1Lsl+KbGeuaS3zy+e3W/Q6d2tK8Cvtxv2YSb3jm028cX9TZnwBINIJJAzw0YQChgScD2QQQHEWtMFDcYZpUA0gSoA1hV+LrxCLz21TEfHjbspstNq2dhrRutyjDUL62Y89ZD1x+wZMxZ3RrnIcvS8JwKCJKDEBk46RIIrpDgHhLcQ4EmUaBJlIhVKBGr4NISuLQERBogoY4dU0BAOSThekpLFCxhwoAFXlKJOp7CUqcr/m9RCw445w8/JV0PnujnOetCIYyyzsu+/Pb3f/1g5uICXCThBQq+WL0UGAWlO7v0GhCGXBDgnffG//jya+7stBAlZbasW9VcfvTp17y9ZEV9H2LbKLQOyETYJfBUEsypBkn36Pr0C2/8sv1Ljj188PSDDx48QVAgy4Hf/fnub5Y0eSWdHcv1f753Wt2qJrBkCYx0GbJcIUBKJFhZ0QiaCekKmoeZDuCJesAswEpLEINBwgABhet6sOwUDLMk8ec777/z06/ndFjTFfHvlz469a77H/tfRVMpO1mGQiaAVBQ6e3BtGYRS3zwFhzqgYICSYIaAMjg86SLj5iHMBHySwD+ffu2kP/zvXaMXrsjFsjnbmJ3S6IwZM+asQw89dADn/CzP84rdDIXQ1dSe5621o+LGUOwGGWblRFX3lFIsWrRofJ8+fab27L/HGlk6a2PCxAlHAzi6tLS02N0RgNaC2VItKJSCDAKtSu37WLBgwcprr7324vVu06VEtDQ2li1atOg20zQH6t2oNorUrfWyNoWoM6XneWCMoaGhYeIPf/jDy/fYa68vAaBH2vBX+evLa27LJZde8c7EiRMHKKUbjiWTyWKTNAD6XITH05nvh2VZoFojzHziiSeuGfaDX77x5bT5Pda3Te3CutRdt//ttwcccEDdRx99dBKl1GytBtAazrkhhEC+uRmGYeCFF144Y/rcxZXtX/fII49cSsMuriNHjiw/88wzW6bOnb/X+sYxe3Fjr2N/cI56/tlne5VUVhY7goaK121em8vlKgghCHw/ivnorp8hUefUIAjg+z6am5t3GTJkyKw7Hnn0ksX1desUQJ21oK78qt/dcetll132jJTSjuJ1huN06vxHcdNolSFSK6eUwkkmEcWQKKV44403hlx22WUzZs5b0q3DHcdsMXa6fjofjbr/BppdOrBEBGcnmAAjuiVvS+CCmAaoweB7EqYMW+vKNVY0NoiC0rPkFC9AG7guILILZtTm4VTsduWws9bf/bNI45tnzR798N/69V/V2wwKQD4PlJYCng9AocXR6dxEUdiSwAy4NkSbKoPDPEAI1JKj8eyIRfVnX/BE3+qe62853TJ/3OBZj93/z0GlGJwUzQCAprJq+L4Pm3hggYcUdGqwb2gNOjNcZ/OInmhS2tymFxEROsbjhQlclsrDFACVFICDpaWVmN5CMK7Ax95867+L7R+CzAqLEAIj3a3D9fr/ve3vD939nzcuy+c9oNnTMvxUT0agZDFhQReHuu0ueu3nZ/q8c7gghgHDN5GkJrxCFpQFuWQVsj857ZRnDjrkwE8dxynkmlE65cu5B414Z8xpi5cs2g0J3QLcChp0Wr3sAsMwlvTu2WWpm805aSud9TzPKhi5ZGNj474WSyDb1IyUowBgQWlV/5ZkMpmHWwelFMxEN75wSc2RXrSeaWQAz0PvXXrhB8ccP3n/PQe+07t37ym5oLHLjLmzhz7/yttnzvrmGximhdLSUjTkCgAxAemAMoZeVRRpZoFBt09vdltQ19iAAKV6CTLXAqs0ARG4EEGAZKIcSjEIX78/Vz5sh8HNZ2AzszB4//2/OPHY41/brV+f2aZp8oUL5+3+8ssv/2La9KkHGgk7kSv4cFKlEIrCdwXsRAq+74OF9bK0XfA1WqSw4WhDSXwQC1CGNlpKSICYsOwU/EwOCduGCAowlYdDDtq38dF/3L/HgH5dOzUZjNm87FRG55sp03ebO/e1K7qYuavLlADleRClZ67c1IFfnwdIOCVQbhiHoZu2ROVTPSN2vGw4sy+FX0g/8eGUeQf8+i8PHoFEl04FL1/5xy+++NFhZYe4wViUEKEzyHI5wLIBAmQc/SujYLAENp/RoS4gJcbN27Wl175n3rLrXpfe2dEmrz7+l/sPzNZfUe3WIsGbAMZQwxIwDAOGzMOSHAmpZ8R5JAFsgtFRDOAGFmmjM+b43/3xDMPZfXU7Bb+RSc4ZTVav9zyPevfD4y6+4tejlvsp8LwHR9l6fNJDKpWCW1gte6a9Vq1IsDqDau1GR5oC0vfh0BIQj8NkADM4moMaOAkTQmnvwTG6gKIErscgGYFydN8jW+kMsIJfBhAC25SQfgALulePa+RgWhYCVyJp2ZCBfr00quDmckiaetLkyzTAbMAydSYZadIdSYUE3AAppo/FlS1gjgVX6pbXkgsdg1MEUAyUpnVcUtbDEgBVetnRJwEUo5CsAoHnwSlJws03wzC1R6s4A2CAKu3xUBMouBnYJoUKBIhSsKkBwXV9WTJpI5/PgxoEyqCgho1AEnAZSiAxfRw0bJq4LqNjCL2KYScZAvjwgjyIYYBQBikIIAhs04YKAkD6SDABolwM2qt/4cnHH9x1jwH9YsOzldlpjI7X+HXfV575x0P9dkmdlCIeEobu7MiMhO4tD+2GK/igMgCl+qLohxdFYHXQUv8N2yaHQcno4hP9jYodubJALQM+b4AyKHy5GyZ8WfvKr2+6dw0J+rXSPH3grDH339uzb21fRuYPtGgz4AYwVEWYCqrDKpJQAAYgw2V/1gIa9pwBAFDdXA2iBJAWihdJI3RahAAkA8wElJSAxXUKreqOudOSmFZx7B9/duqVt7YeWpCtZQ1OOVNKobtp+8gsrZjx4I2v9qB+whL8EEI9KNo5wU5S/Jq1TYMNmD7fBlcwlAmL6EZi1CFwISGUhQKpxN8/ne5f+8h/K6t69MnVubCqnc5nIr01ZupJV151/dvLahrgCwFmJXUdCCFgctMER2O2f6KlyygtXnCOVDqN6upqPHjrxT/4wQnHj9jWY/w2sdPEdN57773ze/XqdVLUzVEIPYNr3bsGQHH9N9J2im6RMYm+nFEFdOt4ULTO7zj6wh/dz+VySKX0csBHH3208oILLvhNZ8c95YMPTjMMYxiAgVEMx3Ac7cWsJ4NKRXEexlZ3CJVS36Lnwn0Iz9MGybJ0pk+47m7ZNrLZLIIgWHLyyW17zwfZWmamuwrLsESkQfb15MlDDMMYCuCQzuiSdYbogmCGHSKjcUU1JYZhYObMmYXb7rnnmKoeHTe4a8+iulzqrrvuer6mpgZKKSQSCYgobtPZOpCYHZbo9xzFigghoKFKSG1tLa677rq3n332+fM73lPM5mLHT5kuLOo2adx7p6eRrXBUgBRR4EqBezoFljEGAQalKKRUIJKCUAuMaE/FgF4+0Bfx1d5O0YGgFAQMlqmDzb7vg4DA9xRM0wIVHGWmhULGweL56s1L/+f3l5T3HtixrH6hgS2cNfrUirLnb+zVM0AQ1AGQMDwDoCbALW1QpFYM0MsLAaDCOEMQFn2LhG4jTXMQzIN0MiAkCyJtUKm0lhYlAGkChASlJqxUORR30NRYhvs/Hjjiost+c5bD+rVEQ1spAqtbuqsPABWAAGEiO/qls7yR/71hl6o8kqYJ6SlIDhhG+xjxhs1jrNDj8KFAGQVxPGRFAYZdiUJQgqebm3HQGdech90PGxtt01kvZ1ltg3XtNb/7YsqkSaVEAoL7sCwFiwYQXGpBz53E049ZO0rqGB0lYYKCYYAwAs59ePkcling6t//9cnaDPpec8lZnWr6F7Np7PCezvRp0w6sqam537KsKyI1gMgbiWRt2t8ijbU2vdhbPcYY0/EJwyh6RlHtRmSUopqOKPA8Z86c6QMGDPiieq9OGBwAtbW1VQsXLny5oqLCEqH3YdvhBVxK7b0IsVqJoH1mU/RY6NmQMGMu8uiKy6bRa1rtR/g+CCH46quvcNFFF13ds2q3osFZ7NYn2leCz529oGrcuHGn9ejRYxClFEEQQEq5erybQGstOcZYcVZKCEFdXd303Xbb7V9HHHHE2xuz70cfffT+Dz74YFD02SaTSbiuC6UUbNveLNl1Mds3rX/vgF4ej36zZlhfxDnH/ffff+Ntdz961zYe7reCHdrTaW5cnKiZ++4lvcscBL4LiwIMAgoSgVSQkBBUQFIDChRKaf1coRQgCAiXsIxsu71GVdAaqRRM04SSHJZJQcAhhQ9iMHDpQVoGFtbXIeed9OEhp1x4KzpD/fLSZTNPWTF4VwKb5AFXImU4QGAALgOMEoAZgAwAmQyVnyUAAZB20ixGaJgMAaIYSPijMgMDAAl70yiACnAEyJmVyKuBmPRVgO6DL7+8Z89QcYA3MN912a7pdrU588cfsurf9z40pIs4KAmFQl4H2HkiiQLnsEj7mEiYNt0+v0GFRbTtHmeegiWBZNICzzQhMC14VhqzaSlmVXWZ8/P/ufWCNht4jQx2RYc1Of967t3LHvvXiOHU6omWJg9mMgnOFSg1Q9FRqgPNdLNqYsZsbxBAKC22K5WEEIDiqtgmQbISNOVduNTAHQ8+dW1OmmWXX3L+1T1KyAYv5cZ0jh3a03nwwQcfSyQSJ0sp4Ti6OZTjOEUPpvXsptjyNlSsNU2z+Nr13aLtARRVh1t7SZlMZuyqVauWX3DBBTehoXP1Il+MHv3jrl276h7wtg3TskAMA8r39ZKaUkAQAKbZNj6zrnqdcL06msUB0J5Sa28pjFvZto05c+aAEDL1oCHfezPaheScWemeayxbffrOO+fusssuB/m+j5amJhiGAdO2kclkNqh/y7qIYkMqrKVIpFLgnGPSpEni5+ed9+c1NhCC8ZYV67UUH46ZOuS22257yHVdNDU1tYkXRXGiSL04ZucmUnePfv/R6gXQKp6YSMAtFBAEAe67776Lrr/++pHbeNg7NTts9torL/zziu49qpaUNX/wKriA73E4Tgrc1zNv07aQ9z1QSycCgIby78qA9AGiFCgSyBuri8AJIWvMyC3Lged5sBwHmUwGtp0oXsCEEBg5afHIO/72jxM7O+4pY657usyafWiVtXRA0iwAQqdaq6BCFylaFJA+CrwJlmVBKDOM40SGVHs6Uc8SqfQSnyLB6iVCBcC3IAWBaVkQASAtE3krjZVNXfHN/PI3fzjs/p8a1etua4xsvfXN6FeuKP1qzJlp2zvIIH74Aw6XLUkeJmFgQVunY/W3KdLGamuYVns6+h+h9OfiUI58Po9VZjUmNgTY49xLD9930FGfdfa8RsyrzVScfOoZDbPmLIKiCTBTTyz8Qh5mMonAzYEwBtMM43OkYyXpmO0Ytf6JT/vWJVHWaVRAKoNSKKkVralyQREAsoDjjh6y8PFH/r5nz0oz1mvbzOyQy2tjR799kmmahUwm82oFpWCmDvY3NjYCUn+hXN8DMQ0UAm0cFNEeSzbjLq9f0dCzubERXgHIMbuoPB0EAXxP/w0ED9WXffTp0wcnnHjiiwBgWU6OUiqCIDDLy8trr7/++psBrZlWktxlvV/QzIqlVjabrezRKzkgYSYQFFpgUoCZJqSgIJTCKxRgWRSO47TKuotuq7XeohRkI6y/UESu9swCDt/z4LkcnudBCoqc4FglGEZ+9D7+984PHkZyPQYHwIRx405oWrbsrm6JBJRwoaCK5ymKvQR+ALaJznIU0/ECD4lEAksWLGnZ59Bj/9NnwIBJG7O/K664Ysq8efOQSpUhW5BFlQiYOhWbmSYE5/DdANQw4jyCnR2lwEJvOvr+Rh+6IgRKCBiWBS50vZNlWeC+h48++qjvxRdfPOvtV/7db5uNfSdlh/R0Rr710lmGqRAEgSMI4NipxsrKrou6VHZdaJnJXBAEplCSMcYCoXyHEIJQlBYEVOzaa3Wm1qZSK3X1XFdK1nsRXzB/4sD/e+aRh/bYLXE0ywcwwOD7PlpoHouWLUXNIht5zwUnCr7vIx/UQwiBwHdgGmkU8gKWUZK76spfXezYZc2BZyQcx8n5osVkJgeIlwiCIKFgZ5NORX1ldd8llZWVNZ7MU6kCEBpYlmW5Pbr3XrueWivm1c7s9ub9/7y3GuwsIguwlAcoLUeTNXUyRtrTHmWGleuZI1YnakgpIUKXZs6ceVrSR/BiA7Pid04x5A1tDBTVntrxZ537x8uGX9lhbEy6ukEZdboWz/sFl/9x9NvvjBra0OyCUAswLMiiaxWlxOtxUxXeVzvkvCtmsxGpxUowCYCo8C8HVRwHHLB/y7133X7Q4P37rl9tPabT7JBGJ0LxVYwY6271vDXorNFpaV5QWjNvytFV5YUyJwCEx01KqXAdbtmpZEuJs98XcOwciGKScwYzX0oNQ0CkGgU3CgS2u96qe6/eglIMTnWHRqUjFtTPrpLzVuxWDSYtxk1LeRUkzNHOWbpaNe3zSgDIGRWzgShfQRVjWhJUKKVQ3rPXUhACMCpAiAClopiJp5gPBYAxCUtBFgopWtmnUxXi7Y3O3+577I577vvHbxubs3BSlRCSwuUSlEXLZ7HRiVkb6zc6gMI+ew3I3XPPnYcefOCener2G7N+dmijE7PzolrqLcKYQKrjTLWGxkWpZ5558Y+NjS1VVqKsOfClpQhllFIhIkNYlFNp22yBSRpL3X+L8Wmov6SolgECBFpPRJSA4xg5LgLzjDNO+3P/vv0at9FQdxpio7ODknVrWNrpsdEXTJVtYIQQdOaivq1QLfUWKa2KA7kxMTsRsdHZzAReLQMA0+66URfzjKqzotTncqP7Oi+4WdRbQgiUsY7VlTcFWVjFAIAmtu0yZkxMzM5BvKC9HWIwo8MLPAUVAmLTGwLFxMTEbEViTydmu6JBgFUyxF5VTMxOyg6tSBCz86EUUOcj1qaJidlJiT2dmJiYmJitRuzpxMTExMRsNWKjExMTExOz1YiNTkxMTEzMViM2OjExMTExW43Y6MTExMTEbDVioxMTExMTs9WIjU5MTExMzFYjNjpbgVV5rXTc4K5uZ12f27kLIBsKnWvdHVHXsvp81Gc337lpyG7YOLbX94iJ2VkwRr370XHV1dULiVEiOOeWK1vSlClhmNKnlAqeo9Z3Dz5g6to2njx1+gBJLOb7foIxJgghgkIKBAJceFb3HlXz+u7aJ9fRIL78Zu6AyZMnD5s0acqwWbNmHdKwqrkK0O1lu1ZVLj/00IPePPaY7z955OEHjt/QA/x80pT9CEwwy/YJISAqEL5fSEjls5JEsnHfQfss3NB9bggffjZxyOefTzz1qylTjlu0aOmgXC7HKLFg2za6d+8+/8jvfufFw4845JUhhw6euLnfe8ynUw4bN/6L076eNvPIOXPmHOJ5HhQBksmkGDhw4GcHHHDAeyd+/5BH99xjt5Wb8j6La1YlRo56f/iIt9+9bFnNigFBEKC6a+XKww858LWTfnDcw4cOHrzW789zL7x27odjxv/ym2++GSKkZIQQ7N6/36ShQ4c+///tvXeYVdXZPnyvtXY958yZygwMHURREFBAQRGxRsSaGEsk8bXEGjXGmMRobDGxxW6MLbaIKGjsvYGKIFIU6b0zMP203Vb5/thnH2aYGYoxefP93rmv61wwM2evtffaqzz1fo4ff/TDPboU7RaZaUPzZlZWXF2gznnljQ9/NHvO/BNnzPjyNMdx4kopJJOxxoNHjXj9xAnH3n/IyAPnf5fn/GbJpn7Tpk2b+PXXXx+5asWyEZlMJs50E4wxsd9++30+fPjwd8f/4JiH+/Uq+05FAtdu3BL/fMas0z//9KvTFy1ddlhTU1McCN/XwSMPeOOgg4a/fsQRoyd1r6psMy6LFq3qmcvlkkoDdF33Hd9NKKWYpmk+IUQcNGRwh7Vg1m7eGN+ytX5vAk1omuY7jpNMxGKNCARS6caKw8ceskdlw2fOmnOAZpi+lJQpUJim6ehMc3O5XLK8LL65f7+ehfIAmzbVG+vXrx9kFdkZzrkRSGFomuZrGvP9nGOPGtH+3NkRazZuSX7++czTP5726cQVy1cflM06tpQSlmWIoUOHfjz28EMnjxszelKPbrvHWj7ry7lDkkWldS5Xcdd1E5pp+KZpOr6bskcO63gsd4Yvv1oy5NMvvjhr3rwFR6/btG5IJu0aBBpM08SQ/ff7+JCDhr888qBhb++/b5+136X9Nv19vXTI2++8f+nixYtHr1u3bogQAjrTRElJydZRow9+ddy4cc+NGz10j0vC/6sgjz32nLr11lsRyCqAUfjKgx0z4LhNoFIhZsVw0XkX3H3tb8/7dcsLH3p80u9u+eM9twVaEZRSMBhF4GRhmwSQDkSQw9ZNK0lHHQPAu+9/cczfn3/3LwsWLBiydu1aUEphGBaCIIAQArquQ4gAXHgoLy3Bfnv3bzzzrB/fcsqpJzxcmdx50TQAmDl7/gE/POOceR5nADGhlAJjBEwClskwdPCA1a+/8nT/f3UQ28PDT/3zmslTX75x9dr18cbGNAIeMkczXQNjYdVQ0zTBvRzKixPo3beP/7OfnHn9SSef8FD3Uv07F2LbsCVlT33ltd+99vrbv1y5dn2yrqEJBDpAw1ehorLXjIBSioqYjqOOGDv9rLPPvOWYw4Z9vKf9PfTUa7978u/P37Zk6TLEYklkch6klDBNDTLIoLp7Bc792Rn3XXf1xVdF13y1YP2gm27+85tzvvq6T3MuAwINAgqEEOi6BioVBg0e4N94/TUnHDdu+Ae7ey+PPPXa1U8/9/wdK5dvYKmMA12zoCgB5xwaFdB0Ao0JjD380BWXXnrxxcceMni3nvebZXX97n7o4eemffL56HQ6jaamJti6ASklQAkYYxBcgjGGqq6VOO2UE5/79dWXXVhZjN16j+u3Ze3JL065+bFHnrmmvjENSmw0NqVh2zYopeFa0BSkCrDvPr1x9sQzbzzrJ2fcVVVEWrU/4uBxaktNLYgWh8sVTNOE7/swDAPHHXvEx39/6I9H7dj3tizsCy64cuHcuXP7BUGAwBeIGSakcGAygkMPGTF70qRHD969NwCsWLuh4uQfnVVb15iCFDp03YTneaBKwjY0XHrJOXdfe80vCnvJK6/N+tGVV//mJSfwQaCBagxBEIBSH6YmcO9f/viTH59ywuSO+tvcxO1/PDPl5slTXrxm/brNCDgBDwAJBk3TQCHhui7iCQ29u3fDTyb+6K5zJp51fdcyrcP947PPvjrofy64+MuG5iyYlQRjDAoCnHswGccjD91/6snHH/3q7ozHtmbYL7306i9eeHHqjUsWr4in3RykIAAjYMwAZLgvURKAMYVkiYkjDjt09sSf/vj648aO3O253xJvfjTv+Gefe/G26dNmDGnOOpCCgpBwvSsuIISAbRlIJBI47PAD5198yblXHDFy38+/S1/fBezeex+66eWXX0ZDI4fre/C5h2w2DRABEXC4jouulVXuyScd9WzLC6+65vfvb9vWpDdnfWiaBiebBVESgnvwvRyuv+7aW0YffOC09jrdvGUru+2uu//+l7vuu2fON8urmpqawglCKTgX+cMhtFhQSqDrDJ7rYPPG9fa06Z8cN3PmjAu799zrq369u67b2cOtWLlmr0mTp57n+gIAyx9mHMIPILiP/n17bT7jxyc9/D2NJQBg1lcLhvzqdze8//Qzz01cs269kUpnQKkG07SglIKQEoSQQr12jRG4uQxqtm5ls76YccyMGZ9ftP/Q4a92qyxt2NO+33132jE33HTzuy9Ofenktes2mFnHBaEMjOkAAYIgABcChBCAAJxzBLkMli9b0ufd9949p7k5Vzlu7Oi3d7e/Z55+/qIbbr3zvtraRjCmwfMCcCGh6zoACUoEmlMNWLF88aj1m2r2+8FRh7+0cmNj6c8vuGj1l1/OKZMCoLoGKQHKwk3CdV3ELBubNq9n8+fO/umhh459pqpLSdOu7uWnF175xaOPPHH+xs1bqJIUpmXDc/3CJpaIW3DcHAT3sGrVivIvvphxTrK0tGbYoIFzd9burHnLh1z1q2vmTP98Rr+mphR830dJSQncXA6xWAwgyC9oBkop0ukUlixaOGTunK/OGjHioOfLSxO5nbW/ektD8oYbbvpg0vPPn1Ff1wQhASEITMuGpmnhhkQpgsAFZQQ1WzZg1pczj3CcXL9jjzj05ZZtMd1ueP2NN8ensy40w0I2m4Xv+/B9H+vXre477MAR0/r1rm61Zh55cspNkye/eHI6nUYQBGBMg5tzILgHJ5vBU089MbqysmS3NbdMziX33v/Q710/ABRDNpsLy5MrCSebwahRw+ceftjod6Lvr1q9te+TTz97diAEpFDg+bLmvp+D72Xxw1NPmLzvPgOWtNfXyk0bSy++5MpFb7353vhVa1YDoCA0nE8KNFxvPEAikUDOSaO5sQHzv/7q0LptW4cd/4NxHR5k9fXNsaeffe5yIQHXDzdpITg4D+Bkm/GTM894ZkC/3it3NRbTPv969KW/uOLr1157/YRly5YbhDCYMRtKEUglwZgGQ7fBOQclElJycOHhm/nzun/8yQc/3VZX33fQsKFvFNnWbnOVPf38mxfdfuddk+d//W1VOp0F0w1Qsr2YAKMUhmEAUHBdFytWLuo2Y8b08wYOGjKtX89uO91Pvy/Q6v6VGDCkL9KuD2YXw1VxwKhETlhwhA0uLSxbuWl0y4sWrl7T89tvN9nNKQ2aXYaMS6BYDAEo3IBD000ceeTRz7TX4ZK1W6onXnR17cNPTj13Q1MA6HEQIwHJbPhKh090KCMGrlvIKQqhW8gJDVxPQJplyAoLM2evqLrs6pumvfDavIk7ezjTSrq+oJAkBs7CjyAx+LCQ8gm8wI5/n4M59Y1pZ5170VXfvPPh7CEpT4NgJWBWJXxlI+dTCGIDLAYBE1QzYcWKIGkSQq9AQJJocig+m/VtxdnnXLL8nY/nHbe7/damYDz38ofnXnLV9e9/OntRn5xvQmhF0IwyCFIET+oIlAnNKoERK4ZiFoTUQKgFXy9DVhajplHh3r89e+lPL/ztF1sa3F36KJas2Fh94+13P9KUIci4QC4gEMSCZicgqA6PA4LFoVgSG2sFnp78/un3P/X+DVdde/ucb5bVsIAVg+sJeESDzyhgxuFKA1IrQrMDBMLG6rV1uPo3f5i1s/tYti5XddTJF9W+9s6M0Y40AaMErtKQkwqwYvBAAdNGJiAQrAjM6gKiV2LV+hR+e/19j0x+7f1zOmp77jerBp5zwaXffPXN0rinTBAzCcFiSLkKQjPhSIJAGcj5BFyz4VMTjmBodiU+/3J+v8eemvTArsbxsl/ctPDlN2aMrmumIFYFiFkCV2rIcMAlOjxqwGcmhFEEDgt6UXdkfQuPPfnKWbfd/9JfWrZ1/v+c8eDwgw5pNONJpHMCXMZAtFJ43EZDWuG31902bdn65qro+/MXLRrwlweeuC7tMnCSACcJZH0gAAXRTPziqiufGjy4z4ZdPUNLCGox3S6BYEXIBjq4VgyuFcOTNqDHEUuUtjrAAubaVlExNDMJHzGkczo8lYRkJQBLQFK93bm4uaGZ3XDDPe9P/2JJz5rGAJpdCakVI8spuGaD2kXgzATXbWR8H8wqgjJs1KcCvPDyWyf+5o8P/6M+174vLuPIUkca8BBHoBUhIwxkhQmfxUGNIkhou/SFv/DapxMv+MXvvpj59bJkbVqAJcoRaHFkXIIAOqgWh4SGtOcAhgZHAdKIQ9IiKLMEtWmKh598+Zwrf33LvJWbU6W7M/avvTv7lFvvuPeRJSs3oykjwPU4AsQREBOC2ZBaDAEzkBVATgA+IeA0gfUb07jw4qunLVq1refu9POvgrqui9tvvx3JZBKO44QqWF66AgBKKRYtWmQvW1lbmKyTJ0++Wdd1JJNJBL4P5KV2XdfBGMPo0aPXDh3UZ/WOnc39ZuHAc845Z9P8+fNLo/aVCk/cIAhgGAY0TYPveeCcw7IsuI4DwzAghADnHFJKCCGwefNm/OY3v/nHq+9/cEpHDxcEgR6plZzzwodSCl3XYVnWLv1Nu4u3P5h+3I033vj8xo0bEQQBABT6IoQUxjS6lyAI4LoulFIIfL/we8MwsGXLFlx66aXvfPzpvDG70/ezzz53wzXXXPNkY2NjoU1d1+H7PqSUhXuInj8ak1CCEzAMA7quI5PJ4K233hp93nnnrVmxekPFzvq8+uqrZzU3N0Op0IwTvaPINAogNDsJEWrCjoM//OEPN3/wwQf9lApNaSKvdRFCCvetaRpisRhs20YQBJg3b17Va299fEpH9/Hkk0/+5fPPP6+QUiL6ROMcBAF0XYfM96OUQjabLXwnnU7jzjvvfLqjth944IHHN23aBMMwQo3B86DremH+BEEAzjlisVjh74ZpAgCEEJg8efJZS1ZsrO6o/b88+Pdb58yZ0zP0PYRmZc/zYFkWdMOA74WmysDzoJSCUgqZpiYYhoEgCPDCCy9cvWXLqlYb0sMPPzzYsqzCO3YcB7FYDJRSrFy5Eu+9994F0Xfvv//+J1OpFCilkDLSUMM1uddee+FXv7ry5zubA+1BCGEQQgpjr5QqzDPOOTzPayXoBUFgeJ6HTDoNxhjMWAyMscI8lVIWDoam1JbC/1955ZVr3nvvvRFRH9Gai7RDz/Mg/NCCRkhoUvby708IgVdffXXipk117W6ymqYFpmmCc15YH4wxBJ4XzVm5szF44rnXLr/66qv/UVNTAyBcB4wxKKUg85aO/FhB0zQIIWBZFnzPK5hDPdeFEAJTp04dcvnll3+zblvzLgXkm2+++ZXNmzcXLEWapiFw3cIYBEGAIAigaVpe20FhXdTU1OCxxx7bpZD0fYBCb0ZldxP7DusHaBKCAIIAQeADOoOggC8F7nv4nqejixYuXjTG8QxkPA/UEIDpwYhJ5HJNoEzgB0cf/kR7nd1060NvLViyDTm/BI3pJASrAicu9BgBsRWyIg1fZgFLgZgKLs9ALzLhBlkITUHpBEYigYAQeJJga2Mzfn/tba8sWb6h3YUtCDMUNAhGwKFADR3QGQLlgSsOV2a/F03nw1mLD//1dX98Z9XGOki9CEJLQJAEdL0UnksBEgdoDIEg4EE4IQoTWZogRjGIVgRF4sg6HJKY2LS1Fldcdc1nXy1YOWhnfb//5eojb7/30etSHoOrbMAsRkBt+NIEtCIwIwGudEhJQakBSkL/g5QSmqZBsmJkfR0OTJiJCrhSw/TpX/Z86K9PPN5Rn/OXbRowc+7XPQWNQSqCXOAgJ3OQpg9i+9ASAsrmyAUOiGlDKgOBMJBzCQKpI1AEQge4puArAaUzgBBQw0TAKdI5jlQmgGYmIZWBL2bN/1F797Fi+dqKh/8+aaJuFcHnBFwBxAA4deHxFLSEgCebQG0Fn6dBbQ16Ig4vAKieQMAtrFpbgwmn/nTNjm1/OWfRkHfe+2hMwAFHSEC3AcOArxR8KcFBwEwLMHVkuQAzYgAzIakGQTRkvABZx8dT/5h0R3v3vnp9bfK++x6+LuUqBILCEwTUMCCoQk7mENAsiM0hWQ5GMYVgAVjMAIvHkckFENTA8tWb8e6771/Qst19+5VtPuGk8R9rFoFiCkbcQsbLQRIKiRjuuufRW5eudaqenPTupR9+9PWYHPfhwgONMbg8B80EFOM4/6KJvy4v2vO6RkJRpnQDnOhwAgVoCXBpgBgxUGaBaHrrNjUXWpEPLckQwIcXBPClhKQGAslAqF74akkyLM++ck2q9NYb/34b95JIOQGg6yCWCVf6CJQHofmgsQBaMSBNBwHz4CALGASO9OBwgZq6esyc3f68CgSxfEkAIwFFLfhSQyAYiJYAqAkupN7edQDwz7c/+9GNt9zxQMqVcDgFMRJwBUPOBwLKIHUNPgE4USCGBhgSQjnwRACrKBlqzp4GI1EJXySQKO6DGV8u6Xn1r274cmtj0KEF4rd/uOMfGzatB2EUoBKCSnBI0DgFJy4ClQMxJbSYBKc5uMhAsQCuK6GUDU1L4MOPpp+yh6/7O4EyxmKapsXGjx//ICEEyGsSmmUBQEEC+vLLL48DgKUbN1YtWLBgAGOhDVsKASgFzjkYY/A8D5df8rM/7djRORde8dn06dP7RZIIs6yCpBtJQpRSQNOA/OmLvPQPEjprKaXINjfDMIyCJLRp0yZcddVVX7X3cIQQAYSSG1pIu5HWwRgLvo9BvPPOO19ctWoVABSk/EgjI3nfVCTdM8YKko6UEshL+r7jQNM0WJZVkHY3btyIxx577N6O+l347Tf9zjvvvI+8vIQUSVNRuQohRKiJAgVpNtImIi1EcQ5oGlReSxBCIBaLYerUqac8+thTV7fX77fffns4gEKfLK/hhjZ0Dt/zoIIAjLGC74pSCsuyEEn1UoS+O0IpZBBAtyxwx4FmGKCUwjRNCCHg+z7WrFkzpL37uOeee/4Rtd9Se9Pyc0jk56aUElosBu66CDyv4GCP5t7q1av7LFi8rk/Ltm+44YZ3Io2xVfmPFu9MCFE4vLnrQs/PSwAwTRNBEODDDz9s1wT86KOP/tXNS6G6rm+XgPNaWmHOMAbf8wCEknrLd8wYw2uvvfbLlu3W5WDccceN42OxWEHrjOZeEARobGzEKaecUnPTTTf9NZVKQdN1QEoEQVDQOMeOHbv1tNNOebCjebczRBo1oRSakQ+2yO8NMuzH3vH7rusW5ibJr/NorTLG2jj8p0+fPtFvMa/D1yJBKAXNa2vC98E9D2ihWURaKiEEuVwO99xzz192bBsAGGNBpDnlbxIgJBTSWrS3I1au3Vp69913/6OpqamgsUT7GtW0wjORFvMnCALQ/Jx3s1kwTYNumvCdMEbEdV14nofPPvts0AcffPCzjsZ9+vTpZ3l5TUzL9yWECPdnQkDy84Zz3mo+G/l1xjnH2rVrsWj52n+7iY0mUeUkUeWcdPSw+zSxETFWB5NkQAIbkKGNMSMpFq+pw7ebvD5LVjaMqalXkJSDgAPSBzUt6FKHISz84ZcXtpmsU99/46y3pi8b49Bi5ASFZBJMZmAQBxwaJDVgQMLwmlGmGmBlN0JrXosifyts0QibcUjfgZIUxEzACRR0Iw4FHY4swVeLt1W/8MZ7bRa3RmsBScCUAUpsqICBEAcakyBSggT/erXuy39/1+tfzV9epbQSSNjgiEFIAo0paMqFiRRs2YAY3wzL2QzD2QI7uw1Gug5xtxmm2gZKGgAjAx9ZCGbCVwZcUgKXlOPldz8/5uuVNf3a6/uJVz65s7ZBwOUGFGMQVEJID5ouAOFCkznEZAZFogl2sBE0swp2UAPLq4XmNCMJCpumoYsUGFMICIOvTKSCGNKiAvf87e2/LFy/vs0kFM0pO0OT8FgJODRA6ZBKA9UIDD+HhNeEMrkZdm4pDC7ADAafKmRVePg4qQyKDAaTN6MovR4lXg2UUwPdEBBBMySyoExAKQKf6sgEsl2b9rQvFx/nSgnBGCSREBDQUAKRMdBVNqEsuwUVpAlJUQsjsxElhgeQFHxkYDMCqAAeYtiSE0jVbOnRsu25Cxuq6zwbDo1DKAYqDRBpQGM+9KAeMXc94t4GJP31KA7WgjACJcKNihoWhM8AJJByc1i+flMbU+W6TelBjkpAMglBBQhT8LmLBGWwAwE7swbF/iYkgxrEnBpYygIlJnzfA7VNgAJBkMV7n66o3rCtqbCRV8TgV5jwn33g9vFJlobOa1BseyCSISAULkws29SIDSmJrF4KERiw9VIw4cEmKfSqBO69+aqRFRZ2K7R4R2jU8RkPYAoD4AEoctAsCT9woagJZmRbtasJ0zeUDV3GQMGgiAsJBwQcDDrA28YwfPHVZ6d4moBDJCjVwAMBjVDEmA6aq0GMr0cJX4+kvxalIgszCABhww10QCuCCxNET6KhNoWNG2rsHduXtIHazAYNBJgSYCIAUwLE56DEAUHQrgb45AtP3T1/2Ubb1+LwQRBQgDECIjgMLmD7Akk0wnC3wBaN0NxtMJ0a2N42mG4DEkxADwAaKGg6AMYhdQM+i6PR13HdLXc8uWzL0qod+5315dwhyzbmmMu6wNNLkZUGqNRhK4ak1gTb34J4Zj2KchtR5G1DMRqhZAxcxSCUhCICUlcgloFfXv3LrwBgqw+7TsBoEHm/V67eQKa2zVjtLrZ4iG8NYAMtkkOH7rfP6hEjRqSikzySkCMJxDAMvPDCC2tee+21l6ITXykFWBak78PJZmHbNsaOHdsmKmTSpEk3R/b/yN4cSUSUUiDvq7niiiteeOONN4YvX768qKampujzzz/ve++9915tWVYr7YbpOry83wcAcrkcbrrppn/s2C+l9N9a9njL5vX2rFmzTvQ8r/BMkZTR0q+j6zomTZp06sKFC4vXr1+lpZpXkYULFyb+9Kc/Xavrej6aLHyuaEyiZ0un0zjrrLNW7dj3sq01VZMmTWplHoh8Qp7rwrIsMMZQWVmJZ5555sRZs2Z137Rpk/Htt98m33nnnWGnnHLKh1F0k2EYEK4LQggM0wSlFJ7noba2Fm+88caVO/YthGAFCY5SiPyzSiHAGMOECRPm19fWkeeff35CJFlRTQPy9vGioiJkMhnYto0FCxYkGhu3kLKysoL0buQl5OjnIAjaJIsuWb6hOpfLhfb/vP9A0zR4ngfDMNCtWzfUNW4mtZvXksWLF5sTJ0581/d9aPlxcV031IgQSpMrV64cEbU996t5g4QQsO38GmuhHYv8M77yyiuHpRo3k08//bQ/EErRkbYf+dI0TUM6nUZjY2Mb829dXV3PyI/FOYfIz6EgCKCUwuuvvz6uqXYT+fjjj/fu0qVLqDEAIPm1F/lA836bNmbi448b8+6oUaM2mKaJTCZTGEtCSGjPj7T+/LujlCKXy+HEE098Y/CgvfcoeOA/jXQ6XRFZSTRNC7VlKRGtwylTpkxorN1Gpk2btncymQy1a9sGlArHOa8dZbNZ1NfXd9uxfUqp7Eib6Qizv5436LHHHjs3shYww4AIgkJqRKRxlpSUYOrUqUfPmDGj+6pVq0oWL16c/PTTT/tNnDjxeTfvx4l8jpzzgj9SCIHa2lo88cQTbSwfnufFfd8vWFla3rvneRgxYkR2yZIlZqppA7nppptuUUoBQQCmbRe6o/XmOE6yZdtChInt4Dy00X9HmCZcSkNzbatGHn7owX2lEDB0CkoEGBGgFICicPwATz7zLKa+9Co8X0IqBcoY4EswaiCesBBPcBw+rm0i2Zezlg4ACTdR3wvAfQ4wCo0xxHgjyvRmvPHCY7j+15dMPGT4vvN6ViYyZXGSGbJPz7UXnjnhns/efrnXgKoEDNEES6Rh8Rw0mUNRzADRGCQzUFvr4Pkpb7eKRBISQH7MQHj4Ufr2x87f03fFNwuWjlm6YiN4QKBrcRAweE4GukZgGwq6lsHYMYPqFi38WDvluJGv9utpp8qT4cD37hXL/uKyM25/99V/jCxlChaPgeYAPRDQFZC0NCjhwmJFqNsqsWDeqgEt+77t1r++5Ga3B1gwaoMxHZwHsAwCJ12DUSMGrP7kk6nJU44f9uZ+e1VuriyhQZ/qRPrQg/p/M+mp24558MHfXmqbPnw3BcOyQaRCEHiQioMwilQ2g+cmv9LGxCZljkWmAhH4sG0LSnAAoYP9tttuGwcAe+81YHa3bl3ChRRwQIUHYybbDF3XceWlv3i4d++qLAAcceS4+boeHiAFE03+IN/RJAMANVtr+2VdD5RqAGGF4AxCBAL4uPDii34Tfbd7me2fd96lv5XKBM8pCE5g2hYCwUF0DQEkFNMKAkrOdeJEI/DdXKjJUwlIF0y40MFx7LgxK448/KDPAWDo4AGrL7r40qe460DTKJQK14xuaPA9DqkEAl+0OTSz2WxS0zRIrmDqFnTTgs40cBlg2P6DnaMPHz0dAA4c1H/FOeed86jgPiDDA0/lDzfOOSSXcDKtN4oIDz9w32AoDtvSAMVhMA08vzFHAUNWXAf3syDKw5Chg/HgHbedtDtzv0OojtwOCkwpADv1we8WGhsbq0KrEYGbTcM0NCgpQKBw/PjxKyaMG/M2AByw/+AVEyZMeFtTBIoHIEoCjIBAQkkOCYJMJlO2Y/stzfC7i3fe++JSL5cApAXLLILICmi6DZMBUBnoLIOjjx786fRP34yfePTIj/bfq3xzj3La3K+6KH3gfj3XPHr/9Wf//Yk7z07E0zANB+BeKJDn3xWIBqAIn3yw8Kwd++aBZ/i+H5ruFEDytx0KShquuebqs3pUh4nWp59+2p80paDHbQjfBSBBCAUCC8QrRjbFbACoMuBUMPhdjHw+ZLIqi2RVdluQZpudxo6jW7Obk2hcW9DGgqZtTGUaWBkgurBQe2516OzXv/vmgw8+OBtFeUQSW2RHrqurK0QZRb9DXiLPZjK47rrrrsIO+NtTz14TRchEdl0aXZsfmEmTJv1g9OiDYpF0vyP69OmxeerUqV2rq6sLG5JpmgVbsJ/LIQgCvPnmm79o9TI4/7dSzUybNu3saHJ6ebu7bhihzTidRpcuXfDkk0/2qS5NdKhxHTpi8Jzf/va3t0SbbBRVks5H8+Tyz7ZgwYIjW1730UcfjYkkvZbSdRSdM2LEiJqpUycN7FOVTHfU94Xn/vRvv//972+JorMie3D0bkzTxIoVKzBv6fJWB55SikbfkXm/C8vb0lNNTTBN0wUA27azUUQUoRQkH8VjmiYIIejRo8fSqM14PN6o8oJM9H4L2nQ7cBwnER24AArROtH9t9SONjfK+MyZM08xDANGLAYABU1USgkZHnSFd2QYhhv5qwAUtNdoMzryyCOfa3kvlFJBCAl9VS0sBIVnb0dqFkIYjLGCPyfw/YKWO2LEiPdafvfAAw98N3rX3HVh5DWwSBtbtWrVAe2NUd/e5alrr7329kgryOVyiBUVwctkClpCS63sd7/73U/aHez/MmQymdJoTGOJBNxstvDuq6urV7T87oQJEx4khCDyAUXabYs9rF3pPdI2dhdz5849LhpPIQSQn79RhGOfPn3Sd9999wl9Krt0mLd14onHv3jddddd47ruditQdD95TWnFihVYsXpLK3OtlJK19BW1XDOWZaGqqqoQSdyja7FfUlKCwPdBtNbuBUIIHGfn+cyVepEoWADaA6UClpWJftRLKgVJlLXa/9qM6uiRB75ChA+NBjCMMBOXMkApHZRasOIl4CqMCJNQsDQTtiDoVZ3Ez392wn07tvfss2/eymUxpFJQ+bUXmeeoDPDTU4746LhxI99PmnBKk2a7m3PchBjYp3zrOaef9KhwU7AtHQoUnlKQlMJIJpFxgA2b6/ZteZ1lxLJQYQgriBd+FAWUDgqAgP9L5rdpn86ZmPMA3Y6DGQa4UmBEwcvWobw8hgfu/fNJvcvNXYZl/+rSM27sXWnARhOktxExox5xqxmKb0LCziKTXYvFy2YVwqdXLP62jx8YcDwXYBJc+dAMHSogkH4Agyr88hfnXV4RR4eBEo2pLXpWNOnXXv7TG4fu12szOAdTCgQSVKfgSkAoAcMowTPPTL2z5bVUD6Dy5jXTskKpWUhoGoFh6KiuMHwAIERBozpMTYNSHCpw4eVyIIqCQCLtZAq+GsvQXaIkoAIwQpHLZApmNk1rJ3ucMihQUKXBYBZc1wGlBL6XBtMkLMvIAsDaLU58/jdLD3/8iRdu9nwKP0AYoKIkNNOAFAJmzIBh6YX3FChpcORDr4kME/cCF1L4MA2KivLiVuanoqRdByKQaW4Gy282BfNIKLS1uX8CJqQEgoBDSgWmGaAMMHQG7OBOkcJhlHBw3wXTdEBISC5AmYnAV6BU73Aen/2T024sLYmBUQ7T0OG5LmLJJITPobiEySigshg98oC608d3nDC5pyAAqAKIkiBKgkKC5D/tQwJEhv9CgioFIimUEm2kai6IQXUDUio4jgMrHi8kXCslWu1ppcmirYL7sDS9ILACgEbCOdsyJDtCFNq8J4fOokVr+qXTAtAYpKTQqQnFCUzThE4D3HH7Naf2796xAAgApSbE1Ref/pdjjh4+W2cSFjNBpAJEKPhTjYGSCjz6xIutQ5ulYhQEWsugJSgwAJahg1HSan4oJkCZAJSAJBScMQg9CxjbwGRd+zeXbWSiaZsBAKWwOt437a5Z2F073PPqPbA2nvTzzz//qof+9uRE3/dBmFlQwwGEGkXeBxHZuMMIJIKTTjrpjfY6qa2tNSilAKUIAg6AtIpXP+GEtgdVR7jkkkuu+tsTz17UnHEhmQldD/MVFGOIx+PYvHlzfPOWOlbdrUIAYZ7O7ra9p9i4pcFYvnw5I7SqMJHDiarDMAzEYjHsvffeu80Vd+ONN/7822+/PbxL17KNlCkRS9jNAwcOnDlgr/3m2rbhl9vbw1c9z7MiSS/KhyCEQOXzR8pLkxg1atQ7HXYGwDTNvF4NHHXUUS/OXfiPqyilcPxsXhPZbueNotUiUEolzQsOQiI0iZkUPAhaMXUqpWiQt2vD0GAmEoDjhX4Xi7TKk5JS0jCHwITgAnY8HtrotfZ9c4wxEWmZQRDAjtsh3UlRMbKpFFzXjQPAMccck6mpS4EoK3xczwOLx0GNUKojBgXnHvr06VPg+ArpeHQ4jgOBUOI0bRsq4MhkMm2iHqWUTNd16JYBNwg1JN9xEdPNwr3ueP+6rvtKKVvP0+mE0YQeZBDAaiEp5t9VVqkwWz8WK0Iulws39Xwk1s78D93LS/x//vOfgw8fd9pCRVUhLy5/D+C+g/Lycjz11FN9OmzkvwzbnzmMxAz9hhIGZQXfV4TI/8iwXeOM9i4peSsNt2X70R6F3Tx4ampqkEx2QUZIKAUEnhdGofkZDN5nr9oTjjzio919vvHjx//jk+lzD8pkMjBiifz80OC5OUglUF9f38pH2FKzif5PCAHUdo2+JaLoUCcb+rcIISB5eqyO5pISgrGStpx/e4pyE6LNobN3r9K6gw8c0jh7/relgVQA0SCgQzPi8JUGwmjBnkyVgh5wQGQx/tiD29DJfLtidZ/mlAbfZSBWaOsmMEClglQCvgwwZOh+u/0yTNtC3wED8M2SdfA5A9NNUE0gyKZBNA2+TyFJwIBwg9Z0M1Akb+OkYegglXr4MwmAtvNtt+H5PO54HmhCh5ASus6gcQHPcWHpFNWVlWKfnuW7TaT50zOPeQJnHtNuftOOWLq0+eDmZg8SDGAcXAVgygQB4KZzOOrkCa/1rizaqYYVM8sE8uM0evQ+b/p3elfZtg1TY5CBDyk1aIYB13UhqN1KGhTCtyg1wLmEqevQKBAgAAhrtQCkEEw3wvkipIKXzUFTgKbn13KLBUEBqVEGCRTMhZZhQEC2G0ggFJgkFECY6BbwhpAfS/iwEjYMKzTx5YIAkDoItWEQwFUK3A3AiELcZPBlCuWJGHpUd1m+/fkElVLCMAwoyuBms6CaBovpAI1DQWs1HowqISAQZDOgugEGAiMWg/QCQBFwLtvcv6+EHUqkAPdDuh5b1+G5HigRrSYm9x2dUAXLsOC6bnhYBAGoAKQiULuYxgcNGrCoKGEh60pIqaAxE4FQ8BwfliZw7JGHzexZqu9SI98dEAVBFaDC/4OGjEtQCnlLR+tDQZHWv6EKKGx7hEOS9lkDZLicIWRodrIMDX7Ohc5Iq13W0JmjMwqH+/m0i3yqAEEUCNOu6hVq77vn01myblk11SlyXg6BUoAgMKziMFyaEBx26MHtCuQdoU/PLksMZgGmhkAEEEEAYiowTcHSbcz/ekkrIVBJg4VGKwWKcAAJFKQUUERCo615KmUQwMnUg6AEkCYACk0kIKiBnFGMGg9xncAtNyCQW9GHb67pQRkYydlZdB0REhN//c9zlsz54gcalWzAwIELcMiFrdNksmuqvZXzxzR+/dE5vu/r1SMmPKH1Gf4xSnvWtXuM33bbbeMiKSry3fi+X4j6CPJOq8iOzjnH8Ucf/e6O7ViWlQmCAKZpFuLToyiOyLbas1ef3Sa3pBSirKwslJwZgwgCyCCAls+4zkclFSJ5giCwdrft7wIzn30e2YwZY4VMeiHamgW+LwRBoLfMto+kMsMwYBgGBgwY8M2etNelS5dNUY4VEC44TdMKWlQ2m23lqJZSMu77YPlosZa5IC0lJcaYiP7GWJgAGvmsIht7hEjijKJ/ooz/fCBBm/copaRR7lEk3Ua5MW4u17LdQmZ+EARh/lkLLZEQgpNPPvndXn16Zne8RggRZrFbFvR8xKRpmtiyZUurEHZKqeCcw8r7i0LuMD8ag3bnQrQGfN9HLJEo3E8+v6bVIRVJ3pzz8L34fsEXlPeT7nKuReailpJvxHfo+/6/dZ38OxBZSlrm6eTN9q3GwvO8eGQJaMla0SJYoN09sGU+3a7Q0NBQHVk77FgMWn4eRvdXUlLSgc2qffTs2XOll2ehiKJ1o3vJ5XJoampq9f0dLQEt8wDz77eVE0bXdbC8DwzYrh1F31cKBU17w4IFB33yySefvfHGG9O++vzz4wFg5vwFB3wzZ87huVzurHQ6ffrCb7455OUp/2iVpLx4/vzRX3zxxYuNjY3Hp9PpY2bMmPHip++8MxEA2k1U6dW9YtHe/auxaOkaSKIgOQMzE2EooE4hBUDBQSFAfReTJj1+anvtSCmZxgjSmRyMoryEIQEYGgIuoLE9s34FgTQiSU8EAahlQXLZakHFLKsQ2M8ofEgFzdDBZWhjVxIwmYbQVNpWAt1d+EHOJmR73wDyLzjcuPc05HJTXcb44y1/fq24pLJOSYqAEFvTNL9b97IVQ4cO+hjZNI4aF0Y0EWoKwjSovEtO0zQIP7Rvxw0druvG9qTvTCZXEtHZCOXmfxva1vMh1a1OCEqpoPkJGz17uIg5NNryuSVjoKBEgUsBQgkE98HAwCgrMF8DgFKKKaXydn0CImnBV6SbtosdwBiT0aKMIIQAoTpoGExBgVByphDQKYFGCYTk0KiEJgWIymGvPr3xyG1/GN+ybaUIGHQEwgfVTAR+AEPXwUwdrp/DLXfcf8NDDz9+Q3FCx/yZ7xOI7fOPMa2Q9AwFKClBtbbmtUgAiwJ2wihRCSFV6Hds+axKBhokRJT8mg8WIZRASoDtxKcTQSMSOV/C1s18wnU+yVR4sDX6vdFBKaUYIQRESMi8NhEEAXRmQHG5PQQ3GgdQKEVAEO4PMj8PiRDgrgcdtI1QSggRLJRooCgpJD6HgbatB0+jJOAyACM2JCVQUIWAJraD073FM+QPpt0zrVVUVGwIQ+mjhGEFJQmQP7g8z9uj9eh5nkWJDsJCzT8KSIibFqTwYZutZYRwzAWkpFB5tnYpJTTGQKWEptFW65cIDigLElkoqsA0DS4Pqbj8IAUDGZQbCZFOb2Hrn77mxaEDBmCJ2huVEAbmTL1AvvnmOT207Bii5SCIC+6q4/vWrxzmfGOnMgNPe1UI6HLKL14a3qsXNtHeoAD6+ysRbFhyZe2KA99t99DpVlkk9tprr/mr1m45wFcaqG7BzedD8SAAoRSMMigZoKqqCgceeOB77bVj23Yqkt5cns1H9JiFjYIxhi9nzhp68OhRuyWZGwb1161bF0q2hgWZZyuQvgfBGBKJ4kgqzgLbJcRsNgtqhTlCgUPyNmDevoN6N2HbdrPrulB2OGl1XUfgB1BSoCgWgxACG2uzRo8u8d3qo76+vnrKlCnHBZyCEh0+wsmvmxJCeDdcePZZL0eHTo8ePZaapoms54KZWmieIVbI3+Sm8cYbb1xw87UXXLO7z7Jq1ar94/E4stksQHkh0MMwDBia0a6kHjJRAOy/vA5gtOlZVjLkR3NcWPE4pBtqyQ888MAhO14ThWjrug4JHrIC+H4+JyTM7whyaVh6l//8A/3/AGG0X8gQT0io0VFCIZWAYRitBAgpJaOUgoCCEQItnyNGhEBJLNauFrdjhNb/NgzDcCzLgi9Ci5CuWTD00OLh+R5WrFjRLqNGR1i6dOnwWCyG+uYMjHg8b3kw4TgONAEMHTr0O9WDag+F4AohQDWtwNrQ6OdU3DSRTqfh+z62NW6bP3r06FUrly49IJFIjMk11E7euGXZgcyUtLyqckBpZVX1ihUrDhoyFFMefu6VK8/q3h1NTU3zNrt6Tf/+/ZdNf/eDq4qLi/ssanpySYc7xnW/u+qHbrYBTq4JFD6IUtAohUYZaOCDSA9QWRw4rN/8Hr3sdk1kvSrLnUGDevqCp8FdB6ZmAlDwfS/c2KiOzz7/8szdHaBp0z47tqmhHiaVsKULKvxQslaABgGdcRhsu1SseGAUxWPQGIUUDDwgENKDbjJohgEh2Xc2gfXpXpVNFFnQGAGUgOAcihLopgHH97CtoQH1TU09dt1SiFtuv/9NVyZC7jY9gUDqMGNdwHkFfL8SlRV910bfTZQ2NyZLciDEgfAoNBovbK7E0LBpW03J10s3tMti0B7efnvWuY7rQTdMEE2HoqGEFjguUo2b0K0i3oq8lcBwCaVhnlYrMEi01HRomCrV4leRDV9GvrY2oAAoJIm+LxHq1h0hH/GkaF5D0NBSgWeUQ8oMBG+AruUQMwLw7DYcNnLfum9nf9513IiBbfLKdMN0XBHkTX0KpmlD10woGWoW1IgBehxKFcyrhfvb881Q5T8h52H7T0jp9nyzKBEj/FcSCbVz/sn2QaJose8XkeM+kKHfxPV9SACu50MSAgWj1Z5DoItIY40CQwghoIRA+AEU2hF4iGQCqjBHgHAWqN0wLoRxdOFH7aYmsyv0reqd0qHB1izYZhxBLigEFxUVFeHLOV+PXbFpc/HutrdoyfrRKacJdlER/JwPzoHApzD0GAzDQGV5onUJAuIV5l8U/7dzUBAIEKUhwQ0kuA3QOLg0EXc8WCmJ0sCE2Mbhawa4YUGNOPUe49CfPJXdPP8YQ6vH24xg9FOrBh50xzsHfGiMRJBV6N68YV8AENtWluksiQ3r6qqO+stnE7pOvPu6CU/NxSH3fIgLr7mzYzF1/4F7rT3mmGNWx+PxAk9VlBMSRX9wzvGTn/zklp093sCB4aJOlpQUsq0j3i8hBN588802Ge/tYfOWWvbcc8/dJmVYlKkl1xjN53106dKlsVt1l8ILiMViqVQqVfA1RMlWUU7Mv+rzGTZs2Naw4BQtLJbIv9Dc3IxJkybdvOM19U1b2iyi5WuWVX355ZeDgNCu7zgOLMuC4zjgnMO2bQwZMqRQcKykpGRrlMsScdK1zHFyHAfPPvvs9bvzDPMWLx2wZMmSkS2jfiKzj2maMGMxnHPOOde2vIYQIpRSobbzX47m5mZQSrH//vtnjz322PlXXHHFM59++umBH779QpeBe1d3GOjR0qcZ+a0iU2LE/tyJtqCUiu3RYbLA1BDPhzXv6K/Sdd2PEnsBFFgdYrFYxGCSaa+fHU2r/9sYNGhQNpvNhvefD/WnlCKbzSKbzeKBBx64Z3fa+WbFyh5vv/32T/NmOViJBMLilmGkru/7GD9+/KPf131HLAZgDNjOSQkQgmXLlqFv377gnKNnz55LgfD95vec8EJN0ysqKmBZVoHdQQjBIs7CXH0N1TRNX7t2LVavXo33339/57aRC88/+3LFHSjOoVEG7gfwc1nETANUcVQVx3DSyUe8urM2fv/7C09VchuyjfV5IU1AgYCZNjgovl7bbF9w2R+mb9jmd8m4aNfHUpeSxS+9+cl1n321eHCOUxhWPJzEQkIFAQxK4boNOOrIUa1q+HTtVr6BaTzvcGdQUoNuaAjAwQOJmtpMzw116e/MJzThBz94OGYCGkIuN51SBEJBkBgkjeOZ51+Z+MLbn7XihCsv6dZmp77nkWeerkv7kIYJGCbMojhc4UFpHJrJEQTN6Nu/8lsAgKgzelUns72rbYigARQ6lKDh2OoKHAqOL/H8y++cO+nVT89qcNuP/qn3PLZ0fW3X31x7xxtrNzXrRDfgCQnKdBBJ4DkOPMeFHeMYPny/VoXdZKDpjLHWNBqkrYSlgFAqV2FWFEDC/xOJSKMpXA/Q3ZFUIxAlBVVyO9NEoX0GKFbQouo2LiOZ+lXks4+nJF74x70H3vb7S/9n9OAeOzVP+FzaBbLSwAElAoYGEBXANhl0jYBRBajtBz2T0TNGDx/dT/v8fgRSqLyWEn2oovnrWi9LqqhU0ApjHEr1e6rh5O+DSGzXrlTYV/u+9O8EpkFEIedAyI+qFEE668Ew4/hsxqzTW36/tqmpp2XFAE2HxgwAFNwLCuSmxcXF23bsI0zTCJdRmJESjVnH47H9exG+3+ceun+/j+NFgOIcuqkBmkQg3ZB5nMTx2huzz3v+lWk/7uj6+pxgq7e5xTfe8tCkJSu2Fitmhnln+YAU13VhaToScQ/jfzCsVdCWJOG0aW/9CNJ2PgkCKOhQRCLQHfhaGgjCqLucnoBOHWz95p8IFj6NqngXrJi/DFVFJVsBoCHWZYMX+DimVAvw5jVXYPmiqr0Ih0ITuKjvCQDFiUTDmsYG7H3QyO6Nb98htC//3lz01n3oOu1xzJs/feeHzqBBgz6vrq5u4ezMx3c7DqSUuPXWWy/b1cvYq0e3xpEjR2aLiooKvFoAQhbVvL/lrbfeGnvHHXdsW7Om/RIFjz322M133HHHzdu2bStIm+l0uhCF4rouYrEYJkyY0Cpsu0e3vRoLTkPGClF3kd1yw4YNmDp16u/WbqyPtyRN3F2MHTt2coEptoVkF/EnpdNp3HLLLf9485MZx7d3/apNW0p/ef31L/3zn/88LuIoC9Jh/ljUhuu6GDBgAAYN7LsBQIHu5a9//evgyBkdLfJIWjRNE6lUCrfccsvzL7748iXt9b1y5cp9fv/732+ZNWvWPkDeTp5/lnytIZimiaOPPnpBr4ryVubTiOnh/1VpX9M0P6IViWoNRYzXUY2VSCLvRGsIIVhLZnEpJRKJBAzDgOM4WLFiRdXarQ2FCNNnn332NsdxCqwemqbBsG3ouo7S0lKUlZVt3rGP/zYtBwDGjRv3XHNzc0EzLnDl5fen+vp63HTTTc8+/tyL521uzLSZOBs2bOjxy1/+smnatGljk8lkYf1HUXmRBjJ27NilbTr/F1AYx7xWn9+HtAULFjwaRSbX19ej3+BBGwDgkEMOeXXFihVQSp27atmy+4XjLK2qCllvosjhcy/5xe2rV69GLpdDXV0dFi9cCNM0UVNTkz333HP775RmuW+Pbqkhgwcu2rRpxqCiWOho1jXANk2UlNk49JCRU3bnwY49dtTjX3zx5C8NuwS+70IIgBg2KDUgDRs1vsDjk9/CR5/OXnPYqGHTDjvssBcog1i8ePFhb374yc9WrdkCVzLQRFc4PodumoBpgRIKEA6Nuzjth+M/PmD/vVbs2HeXiiTWbErBKquEUC64TEEHg1IaMjkft9zylxuefPzZG6jG8ORjj+w7YtiA3X6pBx6w/4ph++8l5n69lJmmjVzOhWYmwDQKx+cwaDFWrW7C2Wdf9dbRR49ddNL4CQ/26FG9lHNufPLJJ2d/8slnExct3coCVQlOBRjRYJUl4eRyMGOlEH4aRhHwxN//NDTqUzO7+hqAg/btvmjEfsOdeYu22FJIQN/Ox8U5YFslWLG6Edde/8CDL0x+/+ofHHvIcz179lzW3NzcZf78bw//+JMvT968aSvMRBe4ngtlKOgxG9zP5jm9FAzCcOaPT2hTpoJQO5+YGdaiBxAmYtB2/Bl5X0QrKUxpAAkgaEuhJy/l7+FeokiUl0C3t60UoLTvfiIwBQkJpjMI5SBwAjBpoSSZQDq7DYm4iSLDAKOhptN6A4weKU/zFEqg7dxLqLNIEn0TACn4JlrnRZGOwjw5FJGQZNch06HGxVv5QQp3QtvXhr8LTNN0i4qKUNuYATN0KBA4rgfhE1iGiabmOtzyx9veOn/ieb/+5z9fv2be3PlJ07BBDRu5XK4gREnug9sWiouL24YbEwkGAh8KKj/2YZYK2mgvEoSRVr/LJ4gS1e5YfFf86OSjp/Ttl3xxw5YcCGFhiQZigCgCndkIPI7Nm6V17XW3//3Fqe9eOfqQse/uvffe830/Y06bNu1HX375zTGbNtZBqFJ4PIAWt8NgHs2A7ziwDYpMpgYnnPw/7ZjWWjxfC61HduheJAj9oCYCERIA6JoHQ8uA0gRoSbkwgsbqFAx8FvTCCfdOGxxdqQ/76aPu6CKxdukzV3fv3mugpxM0cRf1si9USZ9CQJk44f7z5qycfdIYuuaUwA0wJxvH1uJBn100cNjqXXL733XXXYe8/ubI5kCGocpKhtxCvXv3dfbu3W234s+vv+raqx588LVfpnP5ipJ6mB0ogiDPlxE6wTds2IAX1y0b99xzz42jLLSrC92CUGZYeIyF1wWehzD9KTQRJOJxXHzxxVe01/fPfvazh//y4NOXZvOaFTM1UBBwKaHlw1s3btyIQHAkEonG3Xmelrj55pvHn3raxPdD1uLt9TO2s07rcJ0M3n777UEfv/fBI77vFiRATbMgRBKGZcIPcgXNBpTCy2ZhmBQHH3xwqm/fvova6/uyyy675H8uuvZpKSUIK+Rs5LONc0jks/rnzp3bZ/aXH10f5VX5voRCDJZlw8/72Qphp5SCgoAwYED/AfjR0RPaCBaapgXA9qzn/9fAOTcsy0IulwNIGMLLpIlcLgdKKW6++eYbf3bGSX8qi+15kbP/19GzS7nTs2fPug1bVlaIKCiAUhAjYuHmmDJlyuEvP//SV5QaoKYBGUi4uVw+WjD09cZME2VlZeheWd1u9Gchgu2/SOF58sknDznph5d94QQCXCnwIGRwz6XSSBSVgDseXNfFZ599NuSrOV8PcV0XhIRs4Z5HoGsJKKnyZusAknP4XEG3LIjAwUEHHeSfd8bP7/s+7zmqXCqEgCc8KBUqoVJKNmPGDAwef9ZdvXr1aiXM/+Rnpzzx9V2vT3zttdcGBl/M9VOplEEcDwcddFAhcOrE089+asFLTVWvPfzAKYlEDAMmnP/qKf9z9cVAB3k6LdG3qig1YfxhS9//cPbAMKGNQHg5/P6qS3+4Jw/3ybsvdx856vBNtlkCxxdgjIJJCZjhZsupQKDFkA0MQKcwrTi8TAZMCwt/UU2BiACUAkq6oIyBKI6YaMKVF1/y8MjB/dvdmMcfd9CjDz1816VEMXhcAwli4DChNAOOlNCIAYNx+EETPEn3uJLoDw7Z94NLzj17ypNPPn26L31QJQFlgGgaAk7AqQ5p6FCSI9AApifguxlYCRPZIIBkGng+nwGBC9ukUDwLSnywwMdvLzznjEpTa3dz+8kPD3vmoSd6PfbV7PkGVQxUmgAkAl9AMxkcEUAyAkAHYaXQNA1ZLwvdskCZQiZohmLFUATQlAQNfDDhwyIcRXGCb2Y+1+6STkNL2pyDKwOepgG+j7hNoFwfSuWwNRWwqqQuXBKzoacBkgFVoUkTGoHverB0HVLRgoStQQVUUQgZkv4GKqxhQnkKhtaWhZAoCSYIpDQBxsAohwo8aKQZOpXwNOs752AZtMTRggwol1BWCVzOARHAjlsIss3okrQ2tDxwMtQsNU2FbE5AaqHjNxAuJPFgKwqNiLbca4EGQzJkKQd8BUZsMAVQ+ABrnZbERdbQaAqEF4NSC5IScACBQWC6AThv3xfaElI4oNAgJAXRDQhKIX0fRArQf4Waox1ccvEFl3066+IXQe18SD0LK/9KDkG6Q7cYvFxtWIpCJKEkhx6z4OdyMCwCJrMQfhonTJjQLkMHETooz0AncfhGGeB5EP42FBkCSeG0LsBjGMjCh4SARjVohACBgKY4qOLwWFsGcz2I+USlAKpBURsEGoTPwXQDmh8D4e0rhocPHz5zwmH957z9zswRAbqAaxp8X4AVxeHAAzUVJC+FoTEgyIEKDdKogBsoEOYhUBIwXEhIKGkCZhym34ASmQIox9MP3d6rvX4dRZMGAD9gINQAVRRCpMBYAMI1UNH6/UpoiHMGT7qQdsgpaBil8D2KYhnK3Udc8dcJR7QrxocYcvmdRw25HKBWRYdzZ8hpl90+5LTLbt/x97vlSTvssMOmRH4Rzjm6d++O4489rA0Dwc6w397dN1911VVPZPJEjlG0lZ93GEbVHJmmhfVy0mlodqhiqh2qYkbRYrqu44wzznj3hhuv7dC3dPCBQxYMHjw4FWVzR5D5CDael/TzVf6+k5nhmmt+dV7EbhzVmAnSaRh5xmnFOYwWrLMRbxkQJg/yvC8mkUgU/AWGYeDaa6+9a/zRY3c6zi+//HzZsGHDCuMX2X55vnInkK8amrcRW3mCzqg6aZgLtL0evGmGEv0f//jHn3fUZxTBEtXfgWEgm063iuIDAMaYX9CeaMjNFkXG5ZkHCpullJK1NFNFkZKWZcF13UR790ApBcuzQkTzM2JSaNn2niIIAjuKXCv4rQhplc3fElJKFtWejyTHlr5Dz/PaREkWWDlUWEU3sp/nx6vVQtZ13Wk576P7KWSst8Pt1hEYY/BzoaCHFlnp3yfGjh37ao8ePcKqsvkxVEEAYhghu0m+Sm7Eso28bxJ535mmaejduzduvfHaduegYRhOxBiBXA7QNMTyrCQ7Msv7vm9FDOCUUgS5XCEiNL8ntBEINE3zo/allBCcFxI9d+VLev65SSOHDBmSLcz7/L4gPA9BvnZVxOxdXFxceJ9GNDb5fDBQCuTbqKurw7333vs/e+/Tu91oS13XnWjdR1pLNH/zc7LVxG3JIh9FqgVBEJql/wPYrUNnwvHjH9Y1CSgPjHBcfOGFOw2T7gi3/uGyn995++//5OQ2IhF3oGsZxM04gpyEn/ZhwgANJFgAWLE4VMBhQCEesyGyGVgagUkVDJ1CBC6GDx2cuuGG35+wq35v+/Mfx1HlgioHRKRgUAdxi4OKZtimhApy4EEWuka/U/nqriXIzv3yndjBB+7VCF4Lg2URKyKAbAL3UiFTl+RQWReWGQclNiQ3odEixCwFyCYYzIXn1gMyBUuXGDdu1NLfXbW9JkxH6GYjO/nJv5bt26dKmDILS/mg0oFJKagQABeggkFnSei0CG6aQgQxwC+C8ItAZQZwG2ExD6YmAOlg8otPnzrxZ6d0zAOnPMggAxlk4KfTMAhBwkpAcgWb2WD5s1v4xKDKgBKApnSYzIYODYQD0hcojsUKi0iD8DXig5EsIFOAyEAEKXA3C0sz2obNKgFKAki/GQwONOKDSAdEumAIoFO12/RKO4IR4TMV5qIpLw2TCZiGguBZaEQiZmitpGmLalkiXEDmAJmCzhxo1EXgNwHCK5R6aI0cJHdAuAB8H8LzoYFCZxrUDgk7lBhSBBIUFFQBGgioBOBxCO4iZrW+n/ZAiYTOOMCzsC0Kk3igPAMBBU/y75UGp0sR/LNPPuoJ5tZBiRyIDGAwAhp40PwAMcOAQBGyOQY/l4JlE+gyB81vggEfbrYBV115+a87at8Twk4jBmkmAEMAKgfXzcHlAh41WwmOJlPZOAOkWwfpZ6HF41CGiZTQ4JklMDPZNppOiqDC4Ro0LQmNUzBCoRsUnmxGDg6Ype90n5j8jyfKDhhY6du5epgyBwoPiJuAbSGjFEQygYwex9ZUFizmQ9E0vFwzLB0wCYPMcdA8O7cWM/D4s3+/7KwzJjzTUX+UUul6DhR8UM2HZnAQ5sMPcvC9kBC5JRQj8FQaLhfwmzXopAyEGtDMOHLy38+ItFuHTllZWd3hhx++OsoNOfjgPSOwa4lzz/3ZjXfcccef0un0droGTUMymSxEpkURINHPruvCtm34vo9sNgvXdXH++ed/MO2tZ4q7VZbuUsobfeB+85977rnTNC0kh4zqVUTak2EYrerIfBf0qq5yHn/88f7jx49flM1mC1KLYRihdOl5sIqLC4SNQgh4rhuGQtohQ3Jkpz733HNf/dvf/jZ4172G2KtXWeOUKVOKjzzyyNWu6xYi0CJWgSiPx0mnkSwtDf0+eZ6wiGctysV69tlnJ5x84thXd9YfY0xE10WULBHbM+e8JYfb9qS1FpxXUe34VCpV0eLvrKWEFuWFdUQv7/u+FVXxjKL4IukyP+bf2WQUZWlrmgYjrwW21JR35LJqqflF99Gyvk8ul2tTZM00TTfShlqMaxsNsGX7kd8t8htG17ZXOXRHRPcXheC29D3+O/DHm3778169ehXWVctyAZxzBI6DeFERrFgMbp4Xr6ioCEEQ4IILLnj3xz/+0X0dta1pmkA+2hJAQbtv771ns9nSFhx1hbHgecm+vbIT+fygguYvhAjrz0R5Wrvgquveo8J//fXXYz/84Q+nR2sBrgvCGMA5hOuCahq0eBxuvvpt1E/kA5Oui0Qigdtuu+3ac884sQ2ZcktE10SWjUgr1jQNtm0jm822Kfce5UvG4/FCVC/P11H7d2O3Dp0uCSbuvO2mw0xNoLprKQ49qP+c79phWQzi1xefef0nH0w+eN+9SiCdZlgI4KQaQGUOMU1A+Q2waA6aTIGJFOJGDvBqYSCFffqW45EHbr3isbt+feye9Hvq+LEvf/jWS/uOOGCvxhhLQ0MtdNIEKpshvCaAp2BS/p2lYwDYq2d548v/+Nvgv/z52huTZoCEGUCTjdBkEyzNBfwUTMrhputhMI5EjMEkKRhBI4pjEtXlJh68909X3X/7tadWJXfNp9USvasS2TdeeqL/fbf/4drymIKf2gINaSi3ETRoRtzkiMc0ZFO1oUYjcvByjbBIM+BtxYRjDl4xc/obvSYcO+ztXXYWZMGoA13lQEUjDJIG4U2IGxIa8VFdFdbbICIQJpXQhAcmsqF0LbOQfgOStkIyhkIgisGko1MPJm2CQRpBeB0YSUOqLJQI2pg9EwmrkUgHhkyBBY2w4SCpc1CRhfSa4TrNbUxyuwsdfqATD0Q0gQXNsIkDEzmY8MDggWmq1UbF3awu3BR0ZFFkOrBoCuANYDINxV0k7USbgBuCnABJgQXNsJCDzVzoKg2qcrA0tNLsXMeJAy5U0AyTZhFnDgzZDLgNiFEBk5FdzlseZEBlFiVxBl2koPFGaLwRUGlodotSDelaWzZvteHUG3DqDeXUfWcz5eKvp5HBg7oIYBsoTSFuUwTchcYsxGMl8DI+hNeMuOai2HDAG1bipit/+uAjf7l+fJm1kyANLwfqNsNSaWheLeK8FsxrBLxmKNlaqbTLq1IOIeCKwrQ0KL8ZGm+GSZqRUPXItrPJxv1cVuON0EgKWW8bdJ1DIwKaYojpZhtzVXuo6MLEE0/dOu6+P//u+hJDIG4qmDwDE1nENQ5TBOAeBzFL4QkDOWbCUwKBakSF2YCJh5Zh6Wu397/s9KPa+ER2BMvUU5MGkCIHQT0I6iGACy4cqCCNBEMrTZgQBWXaENSD8tajhDQg6TSiUjrQ5O7RxFGrQuzMn7Mz7LZBd9++lZuHDh2auunGGyZ8l452xGEjh8+e/dlHZNLLn5/7wuSXrv/sixn9giAosLMWfDj5AkYDBg7Ej0475e6LLjz3t+o7hkyNGLbP0ilTpnRZvmzVkMlTp9y8Zs2G/XkgDHABztPfW5XRKy8+75Yzzvzpn/50x19e+XzGrBMXL1oO3bLh5HwwzUDE8pDJZJBM6NirTy/84PjxT118wbmX9aqM/0sH32UXn3P7qaedcdfd9zz0/PQZM09fvmINBAcy6TQSidJC2QDGGLp164ZRBx209JKfX3jZMWOGf7zr1kNUVVWtHjVq1IbAo4a0EkxKyTTp+kQG0KRb2JAty8ruv//+c6p79K5WVGeEEMG5b6jAY7GY1VxSUlIwr/Xp02fByJEjDxfQDUKIEEIYpmlmJE+z/QfvO33HezBNM3vIIYescKiVDILAIEpCg/QVAsRNPdWzZ892A0t2B0VFRXWjRo1a7QQirqjNGGN+IHxbSsmIyIodw3j79u379VFHHbXa8UVSEMaUUoxSInQqHY0Iv2XdoAj77bffF7FkySDBdCPwpUGkAabgEyJaVVQFgOLi4rpx48at9RzNFqAGY8yHLqEQMMPNOvF4fJdRl4ceeuhS1+FxDmIwxnxOhMEYE1k/V9ynT5/tY1XUxaHZekPlNVP6L0SeA8Cs99/Tbrr/0b8++vhzlzbUhbWactksDD30JyLvlxo3btzSa6/6xWkjR+6/y/c2YsSIt+MVPUeHWpqEBuFL32W2QVMDBgxoIxCPGjXKocyWeR8j0wj1hQgMm6hm27bbmCYty8oMHz58rUeMhEu0uGUmsp7n2UEQWBbxsolEomF3n//yS376p5N+fPbDd97/4HMff/zp8WtXrg6rHXMflIUs8WAM0vfQpawMg/br13j1z3828YTDh74X5HIGADTkwHYWKVlSUrJt7Nixq1MeKlyKOKVUMOoLEyprCy+z4/3uv//+K7pmrB6EEBhexk3a8brAJzqVilmW/N7IXzsC2ROT0suvvnX6j05pG0L7feH9Tz47sra2vvcXX3xx2ldffXX8hRdeeEV1ddWKoUOHfty9svxfLiD0v4k33p92YiaTKXvooYf/Zpqme/75519dVla2ZfyRh+xRQMaeYsXazRXLli07qKa2pv8jjzzywOhDD3njyCOPfMYwdGfCEeN2rdV0ohPfE779ZkG/tTWbBn3yyScTv/nyw9MvvuDnv+netfe3hxx1/L91DfxvQDXVGoQxgaLWpZrrt65Ozp07d8KyLZl+z0+acsMBg4d8+IOjjn68W9fEuoMOHv29EXl+b8g2hlJHfNdujN3FHh06nehEJzrxfUAEdUz6AdPj3f5/LUx2iHQD2/HA2RNsc2EzBr9c/1/OBes8dDrRiU78v4B6cENKiS7U+K85dLbmONON0ONQpn0/m32DA1bWotQ83EbGfZ9pyaqdP3fT4gGQkqFs8PdKe9Me6n2wcuM/d7h9/0H6nehEJzqxC0R5Tf9NqIppos6HUWHgezsIy2yI+hxYeeSTUQqavvMgoaWzvxyydcF7F7ium9j79F//sm9l2S5D4r8rGgKExRP/g9QO/90VuDrRiU78V0Gm678Xnrauuu1XEH3nm3tk2vk3QGVrDZnZ1iZ4aFcHjnTC55eZ2t0OPCpvGQRglwnYOzG7NW2oEKunTezdNPvyvqk557778osXAQBPb/u3jEWZDlFhfr+MFLtC56HTiU50og22NLRmQg4aar636M7dgco0sO/Tj7AjSLyL/11ylKhdLrzGzUZH+WO7g5zTtqZWAaaZLSkp2bpixQosWbIEhx566FQA0IoqhczW/T9Ba97p0+lEJzrx70OqkQkhwEorhGyqZ7SkvP2DpHlLmEBLtQBFXQppA/UB2L/Dmb7Vhw0AVQY6TFHINm8y4nFbQCkGvW307OYst7uRZl9KCZbo0sFz1RsgRCAZajfbJGylgCrWcb8A8MXsLw8oKSnZut/e+7Qp7QAAvGl9UrOsAFblv5Ri0QZunQHGBPRdHPiZegOJ7xZR/N9lVO1EJzrxX4OVS5dVccdJFiVjjYniRGNxRXWHG9GWDcsrpJSse++BrfjBampqqgzDcEoISXV44ADwXZfV1dU1CML27rlflxUAUOfCUATY6sCosrdv0o016+0634qnUqmK4YP3auVo37hpi9HUlK7Sdd2Px+ONPbpXttkY6zwYIABjOz/MHMeJb1i3psGyrH0Ns3lzde9+rXwrpqn5whHQiirbbSe9bZOhmporstlsabcDyhYBBXJ9ffWyTdWUStFnYM82fGqN9eviffv2XeD7vtWwabNR1r0t03YqlSrObN5ciqLM2l49++3U57Nt3eZ4KtXQxTCZX1RSVFda2aPDwyLb3Byvr6+vzuUSYuCI/QpjW5fZwlKpVEXWl7ZSCkNKy2tRv9lCefUe+5s6NZ1OdKIT25FeW4UN849reOuRPydNwnjgVCmlUN9j1HP23qNfLT/w1JdbfX/FR8evm/byZRWNC44wTTNopKUbugwa/QFKKjZ+++mnx/fnKw4OgiBeY3Zf1O2wM2/JDP7RW9U22Z6AWLu036YZr15Ml71zUZlBk0z6wnEc5u5/xl1djph4W0Ose6oQSZZe1ZMv/eyULXM/Pktl60Z/8803GP7XdbHqIs3Bui/GNM97b6K99uOfCSFsRSgEzLpMj4Pf6Dbmhw+j+4jWSaOZTaVi08LR2U+evtn3fXtB1VHPHHnGpXcBQKphk9H07r1PJzfPmVBCmpMgBDVm76XNyb3m73PKpb9GUd92tY9W2PDJcWvff/HKqub1x1FK1653BBsw7qiXYZnut7Nm/W5/fwuCbBabzIq1lSNPvj829sL7oktffX7yOROaJj8dBAHeso68/ccXXbO9XHzThopZUx+97cCmj38WBIEhrHhqm2T+XmfeeAbi+85E6XYtERtmjln+yqO3VXobBpboTgXnHBuNig2lgyY8XHzUDuzPtTPHbJn2z0v5uoVjTNPs+djiks+vv/POY+Hkkp7jMPn2r2e4rtsnCASSRWXYlgrQa//xt+D4S2/c5VjsgE6fTic60YkC1q5ePWDmRx89rZSqTqVSVel0Gr7vY+vWrRPnzp173MrVX/dr+f1n/v73m5uamo7Xdd3OZDLJTCYzaOPSpb9cPXfuXzjnR0op4wBgGMagGTNmvBgEAba4iAOAU78u/vTTT9+wdu3aa3RdT3qeB9d1ma7r2Lx58zVvTJ3aEAQw6vywdEP9unW9Z8yY8YDjOKMjnsLqIs3ZlArsFUuXDlm9evVFjuPYruuiubkZQRBUNDU1nfvBm2+eu+Nzrl+9esCnn376ViaTGcE5H+T7fkj9A2DKlCnXpdPpszjnycBxIFwX2Wx2oOu6Z7384ou/3J1xfPm5567J5XLHeZ6HbDbbR9f1nmu+/faXy+bN+x3nHG4qFfGf9Zk3b94Ptm7YUODzMwzDcRwHmUwGnPNWPD0vvfTS5ZTSC3K5nKHrOpRSSUJIxTuTJn0ExvzarCr43t57552JAMYopSqam5vDWl1AzyVLlhzyxfsfH9my3U/efvucmpqaswD0zHPljQHnOREENZMnT96Uy+X6RNx1EW/m0sWLD3jnnXeO253xaIlO81onOtGJArb8/dLPqqursY2WYOqsbat/dN+HQyZPnnzxT7Y8/osDumy84N075xy/1+1PDIYWT30+ffqJZ5UvHSGEwHIyCCzGUBbUgjWuQpwAJUphvdkfVKMozq7F3rlVCDYv6Np74IhVAPD5Fx+cd6KYdQ6RBNIyUQMdyuoGXdcxtPZNDKUUcxYeNHDEyEPmA8CC+V8fM8pdACEENsUHYKO9F9C8XjUtXIiKT/+MLqaJf9aNxKAjjkV5nz64//HH8btgJkoc59J5y35834H7DCoUI1sx5f4nDyjNwHA3I5FMQhP+zeBNTy16+o4/j/E2DOzib4EkFEtiIwEAPfkmlDYshKVWnhnM7rZWP+icDkk4l85695jjsXIEyRIsjfUCpRQldRtRDh9c1EEphQVlh0AphcHN36BUNRy3ePX0M6sqDn8DkgpdNVYV5TKwOUfa6Loxaveruc+fM2bjIzdYloWV9hEwdAOV3nzEAZSzbVj5+XO/2+v4K/4EAI3PXvFK33RtD0dxTF66BSUHnIWSkhIcUfNPlAXzT5w5feVw7G+dgdjes5ubm+PFXz9/QZ++fdEgNTTRHkhTBckS2PbRdTjCakA2CEuIKKMcvu+jm1iFCmw5cd0HC47E3omT0P+wndNo5fIcfrEKv1PT6UQnOgEAWDZj5oiysjI/Ho+jtrYWNzz66PmD9qrI3vqHy+82TdORUqJr167Va+fNawAhPJvNvgKELMfffvutv+/o0VetXr26wF49c+ZM7DduHJYtW4aops3WrVt7AECQ3aRv27btgShXZ+nSpQv33mefOznnz6xbt+5daBpkEGDBggVHAkC2dl28qampijGGIAgwZ84c6LpeB10vfuedd1BeXo54PI4hQ4bgoLFj0a9fP5x//vkIggDFxcV48skn746ek2/bxjZu3Dgwqlu1cf16NDc3A5yvb2pqmkgIGUEpxTfffIMhBx54vxBi9urVqyM29p5r1qwZtLNxdF03HgRBUgiBRYsWYf/998eqVauQTqcBAHPmzMOwYcMwZ86cAtP+3LlznwQhtQAaKKUPkDxLfEtN58033/yFbdswTRMNDQ0YcsghqKmpAQAUFRXh66+/Pib67nvvvXcKIWSE67q4+OKLMWbMGBx/wgmwq6pAKUXXrl2rpzz77GewLG/btm0NVVVVyOVrDc2bNw9VVVWQUuKzzz4rsFfPmzcPruti6dKliNjs+/fvH//y88+P35N51qnpdKITnQAAvPfFa7+4POEZIrcB6yqPABLJps+n3HuVpeleZc/hX9RnMvvSLqVoEg3wBEc68EFgghKF+sFHPohRl96XfvWfl643KwdYsSTWx2qB/X6AbQPXIum/g3Q2jZgqaQAAPeXEqutWIUZycFwHC/e7/J4xp1791CAAU39zzfUHYMZxLMaQWzf/aDhrn4vHvHhq6ZcXeX1iSHkuup/z4LHjjjnuA69maXWFsxIeYshkM0gNHoo1dR7SXz2PeGo1chX9kQPQl2/qwbcu7anFi5slcka1t5YxeiBmk5FI7dMXY07/FeoYQ/nGz9ClshIfbbFw6BWTfpIZ9IMXDxiny6kXjErD65KwSuJY/vXc4/Y+o+NxDES6gqIJOjOwXFWADD0Ch0/08e3X86ARCdrbAh38E9RVroGO98GoRNOaFQAIIAgkV4AhwL0AsTgt0Gb7GxqrigcA8H2Y+x0I7HsAnGQ/ZKw4rICjv6zrBwArv13YZ1ipjyp3HRZbI+BZeyFY8zUWz3kDMddAFl3AY1Vwm7NQbgYNjbVIKg2EEGzyi3DW1b+B0W84PnnnTYysiMFKb8WiXAxjLrwTFUf8Dynbsjm2/r6TstVl1UhQB07t/GM6GosCYhWF4IVOTacTnegEgHz11nx1Utu2n4dSSxlj+tq1a//a3Nx8PiHkac75neXl5fuZpmkwxs6K6ihFTNq6rjuGYSCXy8G27deVEGZxcfHZUcCSECKU3C0rl06n34lqLFVWVhaiuGKxWE6IKIFfHQcpa5DLrcr/DACoqqpaCwBmPO5TStdyzguVcPvu059s3bp1ihDiA9/3N0gpV/fu3XuRZpoCALZs2VLbo0cP+L6PxsZGHH744XvHYtpg3/dHWpYVjQUqKyu3JYp0CQA/PvPMx6KaQO3Vp2mJqFZNyxpdNB4vVM3lnE/XDMMkhNwaVX+1LKtQuZMQAuT9J0EQFHw0uq4H0HUoIWDb9q8BdOWcr438W1GdJ865HlU5jaoXl5eX39/Q0IBcLgfLsuZkMpm3+/fvfwvRNJNzflpUVyyqDo28Fhi1QwhBxeDBCJwc69KtOieEQBAESKfTSCaTbUp37Aydmk4nOvF/HHUejAoTft/BB3y4ZvorE0tKStDdX3MoSvZzDzyh+6KDmAkhFAzCrtzXMAohsmVuPdVME5IQuJmwTLSjmBCEwrAJJM0kSFFPvymVizHpwdYUPJUvUFfaI1BcD1jgokjXUNS4bKBc8cl6uWrWoWeYs0cUUQ2OkwWJVwJaMUB8MCMON2iELwDu5stSF/Wsm897LT1ZLOxjWRaKG6YD6WHGMVff3UoX6Zv/N/Ptm8c3fvoi9ulaDM4DOJqGeFWXzdCRpWKzsQwURDdxYB8dm6Y/+evulf2/lVKCWnazEzShWBPoYjtx8DoDWkW7occpVbExw6rgER3EKJkn/dho6apfZbh+GzXKUWtmamEz34cDQ+QLHBIAikMaFrilAZKASII4D8JTMFMT9xTzAylBTBObHcNBUe+tphbYBiUIfKAkXrEBAOwuPTd/1USh96tGN38bRGM9SgaPuX/MmHN+2QgMEwqL+5PtzAuBHUuZQiBoboaVqIKiBJJRDB11MGY8X4sRI3qjwsti7et/R7dTftM1cCnihgWDMBgG4DWuG6QyDYwkdo/gtFPT6UQn/o+D0jAk+eCDD35lw4YN0HUdjDF31tS7f79u3TosXLgwjHxqceCE19GvfN9HvoJrWLiPEOF5XlQpdA4AGIYxLap6qut6aC6q28R0XXcZYxBC4MADD7x77ty5365du/YRwzDO8jwPnHOMHj16QpDLJaDrvXK5HGKxGPJVVAsb3KhRo15taGiIouzwzezZR25etKbn/Nlft/K91G6sNZ5//vmbpZSFysSmaX4MQnIAEO/S1zcMwxdCQNM0ZDKZ41577bWt06ZN20oIuTmqVJvNZg3h+x2W2FRK0chXI4QwaNVAXzPNdOSPipgQKKUShIDmK/cirxkFQQCVr3aq67rLG7ca0PVA1/WBnHMQQhCLxVL5vgoVR7PZbDEA9O5Rni0qKkJzczMi31TdqlVHbVq+eNi6DZkBbj56MILrunEASCaTSKVSsG0bVNNgWRZKS0vh+z5KS0uRyWTw9ttvb/zqq682VlSERX/zVXaN3T1wgM5DpxOd+D8Nldpml/GwBlzXin4p7Sd/P+89pxcGeWv32X/NK3/q+vov3+zx8S3gn/21zbVZZgQ64tBUDL4mGQB09ep79jMlEpkMEl6iEQA0mqMuAK5pELlcWJqyKFOZIhtPTwsFblgob56HHo1zUN38NeLuRiy39sWLmaEzhx8+4W29tGcWIlVRzurhOE5Y5FFmCiauM84459FXvQNnrmI9cLzzKYbOueadLm+etr7q/Ws+qt24oA8A1OQQz8WL9WEb/zliP38FlGlgedrakOp6xMtI9i0kK5b/8KGh0zYkYTdtQ9fsegyonYkB22aDSgLDqoKTBeJ2RSOLVXdY7Kx7bvPelvJhCBcVTDBsnNsNwi3SmYeYlkMZUlo4LsEynyYgtCTSVhdAN0CIA5M3wAVBwDR4Oa5rpVU+HM+C50LYpcjAgpc3xW0weix17TIwokGjBGjaWIr0ptLRv3u27zS1L7rKBuyTmoXiGX9+PPnP8+Ybr180pYcze0DL+41J3zaZj8BpQDHJQTpZ1JNSNBlVJp346MgvnN7vWn4dqr312H/TyzhEn4uyIhNUOEgFFI0VB3wAZ/d58joPnU504v8wSLLSgRCFDeOQww9/NZPJrK2trUWksQRBgA8++ACZRdPGtLqWkCOBAmO0n/+/0djYCNM04fv+aACQUo4WQiAfLRZqOr4PSikMw0AQBICUiMVi4JzD8zysX78+delvf3teobP8PdK8z4mQ1iSVl1xyyWULFy5EOpUCOI/u237ooYceA4CuMWSB7ZpBTU0NVqxY0fOn501sFfrcrWfPdT/60Y/O27BhAzjnvmVZyGQyQL6SanjrvrWzMZVSskibyWQyxbCsYgBlec0HnPMf5Ns5WwgBz/Og6zo8101Qxrqapnk9IQR5jSssjR1qkquDIEBeOyxoWpHWFgSBjvx7SJaVNQ8ePPiKhQsXgnMuPM9DEATYtm3b1hlvvPHzlveraZrfgiSgDsCphEAjBGLE6DFzYrFYdvny5ZBShszgjY3wPA+EEOi6Dtd1E6qF72lX6PTpdKIT/8fRYFSIsuiHZI/Gc+58s++6hfMG3HzHXc9z4Y9QSuG2e/6KRFmXxS2vq1NFH10xx5ofj5c3DhvbdzUANB1zy2l/nTTpZgmMufiqv/4GADx7v7m/m7noQ0KIOGdCvv41La2DKIHhr4VJCC6cvHiFGxgOl/3w84uuvOzUcWM+b3WTXUbMWdT1xAffWrj84Fhs7+aHRo6d3fLP1r6HzJ/49Dfk9dfeOeXFF1+8zpZ1FaNHj3715iuvuyr6jk5c9/Y1+6Da64KzfvoznH70sWabwSiudIrHTnxqxNiJT/3tb3/93eeff3r6KSefdpfqftDMv637+sW4u6X0xz++5LadjWdj9fDP/vrep7Oz2Wzp0OFjpqBi0NL5RQ0vPbl85tFMCDZo0LGfA8DZZ5579a/+cnelQmAfN2HYIAOWhF65tdnov+BXS3rOF0IYPxicd9IXVWVRtN+c336zbSshBMecSiQANHc/9OV7Pv3USChg+PDj3h2e6JoFwgP2mB9f8CB+fMGDv7nsonfq6mv6E0Lw6xv+cNK++w5vRR0U73Xg/Ksn7z0HAKRR1vjY/hNeLWvx9/G/vfe0zMYLq6+++upZKc90/3DEhSet9ecf8/brrzwAlcNJJw35mCR3nwOukwanE534P4xaBwalEOVmOzxkzfUGiGRQKoeYBejJPaJl9hzXMm3Lbe9vQcOqorcfvil1sjYP3PPw6oBf/ea0n4Q0NN8LcttsJQQlRd1am8GyNXEoxSAkg2FlYe8ZaSVPbbY1TQNiO99ks+ktLF7UrX0/R7axNYN2c50BExCCMxbv6oT9bDUYYyDx9oMV9hhOA1NSsu/cnrPNhlIUsapwPN16AzLQQQBIyRDffQ62Tk2nE534P4wudhjFtDUQBucc3W1z+6ZUXO7X8pCCxvB5rLgd1zn3laEZpN2NrKMDBwB0rgUs679TW1Q03oiXQ2ih/0flwno1JNYxOWh7ENmwNg6L5wk+Y5VOuydkvGuHvpjdgZasLhw2KrXNbk/CF6k6Fk92cOAAQLxU1OVgVMTyEWTF4UHQ0imyy8qiXp0h+PZDapewywTBnrN11wSIUwpZae/wnFa5D4T33+CCtdSMdhXJ1nnodKITncjnlbA2G4VSYJU6CDqo8tnRgbNLVPZ2CSHCsixwzgu5L4TSQr7KniDKmv+PIVtvkLz/5LvcS+HA+Y4IfJ/9JyqvUgopBCg6eKQGF6zM2n6YiVQd29Xzd5rXOtGJTuw2MlIYUkoktbDqZ53vJwGgIh9OnVOcxYgmAED4W09kju6BxNYhaS3bsa1rTzpuZildO6q+vh5nTV7av2vX8q1dNfxLmsgew21kge9DM3QQq0zU+GE4cVej/ftoUGBSglWw76+k9X8CEWmqFAqVNvFFro6xWMV/tGJohP8Pb1DNNzsUXU4AAAAASUVORK5CYII=";
          
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
                  text: 'FORMATO REGISTRO DE COMPONENTES',
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
              120, // Equipo
              80, // Estado
              60, // Anterior
              60, // Actual
              60, // Próximo
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
                const estado = row[3].text.toString().toLowerCase(); // Columna 'estado' (índice 3 para componentes)
                
                // Determinar color según estado (usando colores pastel)
                let colorFondo = colores.azulPastel;
                let colorTexto = colores.azulOscuro;
                
                if (estado.includes("activo")) {
                  colorFondo = colores.verdePastel;
                  colorTexto = colores.verdeOscuro;
                } else if (estado.includes("mantenimiento")) {
                  colorFondo = colores.naranjaPastel;
                  colorTexto = colores.naranjaOscuro;
                } else if (estado.includes("averiado")) {
                  colorFondo = colores.rojoPastel;
                  colorTexto = colores.rojoOscuro;
                } else if (estado.includes("descanso")) {
                  colorFondo = colores.celestePastel;
                  colorTexto = colores.celesteOscuro;
                } else if (estado.includes("vendido")) {
                  colorFondo = colores.grisPastel;
                  colorTexto = colores.grisOscuro;
                }
                
                // Aplicar estilos a cada celda
                row.forEach((cell, j) => {
                  cell.fontSize = 8;
                  cell.margin = [2, 2, 2, 2];
                  
                  // Alineación según tipo de dato
                  if (j === 1) { // Nombre
                    cell.alignment = "left";
                  } else if (j === 2) { // Equipo
                    cell.alignment = "left";
                  } else if (j === 3) { // Estado
                    cell.fillColor = colorFondo;
                    cell.color = colorTexto;
                    cell.alignment = "center";
                    cell.bold = true;
                  } else if (j === 5) { // Orómetro Actual
                    cell.bold = true; // Ponemos en negrita el orómetro actual
                    cell.alignment = "center";
                  } else if (j >= 4) { // Datos numéricos
                    cell.alignment = "center";
                  } else {
                    cell.alignment = "center";
                  }
                });
                
                // Añadir líneas zebra para mejor legibilidad
                if (i % 2 === 0) {
                  row.forEach((cell, j) => {
                    if (j !== 3 && !cell.fillColor) { // No sobrescribir el color de estado
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
            title: "Reporte de Componentes",
            author: "VOL COMPANY SAC",
            subject: "Listado de Componentes",
          };
        },
        filename: 'Reporte_Componentes_' + new Date().toISOString().split('T')[0],
        orientation: 'landscape',
      },
      {
        extend: "print",
        text: '<i class="bi bi-printer"></i> Imprimir',
        className: "btn btn-sm",
        exportOptions: {
          columns: [1, 2, 3, 4, 5, 6, 7],
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
      $("#componentes-table").on("click", ".btn-ver-componente", function () {
        const id = $(this).data("id");
        verDetallesComponente(id);
      });

      $("#componentes-table").on(
        "click",
        ".btn-editar-componente",
        function () {
          const id = $(this).data("id");
          editarComponente(id);
        }
      );

      $("#componentes-table").on(
        "click",
        ".btn-eliminar-componente",
        function () {
          const id = $(this).data("id");
          confirmarEliminarComponente(id);
        }
      );

      // Evento para imágenes en la tabla
      $("#componentes-table").on(
        "click",
        ".componente-imagen-tabla",
        function () {
          // En lugar de llamar a verDetallesComponente, usar el visor de imágenes
          if (window.imageViewer) {
            const imgSrc = $(this).attr("src");
            const componenteNombre = $(this).attr("alt") || "Componente";
            window.imageViewer.show(imgSrc, componenteNombre);
            return false; // Detener la propagación del evento
          }
        }
      );

      // Evento para seleccionar fila
      $("#componentes-table tbody").on("click", "tr", function () {
        const data = componentesTable.row(this).data();
        if (data) {
          // Remover selección anterior
          $("#componentes-table tbody tr").removeClass("selected");
          // Agregar selección a la fila actual
          $(this).addClass("selected");

          // Añadir animación al panel de detalles
          $("#componente-detalle").removeClass("loaded").addClass("loading");

          // Cargar detalles en el panel lateral con un pequeño retraso para la animación
          setTimeout(() => {
            cargarDetallesComponente(data.id);
            // Quitar clase de carga y añadir clase de cargado para la animación
            $("#componente-detalle").removeClass("loading").addClass("loaded");
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
 * Inicializa la validación del formulario de componentes
 */
function inicializarValidacionFormulario() {
  $("#form-componente").validate({
    rules: {
      codigo: {
        required: true,
        minlength: 2,
        maxlength: 20,
      },
      nombre: {
        required: true,
        minlength: 3,
        maxlength: 100,
      },
      equipo_id: {
        required: true,
      },
      estado: {
        required: true,
      },
      tipo_orometro: {
        required: true,
      },
      orometro_actual: {
        required: true,
        number: true,
        min: 0,
      },
      mantenimiento: {
        number: true,
        min: 0,
      },
      notificacion: {
        number: true,
        min: 0,
      },
      limite: {
        number: true,
        min: 0,
      },
    },
    messages: {
      codigo: {
        required: "El código es obligatorio",
        minlength: "El código debe tener al menos 2 caracteres",
        maxlength: "El código no puede tener más de 20 caracteres",
      },
      nombre: {
        required: "El nombre es obligatorio",
        minlength: "El nombre debe tener al menos 3 caracteres",
        maxlength: "El nombre no puede tener más de 100 caracteres",
      },
      equipo_id: {
        required: "Debe seleccionar un equipo",
      },
      estado: {
        required: "Debe seleccionar un estado",
      },
      tipo_orometro: {
        required: "Debe seleccionar un tipo de orómetro",
      },
      orometro_actual: {
        required: "El orómetro actual es obligatorio",
        number: "Debe ingresar un número válido",
        min: "El valor debe ser mayor o igual a 0",
      },
      mantenimiento: {
        number: "Debe ingresar un número válido",
        min: "El valor debe ser mayor o igual a 0",
      },
      notificacion: {
        number: "Debe ingresar un número válido",
        min: "El valor debe ser mayor o igual a 0",
      },
      limite: {
        number: "Debe ingresar un número válido",
        min: "El valor debe ser mayor o igual a 0",
      },
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
 * Inicializa el componente de carga de imágenes
 */
function initImageUploader() {
  // Verificar si el contenedor existe
  if (document.getElementById("container-componente-imagen")) {
    // Inicializar el componente
    try {
      imageUploader = new ImageUpload("container-componente-imagen", {
        maxSize: 2 * 1024 * 1024, // 2MB
        acceptedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        inputName: "imagen",
        defaultImage: getUrl("assets/img/equipos/componentes/default.png"),
        existingImage: "",
        uploadPath: "assets/img/equipos/componentes/",
        position: "center", // Posicionar la cámara en el centro
      });
    } catch (e) {
      console.warn(
        "Error al inicializar el componente de carga de imágenes:",
        e
      );
    }
  }
}

/**
 * Muestra el modal para crear un nuevo componente
 */
function mostrarModalNuevoComponente() {
  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Preparando formulario para nuevo componente...");
  }

  // Limpiar formulario
  $("#form-componente")[0].reset();
  $("#componente-id").val("");

  // Inicializar componente de carga de imágenes con valores por defecto
  if (imageUploader) {
    try {
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
    } catch (e) {
      console.warn("Error al reiniciar el componente de carga de imágenes:", e);
    }
  } else {
    // Inicializar si no existe
    initImageUploader();
  }

  // Actualizar título del modal
  $("#modal-componente-titulo").text("Nuevo Componente");

  // Mostrar modal
  const modal = new bootstrap.Modal(
    document.getElementById("modal-componente")
  );
  modal.show();

  // Establecer valores por defecto
  $("#componente-estado").val("activo");
  $("#componente-tipo-orometro").val("horas").trigger("change");
  $("#componente-orometro").val("0");
  $("#componente-anterior-orometro").val("0");

  // Calcular próximo orómetro
  calcularProximoOrometro();
}

/**
 * Guarda un componente (nuevo o existente)
 */
function guardarComponente() {
  // Validar formulario
  if (!$("#form-componente").valid()) {
    mostrarToast(
      "warning",
      "Atención",
      "Por favor, complete todos los campos obligatorios"
    );
    return;
  }

  // Actualizar valor del próximo orómetro en el campo oculto
  $("#hidden-proximo-orometro").val($("#componente-proximo-orometro").val());

  // Preparar datos del formulario
  const formData = new FormData($("#form-componente")[0]);

  // Mostrar indicador de carga
  $("#btn-guardar-componente")
    .prop("disabled", true)
    .html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...'
    );

  // Enviar solicitud AJAX
  $.ajax({
    url: getUrl("api/equipos/componentes/guardar.php"),
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    dataType: "json",
    success: function (response) {
      if (response.success) {
        // Cerrar modal
        bootstrap.Modal.getInstance(
          document.getElementById("modal-componente")
        ).hide();

        // Actualizar tabla
        componentesTable.ajax.reload();

        // Mostrar mensaje de éxito
        mostrarToast("success", "Éxito", response.message);
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al guardar el componente"
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
      $("#btn-guardar-componente").prop("disabled", false).html("Guardar");
    },
  });
}

/**
 * Edita un componente existente
 * @param {number} id - ID del componente a editar
 */
function editarComponente(id) {
  // Verificar que el ID sea válido
  if (!id || isNaN(parseInt(id))) {
    mostrarToast("error", "Error", "ID de componente no válido");
    console.error("ID de componente inválido:", id);
    return;
  }

  // Mostrar indicador de carga
  mostrarToast(
    "info",
    "Cargando",
    "Obteniendo información del componente...",
    1000
  );

  // Obtener datos del componente
  $.ajax({
    url: getUrl("api/equipos/componentes/obtener.php"),
    type: "GET",
    data: { id: id },
    dataType: "json",
    beforeSend: function (xhr) {
      // Verificar los datos que se están enviando
      // console.log("Datos enviados:", { id: id });
    },
    success: function (response) {
      // console.log("Respuesta recibida:", response);

      if (response.success) {
        const componente = response.data;
        componenteActual = componente;

        // Limpiar formulario
        $("#form-componente")[0].reset();

        // Llenar formulario con datos del componente
        $("#componente-id").val(componente.id);
        $("#componente-codigo").val(componente.codigo);
        $("#componente-nombre").val(componente.nombre);
        $("#componente-equipo").val(componente.equipo_id);
        $("#componente-estado").val(componente.estado);
        $("#componente-marca").val(componente.marca);
        $("#componente-modelo").val(componente.modelo);
        $("#componente-serie").val(componente.numero_serie);
        $("#componente-tipo-orometro")
          .val(componente.tipo_orometro)
          .trigger("change");
        $("#componente-mantenimiento").val(componente.mantenimiento);
        $("#componente-notificacion").val(componente.notificacion);
        $("#componente-limite").val(componente.limite);
        $("#componente-anterior-orometro").val(componente.anterior_orometro);
        $("#componente-orometro").val(componente.orometro_actual);
        $("#componente-observaciones").val(componente.observaciones);

        // Inicializar componente de carga de imágenes con la imagen existente
        if (imageUploader) {
          try {
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
          } catch (e) {
            console.warn(
              "Error al reiniciar el componente de carga de imágenes:",
              e
            );
          }
        } else {
          // Inicializar si no existe
          initImageUploader();
        }

        // Calcular próximo orómetro
        calcularProximoOrometro();

        // Actualizar título del modal
        $("#modal-componente-titulo").text("Editar Componente");

        // Mostrar modal
        const modal = new bootstrap.Modal(
          document.getElementById("modal-componente")
        );
        modal.show();
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al obtener el componente"
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
 * Muestra el modal de confirmación para eliminar un componente
 * @param {number} id - ID del componente a eliminar
 */
function confirmarEliminarComponente(id) {
  componenteActual = { id: id };
  const modal = new bootstrap.Modal(
    document.getElementById("modal-confirmar-eliminar")
  );
  modal.show();
}

/**
 * Elimina un componente después de la confirmación
 */
function eliminarComponenteConfirmado() {
  if (!componenteActual || !componenteActual.id) {
    mostrarToast("error", "Error", "No se ha seleccionado ningún componente");
    return;
  }

  // Mostrar indicador de carga
  $("#btn-confirmar-eliminar")
    .prop("disabled", true)
    .html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Eliminando...'
    );

  // Enviar solicitud AJAX
  $.ajax({
    url: getUrl("api/equipos/componentes/eliminar.php"),
    type: "POST",
    data: { id: componenteActual.id },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        // Cerrar modal
        bootstrap.Modal.getInstance(
          document.getElementById("modal-confirmar-eliminar")
        ).hide();

        // Actualizar tabla
        componentesTable.ajax.reload();

        // Mostrar mensaje de éxito
        mostrarToast("success", "Éxito", response.message);

        // Si el componente eliminado es el seleccionado, ocultar detalles
        if (
          componenteSeleccionado &&
          componenteSeleccionado.id == componenteActual.id
        ) {
          componenteSeleccionado = null;
          ocultarDetalleComponente();
        }
      } else {
        mostrarToast(
          "error",
          "Error",
          response.message || "Error al eliminar el componente"
        );

        // Si hay mantenimientos asociados, mostrar mensaje específico
        if (response.mantenimientos) {
          mostrarToast(
            "warning",
            "Atención",
            `El componente tiene ${response.mantenimientos} mantenimientos asociados`
          );
        }
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
      $("#btn-confirmar-eliminar")
        .prop("disabled", false)
        .html('<i class="bi bi-trash me-2"></i>Eliminar Definitivamente');
    },
  });
}

/**
 * Carga los detalles de un componente en el panel lateral
 * @param {number} id - ID del componente
 */
function cargarDetallesComponente(id) {
  // Mostrar indicador de carga
  $("#componente-detalle .detail-content").html(
    '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando detalles...</p></div>'
  );
  $("#componente-detalle").addClass("active");

  // Obtener datos del componente
  $.ajax({
    url: getUrl("api/equipos/componentes/obtener.php"),
    type: "GET",
    data: { id: id },
    dataType: "json",
    success: (response) => {
      if (response.success && response.data) {
        const componente = response.data;
        componenteSeleccionado = componente;
        const unidad = getUnidadOrometro(componente.tipo_orometro);

        // Actualizar título del panel y añadir imagen en el encabezado
        const imagenUrl = componente.imagen
          ? componente.imagen
          : getUrl("assets/img/equipos/componentes/default.png");

        // Actualizar el encabezado con la imagen
        $("#componente-detalle .detail-header").html(`
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2 class="detail-title">${componente.nombre}</h2>
              <p class="detail-subtitle">Código: ${componente.codigo}</p>
            </div>
            <div class="detail-header-image">
              <img src="${imagenUrl}" alt="${componente.nombre}" class="detail-header-img" data-image-viewer="true">
            </div>
          </div>
        `);

        // Calcular tiempo restante para mantenimiento
        let tiempoRestante = "";
        let tiempoRestanteValor = 0;
        let porcentajeAvance = 0;
        let colorClase = "success";

        if (componente.proximo_orometro && componente.orometro_actual) {
          const restante =
            Number.parseFloat(componente.proximo_orometro) -
            Number.parseFloat(componente.orometro_actual);
          tiempoRestanteValor = restante;

          // Calcular porcentaje de avance
          const anterior = Number.parseFloat(componente.anterior_orometro || 0);
          const total =
            Number.parseFloat(componente.proximo_orometro) - anterior;
          const avance =
            Number.parseFloat(componente.orometro_actual) - anterior;
          porcentajeAvance = Math.min(Math.max((avance / total) * 100, 0), 100);

          // Determinar color según proximidad
          if (componente.notificacion) {
            const notificacion = Number.parseFloat(componente.notificacion);
            if (restante <= notificacion / 2) {
              colorClase = "danger";
            } else if (restante <= notificacion) {
              colorClase = "warning";
            }
          }

          if (restante > 0) {
            tiempoRestante = `
              <div class="tiempo-restante-container text-center mb-4">
                <h3 class="tiempo-restante-titulo">Tiempo para próximo mantenimiento</h3>
                <div class="tiempo-restante-valor text-${colorClase}">${formatearNumero(
              restante
            )} ${unidad}</div>
                <div class="progress mt-2" style="height: 8px;">
                  <div class="progress-bar bg-${colorClase}" role="progressbar" 
                    style="width: ${porcentajeAvance}%" 
                    aria-valuenow="${porcentajeAvance}" 
                    aria-valuemin="0" 
                    aria-valuemax="100"></div>
                </div>
                <div class="d-flex justify-content-between mt-1">
                  <small>${formatearNumero(
                    anterior
                  )} ${unidad} <br><span class="text-muted">(Lleva ${formatearNumero(
              Number.parseFloat(componente.orometro_actual) - anterior
            )} ${unidad})</span></small>
                  <small>${formatearNumero(
                    componente.proximo_orometro
                  )} ${unidad} <br><span class="text-muted">(Faltan ${formatearNumero(
              restante
            )} ${unidad})</span></small>
                </div>
              </div>
            `;
          } else {
            tiempoRestante = `
              <div class="tiempo-restante-container text-center mb-4">
                <h3 class="tiempo-restante-titulo">¡Mantenimiento requerido!</h3>
                <div class="tiempo-restante-valor text-danger">Excedido por ${formatearNumero(
                  Math.abs(restante)
                )} ${unidad}</div>
                <div class="progress mt-2" style="height: 8px;">
                  <div class="progress-bar bg-danger" role="progressbar" 
                    style="width: 100%" 
                    aria-valuenow="100" 
                    aria-valuemin="0" 
                    aria-valuemax="100"></div>
                </div>
                <div class="d-flex justify-content-between mt-1">
                  <small>${formatearNumero(
                    anterior
                  )} ${unidad} <br><span class="text-muted">(Inicio)</span></small>
                  <small>${formatearNumero(
                    Number.parseFloat(componente.orometro_actual)
                  )} ${unidad} <br><span class="text-muted">(Lleva ${formatearNumero(
              Number.parseFloat(componente.orometro_actual) - anterior
            )} ${unidad})</span></small>
                  <small>${formatearNumero(
                    componente.proximo_orometro
                  )} ${unidad} <br><span class="text-muted">(Excedido)</span></small>
                </div>
              </div>
            `;
          }
        }

        // Actualizar contenido del panel - SIMPLIFICADO
        $("#componente-detalle .detail-content").html(`
          ${tiempoRestante}
          
          <!-- Información del equipo al que pertenece - destacado -->
          <div class="equipo-pertenencia-container text-center mb-4">
            <h3 class="equipo-titulo">Pertenece al Equipo</h3>
            <div class="equipo-nombre bg-primary text-white p-3 rounded">
              <i class="bi bi-tools me-2"></i>${
                componente.equipo_nombre || "No asignado"
              }
            </div>
          </div>
          
          <!-- Observaciones -->
          <div class="detail-section">
            <div class="detail-section-title">
              <i class="bi bi-chat-left-text"></i> Observaciones
            </div>
            <p class="detail-value">${
              componente.observaciones || "Sin observaciones"
            }</p>
          </div>
          
          <div class="detail-actions">
            <button type="button" class="btn btn-sm btn-primary btn-ver-detalles" data-id="${
              componente.id
            }">
              <i class="bi bi-search"></i> Ver Detalles Completos
            </button>
            ${
              tienePermiso("componentes.editar")
                ? `
                <button type="button" class="btn btn-sm btn-secondary btn-editar" data-id="${componente.id}">
                  <i class="bi bi-pencil"></i> Editar
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
              "Imagen del componente"
            );
          }
        });

        // Eventos para botones en el panel
        $("#componente-detalle .btn-ver-detalles").on("click", function () {
          verDetallesComponente($(this).data("id"));
        });

        $("#componente-detalle .btn-editar").on("click", function () {
          editarComponente($(this).data("id"));
        });
      } else {
        // Mostrar mensaje de error
        $("#componente-detalle .detail-content").html(`
          <div class="detail-empty">
            <div class="detail-empty-icon">
              <i class="bi bi-exclamation-triangle"></i>
            </div>
            <div class="detail-empty-text">
              Error al cargar los detalles del componente
            </div>
          </div>
        `);
      }
    },
    error: (xhr, status, error) => {
      // Mostrar mensaje de error
      $("#componente-detalle .detail-content").html(`
        <div class="detail-empty">
          <div class="detail-empty-icon">
            <i class="bi bi-exclamation-triangle"></i>
          </div>
          <div class="detail-empty-text">
            Error de conexión al servidor
          </div>
        </div>
      `);
      console.error("Error al obtener detalles del componente:", error);
    },
  });
}

/**
 * Oculta el panel de detalles del componente
 */
function ocultarDetalleComponente() {
  // Restaurar contenido por defecto
  $("#componente-detalle").html(`
        <div class="detail-header">
            <h2 class="detail-title">Detalles del Componente</h2>
            <p class="detail-subtitle">Seleccione un componente para ver información</p>
        </div>
        <div class="detail-content">
            <div class="detail-empty">
                <div class="detail-empty-icon">
                    <i class="bi bi-info-circle"></i>
                </div>
                <div class="detail-empty-text">
                    Seleccione un componente para ver sus detalles
                </div>
            </div>
        </div>
    `);
}

/**
 * Muestra los detalles completos de un componente en un modal
 * @param {number} id - ID del componente
 */
function verDetallesComponente(id) {
  // Mostrar indicador de carga
  showLoadingOverlay();

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Cargando detalles del componente...");
  }

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
        const unidad = getUnidadOrometro(componente.tipo_orometro);

        // Actualizar datos en el modal
        $("#detalle-nombre").text(componente.nombre);
        $("#detalle-codigo").text(componente.codigo || "-");
        $("#detalle-equipo").text(componente.equipo_nombre || "-");
        $("#detalle-tipo-orometro").text(
          capitalizarPrimeraLetra(componente.tipo_orometro) || "-"
        );
        $("#detalle-marca").text(componente.marca || "-");
        $("#detalle-modelo").text(componente.modelo || "-");
        $("#detalle-serie").text(componente.numero_serie || "-");

        // Actualizar información de orómetros
        $("#detalle-orometro-anterior").text(
          formatearNumero(componente.anterior_orometro || 0) + " " + unidad
        );
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

        // Calcular y mostrar tiempo restante
        if (componente.proximo_orometro && componente.orometro_actual) {
          const restante =
            Number.parseFloat(componente.proximo_orometro) -
            Number.parseFloat(componente.orometro_actual);

          // Determinar color según proximidad
          let colorClase = "success";
          if (componente.notificacion) {
            const notificacion = Number.parseFloat(componente.notificacion);
            if (restante <= notificacion / 2) {
              colorClase = "danger";
            } else if (restante <= notificacion) {
              colorClase = "warning";
            }
          }

          if (restante > 0) {
            $("#detalle-tiempo-restante").html(`
                            <div class="alert alert-${colorClase} mb-3">
                                <strong>Tiempo para mantenimiento:</strong> ${formatearNumero(
                                  restante
                                )} ${unidad}
                            </div>
                        `);
          } else {
            $("#detalle-tiempo-restante").html(`
                            <div class="alert alert-danger mb-3">
                                <strong>¡Mantenimiento requerido!</strong> Excedido por ${formatearNumero(
                                  Math.abs(restante)
                                )} ${unidad}
                            </div>
                        `);
          }
        } else {
          $("#detalle-tiempo-restante").html("");
        }

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
        if (window.showErrorToast) {
          window.showErrorToast(
            response.message || "Error al obtener los detalles del componente"
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
      console.error("Error al obtener detalles del componente:", error);
    },
  });
}

/**
 * Edita un componente desde el modal de detalles
 */
function editarDesdeDetalle() {
  // Cerrar modal de detalles
  const modalDetalle = bootstrap.Modal.getInstance(
    document.getElementById("modal-detalle-componente")
  );
  modalDetalle.hide();

  // Abrir modal de edición
  if (componenteActual && componenteActual.id) {
    setTimeout(() => {
      editarComponente(componenteActual.id);
    }, 500);
  }
}

/**
 * Amplía la imagen del componente en el modal de detalles
 */
function ampliarImagenDetalle() {
  const imagen = $("#detalle-imagen").attr("src");
  try {
    if (imagen && window.imageViewer) {
      window.imageViewer.show(imagen, "Imagen del componente");
    }
  } catch (e) {
    console.error("Error al mostrar la imagen:", e);
  }
}

/**
 * Actualiza las unidades de orómetro en el formulario
 */
function actualizarUnidadesOrometro() {
  const tipoOrometro = $("#componente-tipo-orometro").val();
  const unidad = getUnidadOrometro(tipoOrometro);

  // Actualizar todas las unidades en el formulario
  $(".unidad-orometro").text(unidad);
}

/**
 * Calcula el próximo orómetro basado en el actual y el mantenimiento
 */
function calcularProximoOrometro() {
  const anteriorOrometro =
    parseFloat($("#componente-anterior-orometro").val()) || 0;
  const mantenimiento = parseFloat($("#componente-mantenimiento").val()) || 0;
  const proximoOrometro = anteriorOrometro + mantenimiento;

  // Actualizar el campo visible de próximo orómetro
  $("#componente-proximo-orometro").val(proximoOrometro.toFixed(2));

  // Actualizar también el campo oculto
  $("#hidden-proximo-orometro").val(proximoOrometro.toFixed(2));
}

/**
 * Aplica los filtros seleccionados a la tabla
 */
function aplicarFiltros() {
  // Obtener valores de filtros
  const equipo = $("#filtro-equipo").val();
  const estado = $("#filtro-estado").val();
  const tipoOrometro = $("#filtro-tipo-orometro").val();

  // Actualizar filtros activos
  filtrosAplicados = {};
  if (equipo) filtrosAplicados.equipo_id = equipo;
  if (estado) filtrosAplicados.estado = estado;
  if (tipoOrometro) filtrosAplicados.tipo_orometro = tipoOrometro;

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Aplicando filtros...");
  }

  // Recargar tabla
  componentesTable.ajax.reload();

  // Limpiar panel de detalles
  ocultarDetalleComponente();
  componenteSeleccionado = null;
}

/**
 * Limpia los filtros aplicados
 */
function limpiarFiltros() {
  // Restablecer valores de filtros
  $("#filtro-equipo").val("");
  $("#filtro-estado").val("");
  $("#filtro-tipo-orometro").val("");

  // Limpiar filtros activos
  filtrosAplicados = {};

  // Mostrar toast de información
  if (window.showInfoToast) {
    window.showInfoToast("Limpiando filtros...");
  }

  // Recargar tabla
  componentesTable.ajax.reload();

  // Limpiar panel de detalles
  ocultarDetalleComponente();
  componenteSeleccionado = null;
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
 * Obtiene la clase del estado
 * @param {string} estado - Estado del componente
 * @returns {string} - Clase CSS
 */
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
  if (permiso === "componentes.crear") {
    return $("#btn-nuevo-componente").length > 0;
  } else if (permiso === "componentes.editar") {
    return $("#btn-editar-desde-detalle").length > 0;
  } else if (permiso === "componentes.eliminar") {
    return true; // Por defecto permitir eliminar
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
