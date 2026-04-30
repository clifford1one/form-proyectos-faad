// ══════════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN GLOBAL
// ══════════════════════════════════════════════════════════════════════════════

var SPREADSHEET_ID = '1NKx4wxMdGutwTfw2Gn3sNTdj3iy4xQDri1gxx_pF1b0'; 
var SHEET_NAME     = 'VCM DISEÑO'; 
var DRIVE_FOLDER_ID = '11GpUCOZnalib0SN0NDFKXq_Lv69XjWCm'; // <--- IMPORTANTE: Reemplazar

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Formulario de Actividades — FaAAD UDP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ══════════════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL (Recibe datos del formulario)
// ══════════════════════════════════════════════════════════════════════════════

function enviarProyecto(payload) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) throw new Error("No se encontró la pestaña 'VCM DISEÑO'");

    // 1. Manejo de Carpeta y Archivos en Drive
    var urlCarpeta = "";
    var linksArchivos = "";
    
    if (payload.archivos && payload.archivos.length > 0) {
      var carpeta = crearCarpetaSolicitud(payload);
      var urls = guardarArchivos(payload.archivos, carpeta);
      urlCarpeta = carpeta.getUrl();
      linksArchivos = urls.join('\n'); // Un enlace por línea
    }

    // 2. Preparar la fila según el orden exacto de columnas solicitado
    var timestamp = new Date();
    
    // Mapeo de columnas (A a la última)
    // Nota: El orden sigue exactamente la lista que me enviaste.
    var fila = [
      "Pendiente",           // A: ESTADO
      timestamp,             // B: Marca temporal
      payload.email || "",    // C: Dirección de correo electrónico
      payload.unidad || "",   // D: Unidad académica
      payload.tipoIniciativa || "", // E: ¿Qué tipo de iniciativa quieres registrar?
      payload.resumen || "",  // F: Resumen o reseña (abstract)
      payload.titulo || "",   // G: Título
      payload.biografia || "", // H: Biografía del autor
      payload.enlaces || "",   // I: Enlaces complementarios
      linksArchivos,         // J: Documento e imágenes (Links directos)
      payload.comentarios || "", // K: Comentarios adicionales
      payload.fechaHora1 || "", // L: Fecha y Hora (opcional)
      payload.organiza1 || "",  // M: Organiza(n)
      payload.descripcion1 || "", // N: Descripción del evento
      payload.resenaPart1 || "", // O: Reseña de los participantes
      payload.links1 || "",      // P: Enlaces
      payload.fechaHora2 || "",  // Q: Fecha y Hora (opcional)
      payload.tituloAct || "",   // R: Título de la actividad
      payload.nombreCiclo || "", // S: Nombre del ciclo o proyecto
      payload.resenaInst || "",  // T: Reseña de participantes e instituciones
      payload.descripcion2 || "", // U: Descripción del evento
      payload.formato1 || "",    // V: Formato
      payload.fechaHora3 || "",  // W: Fecha y Hora
      payload.lugar1 || "",      // X: Lugar
      payload.organiza2 || "",   // Y: Organiza(n)
      payload.colabora1 || "",   // Z: Participan o colaboran
      payload.publico1 || "",    // AA: Público objetivo
      payload.asistentes1 || "", // AB: Cantidad de asistentes
      payload.apoyoGrafico || "", // AC: Solicitud de apoyo gráfico
      urlCarpeta,            // AD: Imágenes (Link a la carpeta completa)
      payload.logosNoFaad || "", // AE: Adjuntar logos (no FAAD)
      payload.hipervinculos || "", // AF: Hipervínculos
      payload.equipoTecnico || "", // AG: Equipo técnico
      payload.disposicionSala || "", // AH: Disposición de sala
      payload.cobertura || "",   // AI: Cobertura fotográfica
      payload.especiales || "",  // AJ: Solicitudes especiales
      payload.formato2 || "",    // AK: Formato (online/híbrido)
      payload.tituloProy || "",  // AL: Título del proyecto
      payload.resena2 || "",     // AM: Reseña
      payload.monto1 || "",      // AN: Monto adjudicado
      payload.imgRepres || "",   // AO: Imagen representativa
      payload.anio1 || "",       // AP: Año
      payload.capituloLibro || "", // AQ: Título del libro
      payload.pais || "",        // AR: País
      payload.isbn || "",        // AS: ISBN / ISSN
      payload.editorial || "",   // AT: Editorial o revista
      payload.cita || "",        // AU: Cita completa
      payload.doi || "",         // AV: DOI o URL de referencia
      payload.indexacion || "",  // AW: Indexación
      payload.correoProf || "",  // AX: Correo profesor a cargo
      payload.ejeVcm1 || "",     // AY: Eje VCM UDP
      payload.titulo2 || "",     // AZ: Título
      payload.desc2 || "",       // BA: Descripción
      payload.bio2 || "",        // BB: Biografía
      payload.docsImgs2 || "",   // BC: Documentos e imágenes
      payload.financiamiento || "", // BD: Financiamiento
      payload.agencia || "",     // BE: Financiamiento - Agencia
      payload.lineaProg || "",   // BF: Financiamiento - Línea
      payload.anioAdj || "",     // BG: Año de adjudicación
      payload.anioInicio || "",  // BH: Año de inicio
      payload.anioTermino || "", // BI: Año de término
      payload.invResp || "",     // BJ: Investigador/a responsable
      payload.invColab || "",    // BK: Investigadores/as colaboradores
      payload.monto2 || "",      // BL: Monto adjudicado
      payload.rolUdp || "",      // BM: Rol UDP
      payload.logosGraficas || "", // BN: Logos para incluir
      payload.colabora2 || "",   // BO: Participan o colaboran
      payload.titulo3 || "",     // BP: Título
      payload.lugar2 || "",      // BQ: Lugar
      payload.publico2 || "",    // BR: Público objetivo
      payload.asistentes2 || "", // BS: Cantidad de asistentes
      payload.ejeVcm2 || "",     // BT: Eje VCM UDP
      payload.finaUdp || "",     // BU: ¿Contó con financiamiento UDP?
      payload.convenio || "",    // BV: ¿Está en convenio?
      payload.lugar3 || "",      // BW: Lugar
      payload.asistentes3 || "", // BX: Cantidad de asistentes
      payload.resenaInst2 || "", // BY: Reseña de Instituciones
      payload.ejeVcm3 || "",     // BZ: Eje VCM UDP
      payload.invResp2 || "",    // CA: Investigador/a responsable
      "",                        // CB: Columna 61 (Vacia o según necesidad)
      "",                        // CC: Columna 51
      payload.contacto || "",    // CD: Información de contacto
      payload.unidad2 || "",     // CE: Unidad académica
      payload.ejeVcm4 || "",     // CF: Eje VCM UDP
      payload.tipoIni2 || "",    // CG: ¿Qué tipo de iniciativa?
      payload.unidad3 || "",     // CH: Unidad académica
      payload.ejeVcm5 || "",     // CI: Eje VCM UDP
      payload.tipoIni3 || ""     // CJ: ¿Qué tipo de iniciativa?
    ];

    // 3. Insertar la fila
    sheet.appendRow(fila);
    
    // 4. Aplicar formato a la nueva fila (Opcional: Zebra y validación en columna A)
    var rowIdx = sheet.getLastRow();
    aplicarFormatoFila(sheet, rowIdx);

    return { exito: true, mensaje: 'Solicitud registrada correctamente en VCM DISEÑO.' };

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return { exito: false, mensaje: 'Error al guardar: ' + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  FUNCIONES DE APOYO (Drive y Formato)
// ══════════════════════════════════════════════════════════════════════════════

function crearCarpetaSolicitud(payload) {
  var carpetaRaiz = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var fecha = Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd");
  var nombreC = (payload.titulo || "Sin Título").substring(0,50) + " - " + fecha;
  return carpetaRaiz.createFolder(nombreC);
}

function guardarArchivos(archivos, carpeta) {
  var urls = [];
  archivos.forEach(function(obj) {
    var b64 = obj.data.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), obj.tipo, obj.nombre);
    var file = carpeta.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    urls.push(file.getUrl());
  });
  return urls;
}

function aplicarFormatoFila(sheet, row) {
  // Validación de datos para el Estado (Columna A)
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pendiente', 'En revisión', 'Aprobado', 'Rechazado'])
    .build();
  sheet.getRange(row, 1).setDataValidation(rule);
  
  // Color según estado (Pendiente por defecto)
  sheet.getRange(row, 1).setBackground("#f3f3f3"); 
}