# Módulos de JavaScript

Qué añade cada script opcional, cómo cargar solo el que necesitas y qué hace la página sin ellos.

Todas las páginas de LUZ funcionan sin JavaScript. Los scripts añaden comportamiento: copiar, resaltar, un botón que alterna el modo de color, seguimiento del desplazamiento, reproductores, pestañas, ordenación de tablas y una línea de tiempo.

### Cargarlo todo o un módulo

All modules markup
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"></script>
```

One module code
```js
import { initTabs } from "@luz-ds/core/tabs";
initTabs();
```

- `luz.js` inicia todos los módulos al cargar la página.
- Importar un solo módulo no hace nada hasta que llamas a su función `init`.
- `midi.js`, `table-sort.js` y `timeline.js` son fragmentos independientes: `luz.js` carga cada uno cuando hace falta y solo en las páginas que lo necesitan.
- La búsqueda del sitio está en `@luz-ds/site`: consulta [Búsqueda](https://nandovejer.github.io/luz/es/docs/site/search/). El aviso de cookies también está ahí, en un módulo propio que `site.js` no incluye: consulta [Consentimiento de cookies](https://nandovejer.github.io/luz/es/docs/site/consent/). El modo de color automático es un tercer módulo del mismo tipo, `mode.js`, que `site.js` carga solo en páginas con `<luz-mode>`: consulta [Modo de color automático](https://nandovejer.github.io/luz/es/docs/site/mode/).

### Los módulos

**Los 13 módulos de JavaScript**

#### Idiomas y textos que escriben los scripts

El inglés está en el punto de entrada. Cada uno de los demás idiomas que incluye LUZ es un archivo pequeño, que se carga al inicio en páginas cuyo `<html lang>` o cuyo `lang` fuera de un enlace o una opción lo indica; las páginas en inglés no hacen ninguna solicitud.

Con los módulos individuales, llama tú a `loadLocales()` y usa `await loadLocales()` antes de `initHighlight()`, `initPlayers()` e `initThemeCycle()`. Si no se puede cargar un archivo, se muestra un único aviso en la consola y se usa el inglés.

Para un idioma que LUZ no incluya, establece una vez `data-luz-label-*` en `<html>` o `<body>`, o llama a `registerLocale()` antes de iniciar los scripts.

Para comprobar el archivo, añade un mapa de importación con una sección `integrity` antes del primer script de módulo, solo en las páginas de ese idioma. Un enlace `modulepreload` con `integrity` no es una protección en Safari ni Firefox: úsalo como mejora del rendimiento.

Añadir un idioma a LUZ requiere un pull request: el archivo JSON `packages/core/src/i18n/<code>.json`, una línea en el mapa `files` de `i18n.js` y una fila de presupuesto. Los pasos están en AGENTS.md.

### Sin JavaScript

A qué recurre cada comportamiento cuando el script no se ejecuta:

- [Pestañas](https://nandovejer.github.io/luz/es/docs/components/tabs/): Enlaces y todos los paneles apilados
- [Selector del modo de color](https://nandovejer.github.io/luz/es/docs/components/mode-switcher/): Tres botones de opción que siguen cambiando el modo; no se recuerda la elección
- [Modo de color automático](https://nandovejer.github.io/luz/es/docs/site/mode/): Los cuatro botones de opción siguen cambiando el modo; Automático equivale a claro, y no se sigue ni el sistema ni el reloj
- [Botón de copia](https://nandovejer.github.io/luz/es/docs/components/copy-button/): Oculto; el texto sigue pudiéndose seleccionar
- [Reproductor](https://nandovejer.github.io/luz/es/docs/components/player/): Los controles propios del navegador para archivos multimedia; MIDI muestra su texto alternativo
- [Diálogo modal](https://nandovejer.github.io/luz/es/docs/components/modal/): Se abre donde el navegador admite `command`; en los demás casos, el botón de apertura no hace nada
- [Código](https://nandovejer.github.io/luz/es/docs/components/code/): Texto sin formato ni colores
- [Tabla](https://nandovejer.github.io/luz/es/docs/components/table/): Un encabezado con enlace se ordena en el servidor; un encabezado simple no se puede ordenar. Nunca se ocultan filas
- [Línea de tiempo](https://nandovejer.github.io/luz/es/docs/components/timeline/): Una lista ordenada con una línea y un punto por elemento; todos los elementos son visibles
- [Barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/): Funciona, incluido el cajón; el enlace actual no sigue el desplazamiento
- [Índice](https://nandovejer.github.io/luz/es/docs/cms/toc/) y otras listas `data-luz-spy`: Enlaces a las secciones; no se marca cuál está a la vista
