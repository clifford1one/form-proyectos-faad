  var SPREADSHEET_ID = '1NKx4wxMdGutwTfw2Gn3sNTdj3iy4xQDri1gxx_pF1b0';
  var SHEET_NAME = 'VCM DISEÑO'; 
  var DRIVE_FOLDER_ID = '114KG_idXui1SK3amPksnTVK5ejd8mted'; // Carpeta raíz donde se crearán las subcarpetas

  function doGet() {
    return HtmlService
      .createHtmlOutputFromFile('index')
      .setTitle('Formulario de Actividades — FaAAD UDP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  function enviarProyecto(payload) {
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = ss.getSheetByName(SHEET_NAME);
      var now = new Date();
      var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      var datePrefix = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');

      // 1. Determinar el título para el nombre de la carpeta
      var titulo = payload.tituloExtension || payload.tituloExterna || payload.tituloInvestigacion || "Sin Titulo";
      var folderName = datePrefix + "-" + titulo;

      // 2. Crear la carpeta en Drive
      var parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var newFolder = parentFolder.createFolder(folderName);
      var folderUrl = newFolder.getUrl();

      // 3. Subir los archivos si existen
      if (payload.archivos && payload.archivos.length > 0) {
        payload.archivos.forEach(function(fileObj) {
          var data = Utilities.base64Decode(fileObj.base64);
          var blob = Utilities.newBlob(data, fileObj.type, fileObj.name);
          newFolder.createFile(blob);
        });
      }

      // 4. Mapear los datos al Excel (92 columnas)
      var row = new Array(92).fill("");
      row[0]  = "Pendiente"; 
      row[1]  = timestamp;   
      row[2]  = payload.emailResponsable; 
      row[4]  = payload.tipoSolicitud;    
      row[9]  = folderUrl; // Columna J: Documento e imágenes (Enlace a la carpeta)

      if (payload.tipoSolicitud === 'extension') {
        row[6]  = payload.tituloExtension;
        row[11] = payload.fechaHoraExtension;
        row[13] = payload.descripcionExtension;
        row[14] = payload.participantesExtension;
        row[33] = payload.preferenciaSalaExtension;
        row[35] = payload.solicitudesEspecialesExtension ? payload.solicitudesEspecialesExtension.join(", ") : "";
        row[28] = payload.apoyoGraficoExtension;
        row[73] = payload.convenioExtension;
        row[76] = payload.institucionConvenioExtension;
        row[53] = payload.biografiaExtension;
      } 
      else if (payload.tipoSolicitud === 'externa') {
        row[17] = payload.tituloExterna;
        row[12] = payload.institucionExterna;
        row[20] = payload.descripcionExterna;
        row[22] = payload.fechaHoraExterna;
        row[23] = payload.lugarExterna;
        row[27] = payload.asistentesExterna;
        row[7]  = payload.biografiaExterna;
      } 
      else if (payload.tipoSolicitud === 'investigacion') {
        row[37] = payload.tituloInvestigacion;
        row[38] = payload.descripcionInvestigacion;
        row[72] = payload.financiamientoUdpInvestigacion;
        row[55] = payload.financiamientoExternoInvestigacion;
        row[56] = payload.agenciaFinancieraInvestigacion;
        row[58] = payload.anioAdjudicacionInvestigacion;
        row[59] = payload.anioInicioInvestigacion;
        row[60] = payload.anioTerminoInvestigacion;
        row[39] = payload.montoAdjudicadoInvestigacion;
        row[64] = payload.rolUdpInvestigacion;
        row[61] = payload.investigadorResponsableInvestigacion;
      }

      row[90] = payload.nombreResponsable; 
      row[91] = payload.rrssExtension || "";

      sheet.appendRow(row);

      return { exito: true, mensaje: 'Solicitud y fotos guardadas correctamente.' };

    } catch (e) {
      return { exito: false, mensaje: 'Error: ' + e.toString() };
    }
  }