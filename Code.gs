///////////////////////////////////////////////////////////////////////////////////////7///////////
/*SPREADSHEETS*/
// ID del spreadsheet de prueba
var SPREADSHEET_ID = '1NKx4wxMdGutwTfw2Gn3sNTdj3iy4xQDri1gxx_pF1b0';
// ID de la spreadsheet original de la FaAAD
// var SPREADSHEET_ID = '18EUt_wauhDenkEmjawYFDDZ7XYgLmSiIQmonL4LVRIA';

var SHEET_NAME = 'VCM DISEÑO';   // nombre de la pestaña en el Sheet

/*DRIVE FOLDER*/
// ID de la carpeta de drive de prueba
var DRIVE_FOLDER_ID = '114KG_idXui1SK3amPksnTVK5ejd8mted'
// ID de la carpeta de drive original

///////////////////////////////////////////////////////////////////////////////////////7///////////

// esta funcion se ejecuta cada vez que alguien entra al link
// cuando alguien entra al link, se ejecuta todo este codigo
function doGet() {
  return HtmlService
    // nombre del html
    .createHtmlOutputFromFile('index')
    // texto que se lee en la pestaña
    .setTitle('FOrmulario de Actividades — FaAAD UDP')
    // permite que el form esté embedido
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

///////////////////////////////////////////////////////////////////////////////////////7///////////

// esta la funcion para enviar la info del formulario
// payload es el objeto que contiene toda la info: texto, archivos, etc
function enviarProyecto(payload) {
  // registar la info dentro del spreadsheet
  try {
    registrarEnSheet(payload);

    return {
      exito: true,
      mensaje: '¡Tu solicitud fue recibida! Pronto nos pondremos en contacto.'
    };
    // mensaje de error en caso de que no llegue al spreadsheet
  } catch (e) {
    Logger.log('ERROR enviarProyecto: ' + e.message + '\n' + e.stack);
    return {
      exito: false,
      mensaje: 'Ocurrió un error al procesar tu envío. Por favor inténtalo de nuevo o contáctanos directamente.'
    };
  }
}

///////////////////////////////////////////////////////////////////////////////////////7///////////
/* IDENTIFICADOR, CREADOR, REVISOR DE CARPETAS*/
function crearCarpetaSolicitud(payload, solicitud, index) {
  //buscar la carpeta drive con esa ID
  var raiz = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  // Nivel 1: dependiendo del tipo de soliciutd, se ubica en una carpeta, si no existe tal carpeta, la crea
  var tipoNombre = '';
  if (solicitud.tipoSolicitud === 'extension') tipoNombre = 'EXTENSIÓN';
  else if (solicitud.tipoSolicitud === 'externa') tipoNombre = 'EXTERNA';
  else if (solicitud.tipoSolicitud === 'investigacion') tipoNombre = 'INVESTIGACIÓN';
  else tipoNombre = 'Sin categoria';

  var carpetaTipo = obtenerOCrearSubcarpeta(raiz, tipoNombre);

  // Nivel 2: cdentro de la carpeta, crea una nueva carpeta con el nombre y fecha del proyecto
  var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var titulo = solicitud.tituloExtension || solicitud.tituloExterna || solicitud.tituloInvestigacion || 'Solicitud ' + (index + 1);
  var nombreCarpeta = fecha + ' — ' + limpiarNombre(titulo);
  var carpetaSolicitud = obtenerOCrearSubcarpeta(carpetaTipo, nombreCarpeta);

  return carpetaSolicitud;
}

// Si la subcarpeta ya existe la reutiliza; si no, la crea
function obtenerOCrearSubcarpeta(padre, nombre) {
  var iter = padre.getFoldersByName(nombre);
  return iter.hasNext() ? iter.next() : padre.createFolder(nombre);
}

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // esta funcion guarda en el drive los arhivos
  // la subir una foto al form, se pasa a codigo.
  // esta funcion vuelve a pasar ese mismo codigo al formato original
  //
  // se ponen las imagenes en el drive, y paralelamente, 
  function guardarArchivos(archivos, carpeta) {
    var urls = [];
    if (!archivos || archivos.length === 0) return urls;

    archivos.forEach(function (archivo) {
      try {
        // Separar el prefijo "data:image/jpeg;base64," del contenido real
        var base64 = archivo.data.indexOf(',') !== -1
          ? archivo.data.split(',')[1]
          : archivo.data;

        var bytes = Utilities.base64Decode(base64);
        var blob  = Utilities.newBlob(bytes, archivo.tipo, archivo.nombre);
        var file  = carpeta.createFile(blob);

        // Guardar URL primero, antes de intentar cambiar permisos
        urls.push(file.getUrl());

        // Intentar hacer pública la URL (puede fallar en dominios Workspace con restricciones)
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (sharingErr) {
          Logger.log('setSharing no permitido para ' + archivo.nombre + ': ' + sharingErr.message);
        }

      } catch (fileErr) {
        Logger.log('Error subiendo ' + archivo.nombre + ': ' + fileErr.message);
        urls.push('ERROR — ' + archivo.nombre + ': ' + fileErr.message);
      }
    });

    return urls;
  }
///////////////////////////////////////////////////////////////////////////////////////////////////

// ══════════════════════════════════════════════════════════════════════════════
//  REGISTRAR EN LAS HOJAS
// ══════════════════════════════════════════════════════════════════════════════

function registrarEnSheet(payload) {
  var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');

  if (payload.tipoSolicitud === 'extension') {
    registrarExtension(ss, payload, timestamp);
  } else if (payload.tipoSolicitud === 'externa') {
    registrarExterna(ss, payload, timestamp);
  } else if (payload.tipoSolicitud === 'investigacion') {
    registrarInvestigacion(ss, payload, timestamp);
  }
}

// ── Hoja 01: resumen visual (una fila por proyecto, columnas clave) ───────────
//
//  A  Fecha envío
//  B  Nombre del proyecto
//  C  Fecha proyecto
//  D  Autor
//  E  Email
//  F  Tipo de proyecto
//  G  Colección / Muestra
//  H  País
//  I  Rol del autor
//  J  Etiquetas
//  K  Menciones
//  L  Descripción
//  M  Redes y enlaces
//  N  Palabras clave
//  O  Video YouTube
//  P  Carpeta Drive
//  Q  N° imágenes
//  R  Estado

function registrarHoja01(ss, payload, urlCarpeta, nImagenes, timestamp) {
  var sheet = ss.getSheetByName('Proyectos') || ss.insertSheet('Proyectos');

  if (sheet.getLastRow() === 0) {
    encabezadosHoja01(sheet);

    // Activar filtros
    sheet.getRange(1,1,1,18).createFilter();

    // Wrap texto
    sheet.getRange("A:R").setWrap(true);

    // Validación de estado (columna R)
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pendiente', 'En revisión', 'Aprobado', 'Rechazado'])
      .build();
    sheet.getRange("R2:R").setDataValidation(rule);
  }

  var filaData = [
    timestamp,
    payload.nombreProyecto || '',
    payload.fechaProyecto || '',
    payload.nombreResponsable || '',
    payload.emailResponsable || '',
    payload.tipoProyecto || '',
    payload.coleccion || '',
    payload.pais || '',
    payload.rolAutor || '',
    (payload.etiquetas || []).join(', '),
    (payload.menciones || []).join(', '),
    payload.descripcion || '',
    payload.sitioWeb || '',
    payload.palabrasClave || '',
    payload.videoYoutube || '',
    urlCarpeta ? '=HYPERLINK("' + urlCarpeta + '","Abrir carpeta")' : '',
    nImagenes,
    'Pendiente'
  ];

  sheet.appendRow(filaData);

  var fila = sheet.getLastRow();

  // Zebra suave
  if (fila % 2 === 0) {
    sheet.getRange(fila, 1, 1, 18).setBackground('#f7f7f7');
  }
}

function encabezadosHoja01(sheet) {
  var headers = [ 
    'Fecha', 'Proyecto', 'Fecha proyecto', 'Autor', 'Email',
    'Tipo', 'Colección', 'País', 'Rol', 'Etiquetas',
    'Menciones', 'Descripción', 'Web', 'Keywords',
    'YouTube', 'Drive', 'Imgs', 'Estado'
  ];

  sheet.appendRow(headers);

  var r = sheet.getRange(1, 1, 1, headers.length);

  r.setBackground('#111827')
   .setFontColor('#ffffff')
   .setFontWeight('bold')
   .setFontSize(11)
   .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  // Anchos optimizados (clave)
  var widths = [140, 240, 120, 160, 200, 140, 160, 120, 140, 220, 220, 300, 180, 160, 200, 180, 70, 140];

  widths.forEach((w, i) => sheet.setColumnWidth(i+1, w));

  //////////////////////////////////////////////////

  var rangoEstado = sheet.getRange("R2:R");

// Pendiente → gris
var rule1 = SpreadsheetApp.newConditionalFormatRule()
  .whenTextEqualTo("Pendiente")
  .setBackground("#e5e7eb")
  .setRanges([rangoEstado])
  .build();

// Aprobado → verde
var rule2 = SpreadsheetApp.newConditionalFormatRule()
  .whenTextEqualTo("Aprobado")
  .setBackground("#d1fae5")
  .setRanges([rangoEstado])
  .build();

// Rechazado → rojo
var rule3 = SpreadsheetApp.newConditionalFormatRule()
  .whenTextEqualTo("Rechazado")
  .setBackground("#fee2e2")
  .setRanges([rangoEstado])
  .build();

sheet.setConditionalFormatRules([rule1, rule2, rule3]);
}

// ── Hoja 03: una fila por imagen ─────────────────────────────────────────────
//
//  A  Fecha envío
//  B  Nombre del proyecto
//  C  Tipo de proyecto
//  D  N° imagen
//  E  URL Drive

function registrarHoja03(ss, payload, urlsArchivos, timestamp) {
  if (!urlsArchivos || urlsArchivos.length === 0) return;

  var sheet = ss.getSheetByName('Registro Imágenes');
  if (!sheet) return;

  if (sheet.getLastRow() === 0) encabezadosHoja03(sheet);

  urlsArchivos.forEach(function (url, i) {
    sheet.appendRow([
      timestamp,
      payload.nombreProyecto || '',
      payload.tipoProyecto   || '',
      i + 1,
      url
    ]);
  });
}

function encabezadosHoja03(sheet) {
  var headers = ['Fecha envío', 'Nombre del proyecto', 'Tipo de proyecto', 'N° imagen', 'URL Drive'];
  sheet.appendRow(headers);
  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 145);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 145);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 280);
}

// ── Registrar Extension ───────────────────────────────────────────────────

function registrarExtension(ss, payload, timestamp) {
  var sheet = ss.getSheetByName('Extension');
  if (!sheet) {
    sheet = ss.insertSheet('Extension');
    encabezadosExtension(sheet);
  }

  var fechaHora = payload.fechaHoraExtension ? Utilities.formatDate(new Date(payload.fechaHoraExtension), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '';

  sheet.appendRow([
    timestamp,
    payload.nombreResponsable,
    payload.emailResponsable,
    payload.tituloExtension,
    payload.descripcionExtension,
    payload.convenioExtension,
    payload.participantesExtension,
    payload.biografiaExtension,
    payload.rrssExtension,
    fechaHora,
    payload.necesitaSalaExtension,
    payload.preferenciaSalaExtension,
    payload.apoyoGraficoExtension,
    payload.solicitudesEspecialesExtension ? payload.solicitudesEspecialesExtension.join(', ') : ''
  ]);

  // Zebra
  var fila = sheet.getLastRow();
  if (fila % 2 === 0) {
    sheet.getRange(fila, 1, 1, 17).setBackground('#f8f9fc');
  }
}

function encabezadosExtension(sheet) {
  var headers = [
    'Fecha envío', 'Nombre autor', 'Email autor', 'Título', 'Descripción actividad', '¿En convenio?',
    'Participantes', 'Biografía', 'RRSS', 'Fecha y hora', '¿Necesita sala?', 'Preferencia sala',
    'Apoyo gráfico', 'Solicitudes especiales'
  ];
  sheet.appendRow(headers);
  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
  // Set column widths
  headers.forEach(function(h, i) {
    sheet.setColumnWidth(i+1, 150);
  });
}

// ── Registrar Externa ──────────────────────────────────────────────────────

function registrarExterna(ss, payload, timestamp) {
  var sheet = ss.getSheetByName('Externa');
  if (!sheet) {
    sheet = ss.insertSheet('Externa');
    encabezadosExterna(sheet);
  }

  var fechaHora = payload.fechaHoraExterna ? Utilities.formatDate(new Date(payload.fechaHoraExterna), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '';

  sheet.appendRow([
    timestamp,
    payload.nombreResponsable,
    payload.emailResponsable,
    payload.institucionExterna,
    payload.tituloExterna,
    payload.descripcionExterna,
    payload.participantesExterna,
    payload.biografiaExterna,
    payload.linksExterna,
    fechaHora,
    payload.lugarExterna,
    payload.asistentesExterna
  ]);

  // Zebra
  var fila = sheet.getLastRow();
  if (fila % 2 === 0) {
    sheet.getRange(fila, 1, 1, 14).setBackground('#f8f9fc');
  }
}

function encabezadosExterna(sheet) {
  var headers = [
    'Fecha envío', 'Nombre autor', 'Email autor', 'Institución organizadora', 'Título actividad',
    'Descripción evento', 'Participantes', 'Biografía', 'Links complementarios', 'Fecha y hora',
    'Lugar', 'Cantidad asistentes'
  ];
  sheet.appendRow(headers);
  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
  headers.forEach(function(h, i) {
    sheet.setColumnWidth(i+1, 150);
  });
}

// ── Registrar Investigacion ─────────────────────────────────────────────────

function registrarInvestigacion(ss, payload, timestamp) {
  var sheet = ss.getSheetByName('Investigacion');
  if (!sheet) {
    sheet = ss.insertSheet('Investigacion');
    encabezadosInvestigacion(sheet);
  }

  sheet.appendRow([
    timestamp,
    payload.nombreResponsable,
    payload.emailResponsable,
    payload.tituloInvestigacion,
    payload.descripcionInvestigacion,
    payload.financiamientoUdpInvestigacion,
    payload.financiamientoExternoInvestigacion,
    payload.agenciaFinancieraInvestigacion,
    payload.fondoInvestigacion,
    payload.anioAdjudicacionInvestigacion,
    payload.anioInicioInvestigacion,
    payload.anioTerminoInvestigacion,
    payload.montoAdjudicadoInvestigacion,
    payload.rolUdpInvestigacion,
    payload.investigadorResponsableInvestigacion,
    payload.investigadoresColaboradoresInvestigacion
  ]);

  // Zebra
  var fila = sheet.getLastRow();
  if (fila % 2 === 0) {
    sheet.getRange(fila, 1, 1, 16).setBackground('#f8f9fc');
  }
}

function encabezadosInvestigacion(sheet) {
  var headers = [
    'Fecha envío', 'Nombre autor', 'Email autor', 'Título proyecto', 'Descripción proyecto',
    '¿Financiamiento UDP?', '¿Financiamiento externo?', 'Agencia financiera', 'Fondo',
    'Año adjudicación', 'Año inicio', 'Año término', 'Monto adjudicado', 'Rol UDP',
    'Investigador responsable', 'Investigadores colaboradores'
  ];
  sheet.appendRow(headers);
  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
  headers.forEach(function(h, i) {
    sheet.setColumnWidth(i+1, 150);
  });
}

// ── Registrar Imágenes ─────────────────────────────────────────────────────

function registrarImagenes(ss, payload, urlsArchivos, urlsGraficas, timestamp) {
  var sheet = ss.getSheetByName('Registro Imágenes');
  if (!sheet) return;

  if (sheet.getLastRow() === 0) encabezadosHoja03(sheet);

  var titulo = payload.tituloExtension || payload.tituloExterna || payload.tituloInvestigacion || 'Sin título';

  urlsArchivos.forEach(function (url, i) {
    sheet.appendRow([
      timestamp,
      titulo,
      payload.tipoSolicitud,
      'Proyecto ' + (i + 1),
      url
    ]);
  });

  urlsGraficas.forEach(function (url, i) {
    sheet.appendRow([
      timestamp,
      titulo,
      payload.tipoSolicitud,
      'Gráfica ' + (i + 1),
      url
    ]);
  });
}

// ── Actualizar Configuración ────────────────────────────────────────────────

function actualizarHoja04(ss) {
  var config = ss.getSheetByName('Configuración');
  if (!config) return;

  var extension = ss.getSheetByName('Extension');
  var externa = ss.getSheetByName('Externa');
  var investigacion = ss.getSheetByName('Investigacion');
  var imagenes = ss.getSheetByName('Registro Imágenes');

  var totalSolicitudes = 0;
  if (extension && extension.getLastRow() > 1) totalSolicitudes += extension.getLastRow() - 1;
  if (externa && externa.getLastRow() > 1) totalSolicitudes += externa.getLastRow() - 1;
  if (investigacion && investigacion.getLastRow() > 1) totalSolicitudes += investigacion.getLastRow() - 1;

  var totalImagenes = imagenes && imagenes.getLastRow() > 1 ? imagenes.getLastRow() - 1 : 0;
  var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');

  // Buscar las filas de cada clave y actualizarlas
  var datos = config.getDataRange().getValues();
  datos.forEach(function (fila, i) {
    if (fila[0] === 'Última actualización') config.getRange(i + 1, 2).setValue(ahora);
    if (fila[0] === 'Total solicitudes') config.getRange(i + 1, 2).setValue(totalSolicitudes);
    if (fila[0] === 'Total imágenes') config.getRange(i + 1, 2).setValue(totalImagenes);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  UTILIDADES
// ══════════════════════════════════════════════════════════════════════════════

/*LIMPIA NOMBREEEEEES*/

// esta es una función que elimina los caracteres especiales en los nombres de archivos y carpetas
function limpiarNombre(str) {
  return (str || 'Sin nombre')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}
