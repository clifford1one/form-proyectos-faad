# Formulario de Solicitudes — FaAAD UDP

Aplicación web construida con **Google Apps Script** para que estudiantes y alumni de la Facultad de Arquitectura, Diseño y Estudios Urbanos (FaAAD) de la Universidad Diego Portales (UDP) envíen solicitudes de proyectos de extensión, participación en instancias externas y proyectos de investigación, creación e innovación.

Los datos se almacenan automáticamente en Google Sheets.

- []()
- []()
- []()
- []()

## Tecnologías

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Google Apps Script (Google Sheets API, Google Drive API)
- **Despliegue**: Google Apps Script Web App

## Estructura del Proyecto

```
form-proyectos-faad/
├── Code.gs                 # Backend en Apps Script: maneja el envío y registro en Sheets
├── index.html              # Interfaz principal del formulario (HTML/CSS/JS)
├── formulario.html         # Archivo alternativo o de respaldo (no usado actualmente)
├── assets/                 # Recursos estáticos (fuentes, íconos)
│   ├── fonts/
│   └── icons/
├── formularioProyectos.code-workspace  # Configuración de VS Code
└── README.md              # Este archivo
```

## Funcionalidades

- **Formulario dinámico**: Permite agregar múltiples solicitudes en una sola sesión.
- **Tipos de solicitud**:
  - Iniciativas de extensión organizadas por UDP
  - Participación en instancias externas
  - Proyectos de Investigación, creación e innovación
- **Validación**: Validación del lado del cliente antes del envío.
- **Registro automático**: Los datos se guardan en una hoja de Google Sheets configurada.

## Configuración

Antes de desplegar, actualiza las constantes en `Code.gs`:

```javascript
var SPREADSHEET_ID = '<ID de tu Google Sheet>';
```

### Preparación del Google Sheet

1. Crea un nuevo Google Sheet.
2. Copia el ID de la URL (la parte entre `/d/` y `/edit`).
3. Actualiza `SPREADSHEET_ID` en `Code.gs` con ese ID.
4. El script creará automáticamente las hojas necesarias al recibir el primer envío.

## Despliegue

1. Abre [Google Apps Script](https://script.google.com).
2. Crea un nuevo proyecto y sube los archivos `Code.gs` e `index.html`.
3. En el editor, ve a **Implementar → Nueva implementación**.
4. Selecciona tipo **Aplicación web**.
5. Configura:
   - **Ejecutar como**: Tú mismo
   - **Acceso**: Cualquier usuario (o restringe según necesites)
6. Haz clic en **Implementar**.
7. Copia la URL generada y compártela con los usuarios.

## Uso

1. Abre la URL de la aplicación web.
2. Completa la información del autor.
3. Agrega una o más solicitudes seleccionando el tipo y llenando los campos requeridos.
4. Revisa y envía el formulario.
5. Los datos aparecerán en el Google Sheet configurado.

## Desarrollo Local

Para desarrollar localmente:

1. Abre `index.html` en un navegador.
2. Modifica el código JavaScript para simular el envío (hay un modo local en el código).
3. Para probar el backend, sube cambios a Apps Script.

## Contribución

Si deseas contribuir:

1. Haz un fork del repositorio.
2. Crea una rama para tus cambios.
3. Envía un pull request.

## Licencia

Este proyecto es propiedad de FaAAD UDP. Consulta con el equipo para uso o modificaciones.
