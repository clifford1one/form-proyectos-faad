# Formulario de Proyectos — FaAAD UDP

Web app construida con **Google Apps Script** para que estudiantes y alumni de la FaAAD UDP envíen sus proyectos. Los datos se almacenan automáticamente en Google Sheets y los archivos adjuntos en Google Drive.

## Arquitectura

| Archivo | Rol |
|---|---|
| `formulario.html` | Interfaz del formulario (HTML/CSS/JS) |
| `Code.gs` | Backend en Apps Script: recibe el payload, crea carpetas en Drive y registra la fila en Sheets |

### Flujo de datos

1. El usuario completa el formulario y adjunta imágenes/videos.
2. `enviarProyecto(payload)` crea una carpeta en Drive con la estructura `Tipo/Nombre — Fecha/`.
3. Los archivos (en base64) se suben a esa carpeta.
4. Se registra una fila en la hoja **Proyectos** del Google Sheet configurado.

## Configuración

En `Code.gs`, actualiza las dos constantes antes de desplegar:

```js
var SPREADSHEET_ID  = '<ID de tu Google Sheet>';
var DRIVE_FOLDER_ID = '<ID de tu carpeta raíz en Drive>';
```

## Despliegue

1. Abre el proyecto en [Google Apps Script](https://script.google.com).
2. **Implementar → Nueva implementación → Aplicación web**.
3. Ejecutar como: *Tú mismo*. Acceso: *Cualquier usuario*.
4. Copia la URL generada y compártela con los usuarios.
