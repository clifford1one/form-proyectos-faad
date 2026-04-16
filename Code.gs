// ══════════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN — reemplaza este valor antes de desplegar
// ══════════════════════════════════════════════════════════════════════════════
//
//  SPREADSHEET_ID → abre tu Google Sheet y copia el ID de la URL:
//                   https://docs.google.com/spreadsheets/d/ [ESTE_TRAMO] /edit

var SPREADSHEET_ID = '1NKx4wxMdGutwTfw2Gn3sNTdj3iy4xQDri1gxx_pF1b0';
var SHEET_NAME     = 'Solicitudes';   // nombre de la pestaña en el Sheet

// ══════════════════════════════════════════════════════════════════════════════
//  SERVIR EL FORMULARIO HTML
//  Apps Script publica el archivo "formulario.html" como web app
// ══════════════════════════════════════════════════════════════════════════════

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Enviar solicitud — FaAAD UDP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ══════════════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL
//  Llamada desde el formulario con: google.script.run.enviarProyecto(payload)
//
//  payload = {
//    tipoSolicitud: 'extension' | 'externa' | 'investigacion',
//    nombreResponsable, emailResponsable,
//    // campos específicos según tipo
//  }
// ══════════════════════════════════════════════════════════════════════════════

function enviarProyecto(payload) {
  try {
    // Registrar fila en Google Sheets
    registrarEnSheet(payload);

    return {
      exito: true,
      mensaje: '¡Tu solicitud fue recibida! Pronto nos pondremos en contacto.'
    };

  } catch (e) {
    Logger.log('ERROR enviarProyecto: ' + e.message + '\n' + e.stack);
    return {
      exito: false,
      mensaje: 'Ocurrió un error al procesar tu envío. Por favor inténtalo de nuevo o contáctanos directamente.'
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  ESTRUCTURA DE CARPETAS EN DRIVE
//
//  Raíz/
//  └── [Tipo de solicitud]/          ← Extension, Externa, Investigacion
//      └── [Título solicitud] — [Fecha]/
//          ├── imagenes/
//          ├── graficas/
//          └── ...
// ══════════════════════════════════════════════════════════════════════════════

function crearCarpetaSolicitud(payload, solicitud, index) {
  var raiz = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  // Nivel 1: carpeta por tipo de solicitud
  var tipoNombre = '';
  if (solicitud.tipoSolicitud === 'extension') tipoNombre = 'Extension';
  else if (solicitud.tipoSolicitud === 'externa') tipoNombre = 'Externa';
  else if (solicitud.tipoSolicitud === 'investigacion') tipoNombre = 'Investigacion';
  else tipoNombre = 'Sin categoria';

  var carpetaTipo = obtenerOCrearSubcarpeta(raiz, tipoNombre);

  // Nivel 2: carpeta individual de la solicitud (título + fecha para evitar duplicados)
  var fecha         = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var titulo = solicitud.tituloExtension || solicitud.tituloExterna || solicitud.tituloInvestigacion || 'Solicitud ' + (index + 1);
  var nombreCarpeta = limpiarNombre(titulo) + ' — ' + fecha;
  var carpetaSolicitud = obtenerOCrearSubcarpeta(carpetaTipo, nombreCarpeta);

  return carpetaSolicitud;
}

// Si la subcarpeta ya existe la reutiliza; si no, la crea
function obtenerOCrearSubcarpeta(padre, nombre) {
  var iter = padre.getFoldersByName(nombre);
  return iter.hasNext() ? iter.next() : padre.createFolder(nombre);
}

// ══════════════════════════════════════════════════════════════════════════════
//  GUARDAR ARCHIVOS EN DRIVE
//  Cada archivo llega como: { data: "data:image/jpeg;base64,…", nombre, tipo }
// ══════════════════════════════════════════════════════════════════════════════

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
  var sheet = ss.getSheetByName('Proyectos');

  if (sheet.getLastRow() === 0) encabezadosHoja01(sheet);

  // Combinar redes en una sola celda legible
  var redes = [
    payload.sitioWeb  ? 'Web: '  + payload.sitioWeb  : '',
    payload.instagram ? 'IG: '   + payload.instagram  : '',
    payload.tiktok    ? 'TT: '   + payload.tiktok     : '',
    payload.youtube   ? 'YT: '   + payload.youtube    : '',
    payload.linkedin  ? 'LI: '   + payload.linkedin   : '',
    payload.facebook  ? 'FB: '   + payload.facebook   : ''
  ].filter(Boolean).join('\n');

  var etiquetas     = Array.isArray(payload.etiquetas) ? payload.etiquetas.join(', ') : '';
  var menciones     = Array.isArray(payload.menciones) ? payload.menciones.join(', ') : '';
  var fechaProyecto = payload.fechaProyecto
    ? payload.fechaProyecto.split('-').reverse().join('/')
    : '';

  sheet.appendRow([
    timestamp,                          // A
    payload.nombreProyecto    || '',    // B
    fechaProyecto,                      // C
    payload.nombreResponsable || '',    // D
    payload.emailResponsable  || '',    // E
    payload.tipoProyecto      || '',    // F
    payload.coleccion         || '',    // G
    payload.pais              || '',    // H
    payload.rolAutor          || '',    // I
    etiquetas,                          // J
    menciones,                          // K
    payload.descripcion       || '',    // L
    redes,                              // M
    payload.palabrasClave     || '',    // N
    payload.videoYoutube      || '',    // O
    urlCarpeta,                         // P
    nImagenes,                          // Q
    'Pendiente revisión'                // R
  ]);

  // Zebra: fila par en gris muy suave
  var fila = sheet.getLastRow();
  if (fila % 2 === 0) {
    sheet.getRange(fila, 1, 1, 18).setBackground('#f8f9fc');
  }
}

function encabezadosHoja01(sheet) {
  var headers = [
    'Fecha envío', 'Nombre del proyecto', 'Fecha proyecto', 'Autor', 'Email',
    'Tipo', 'Colección', 'País', 'Rol del autor', 'Etiquetas', 'Menciones', 'Descripción',
    'Redes y enlaces', 'Palabras clave', 'Video YouTube',
    'Carpeta Drive', 'N° imágenes', 'Estado'
  ];

  sheet.appendRow(headers);
  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 145);   // Fecha envío
  sheet.setColumnWidth(2, 220);   // Nombre proyecto
  sheet.setColumnWidth(3, 120);   // Fecha proyecto
  sheet.setColumnWidth(4, 160);   // Autor
  sheet.setColumnWidth(5, 195);   // Email
  sheet.setColumnWidth(6, 145);   // Tipo
  sheet.setColumnWidth(7, 185);   // Colección
  sheet.setColumnWidth(8, 130);   // País
  sheet.setColumnWidth(9, 145);   // Rol del autor
  sheet.setColumnWidth(10, 220);  // Etiquetas
  sheet.setColumnWidth(11, 200);  // Menciones
  sheet.setColumnWidth(12, 280);  // Descripción
  sheet.setColumnWidth(13, 200);  // Redes y enlaces
  sheet.setColumnWidth(14, 170);  // Palabras clave
  sheet.setColumnWidth(15, 200);  // Video YouTube
  sheet.setColumnWidth(16, 200);  // Carpeta Drive
  sheet.setColumnWidth(17, 90);   // N° imágenes
  sheet.setColumnWidth(18, 140);  // Estado
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

// Limpia caracteres no permitidos en nombres de carpetas de Drive
function limpiarNombre(str) {
  return (str || 'Sin nombre')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}
