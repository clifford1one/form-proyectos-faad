// ══════════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN — reemplaza estos dos valores antes de desplegar
// ══════════════════════════════════════════════════════════════════════════════
//
//  SPREADSHEET_ID → abre tu Google Sheet y copia el ID de la URL:
//                   https://docs.google.com/spreadsheets/d/ [ESTE_TRAMO] /edit
//
//  DRIVE_FOLDER_ID → abre tu carpeta raíz en Drive y copia el ID de la URL:
//                   https://drive.google.com/drive/folders/ [ESTE_TRAMO]

var SPREADSHEET_ID  = '1Y_pmmK7_d_mQAK3xOXO9k0ADidAzcqXbBcZnTqEmdks';
var DRIVE_FOLDER_ID = '1Xm-sqfF45yOXWVfkTmf7ZNES2SgODF10';
var SHEET_NAME      = 'Proyectos';   // nombre de la pestaña en el Sheet

// ══════════════════════════════════════════════════════════════════════════════
//  SERVIR EL FORMULARIO HTML
//  Apps Script publica el archivo "formulario.html" como web app
// ══════════════════════════════════════════════════════════════════════════════

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('formulario')
    .setTitle('Publicar proyecto — FaAAD UDP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ══════════════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL
//  Llamada desde el formulario con: google.script.run.enviarProyecto(payload)
//
//  payload = {
//    nombreProyecto, nombreResponsable, emailResponsable, fechaProyecto, descripcion,
//    tipoProyecto, coleccion,
//    etiquetas: [ ... ],          ← array de strings
//    menciones: [ ... ],          ← array de strings
//    sitioWeb, instagram, tiktok, youtube, linkedin, facebook,
//    palabrasClave, videoYoutube,
//    archivos: [ { data, nombre, tipo }, ... ]   ← base64
//  }
// ══════════════════════════════════════════════════════════════════════════════

function enviarProyecto(payload) {
  try {

    // 1. Crear carpeta del proyecto en Drive
    var carpetaProyecto = crearCarpetaProyecto(payload);

    // 2. Guardar imágenes/videos en Drive
    var urlsArchivos = guardarArchivos(payload.archivos, carpetaProyecto);

    // 3. Registrar fila en Google Sheets
    registrarEnSheet(payload, carpetaProyecto.getUrl(), urlsArchivos);

    return {
      exito: true,
      mensaje: '¡Tu proyecto "' + payload.nombreProyecto + '" fue recibido! Pronto nos pondremos en contacto.'
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
//  └── [Tipo de proyecto]/          ← Pregrado, Postgrado, Alumni, etc.
//      └── [Nombre proyecto] — [Fecha]/
//          ├── imagen1.jpg
//          ├── imagen2.jpg
//          └── ...
// ══════════════════════════════════════════════════════════════════════════════

function crearCarpetaProyecto(payload) {
  var raiz = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  // Nivel 1: carpeta por tipo de proyecto
  var carpetaTipo = obtenerOCrearSubcarpeta(raiz, limpiarNombre(payload.tipoProyecto || 'Sin categoría'));

  // Nivel 2: carpeta individual del proyecto (nombre + fecha para evitar duplicados)
  var fecha         = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var nombreCarpeta = limpiarNombre(payload.nombreProyecto) + ' — ' + fecha;
  var carpetaProyecto = obtenerOCrearSubcarpeta(carpetaTipo, nombreCarpeta);

  return carpetaProyecto;
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
//  REGISTRAR EN LAS 3 HOJAS
// ══════════════════════════════════════════════════════════════════════════════

function registrarEnSheet(payload, urlCarpeta, urlsArchivos) {
  var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');

  registrarHoja01(ss, payload, urlCarpeta, urlsArchivos.length, timestamp);
  registrarHoja03(ss, payload, urlsArchivos, timestamp);
  actualizarHoja04(ss);
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

// ── Hoja 04: contadores automáticos ──────────────────────────────────────────

function actualizarHoja04(ss) {
  var config = ss.getSheetByName('Configuración');
  if (!config) return;

  var hoja01 = ss.getSheetByName('Proyectos');
  var hoja03 = ss.getSheetByName('Registro Imágenes');

  var totalProyectos = hoja01 && hoja01.getLastRow() > 1 ? hoja01.getLastRow() - 1 : 0;
  var totalImagenes  = hoja03 && hoja03.getLastRow() > 1 ? hoja03.getLastRow() - 1 : 0;
  var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');

  // Buscar las filas de cada clave y actualizarlas
  var datos = config.getDataRange().getValues();
  datos.forEach(function (fila, i) {
    if (fila[0] === 'Última actualización') config.getRange(i + 1, 2).setValue(ahora);
    if (fila[0] === 'Total proyectos')      config.getRange(i + 1, 2).setValue(totalProyectos);
    if (fila[0] === 'Total imágenes')       config.getRange(i + 1, 2).setValue(totalImagenes);
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
