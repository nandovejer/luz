# Instala LUZ

Elige un nivel y copia un comando de instalación o las etiquetas de CDN. Cada nivel necesita los que están por debajo, pero ninguno de los que están por encima.

¿Ya sabes qué estás creando? [Elige tu fragmento](https://nandovejer.github.io/luz/es/docs/get-started/snippet/) y copia las líneas que necesitas, con los hashes de CDN incluidos.

Beta

Los nombres, las clases y el comportamiento aún pueden cambiar antes de la versión estable. Fija una versión exacta y lee el registro de cambios antes de actualizar.

### ¿Qué nivel necesito?

- **Tus propios componentes, los colores y el espaciado de LUZ:** nivel 1, solo tokens.
- **Botones, formularios, tablas y diálogos listos para usar:** nivel 2, tokens y core.
- **Páginas completas: estructura, cabecera, pie de página y búsqueda:** nivel 3, los tres paquetes.
- **Una landing page, con su cabecera, hero y bloques:** nivel 3 y [un paquete para ese tipo de sitio](https://nandovejer.github.io/luz/es/docs/get-started/#site-kinds).

### Nivel 1: solo tokens

Propiedades personalizadas de CSS: las escalas de color, espacio y tipografía, los roles tipográficos, los puntos de ruptura y las duraciones del movimiento, y los colores de los modos claro, oscuro y de alto contraste. No necesitas ningún otro paquete de LUZ.

`pnpm add @luz-ds/tokens`

CDN tags, level 1
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
```

Con un bundler como Vite, importa los archivos en lugar de añadir etiquetas. Un `href` no puede indicar un paquete: estas rutas solo sirven para `import`.

Bundler imports, level 1
```js
import "@luz-ds/tokens/css";
```

- El texto corrido y los encabezados usan ET Book, una fuente con licencia MIT que se incluye con los tokens. Los controles, las etiquetas y las tablas usan la sans del sistema, y el código, la mono del sistema.
- ¿Vas a usar tus propias fuentes? Carga `dist/tokens.min.css`: contiene los mismos tokens, pero sin reglas `@font-face`.
- Comprueba que tus colores cumplen las proporciones de WCAG con `npx @luz-ds/tokens check-contrast` o [en el navegador](https://nandovejer.github.io/luz/es/docs/tokens/contrast/).

### Nivel 2: tokens y core

Los 32 componentes, los estilos de los elementos HTML sin clases y JavaScript opcional. Carga primero los tokens.

`pnpm add @luz-ds/tokens @luz-ds/core`

CDN tags, level 2
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">

<!-- Optional: copy buttons, tabs, players, the color mode -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
```

Bundler imports, level 2
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";

// Optional: copy buttons, tabs, players, the color mode
import "@luz-ds/core";
```

- Todas las páginas funcionan sin el script. Consulta [qué aporta cada módulo de JavaScript](https://nandovejer.github.io/luz/es/docs/get-started/javascript/).
- ¿Solo necesitas un componente? Carga `dist/base.min.css` y el archivo que quieras, por ejemplo `dist/components/button.min.css`.
- ¿Tienes marcado al que no puedes añadir clases, como Markdown o el de un CMS? Carga [`classless.css`](https://nandovejer.github.io/luz/es/docs/get-started/classless/) y marca la zona con `data-luz-classless`.

### Nivel 3: tokens, core y site

Seis componentes que necesitan datos del sitio: búsqueda, consentimiento de cookies, modo de color, selector de idioma, submenú y banner. Site necesita core y tokens.

La estructura de la página, desde la cabecera hasta el pie, está en landing y cms, que funcionan sin site.

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site`

CDN tags, level 3
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

Bundler imports, level 3
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/site/css";

// Optional: core behaviours, and the site search
import "@luz-ds/core";
import "@luz-ds/site";
```

### Paquetes para un tipo de sitio

Además del nivel 3, un paquete puede añadir lo que necesita un tipo de sitio:

- [Landing](https://nandovejer.github.io/luz/es/docs/landing/): la cabecera, el hero, las secciones y el pie de página de una landing page, además de bloques listos para copiar.
- [CMS](https://nandovejer.github.io/luz/es/docs/cms/): la cabecera, la cabecera de página y de artículo, el índice y el pie de un blog o periódico, con cualquier CMS.
- [App](https://nandovejer.github.io/luz/es/docs/app/): la cabecera y el panel de control de una aplicación web.
- [Documentación](https://nandovejer.github.io/luz/es/docs/documentation/): la estructura, la cabecera y el pie de página, la barra lateral, el ejemplo, la sección de qué hacer y qué no, y la navegación entre páginas de un sitio de documentación.

Cada uno necesita primero los paquetes del nivel 2. Site es opcional; los comandos siguientes lo añaden para incluir la búsqueda y el selector de idioma.

Instala el que necesites.

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/landing`

CDN tags, landing
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/landing@0.0.0/dist/landing.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/cms`

CDN tags, cms
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/cms@0.0.0/dist/cms.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/app`

CDN tags, app
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/app@0.0.0/dist/app.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/docs`

- Landing, cms, app y docs tienen versiones propias y necesitan la versión `^0.1.0` de los paquetes base. Fija ambas versiones.
- Con un bundler, añade `import "@luz-ds/landing/css";`, `import "@luz-ds/cms/css";`, `import "@luz-ds/app/css";` o `import "@luz-ds/docs/css";` después de las importaciones del nivel 3.
- Ninguno tiene un script. El de core es opcional: con cms, marca la sección visible en el índice; con app, marca el enlace actual de la barra lateral y cierra el panel al seguir un enlace.

### Antes de publicar

- npm y pnpm instalan automáticamente los niveles inferiores. Yarn solo muestra un aviso, así que indica todos los paquetes, como arriba.
- En un CDN, fija una versión exacta y añade un hash `integrity` con `crossorigin="anonymous"`. Calcula el hash a partir del archivo que cargas, como se muestra abajo.
- Los scripts de core y site muestran un aviso en la consola si falta el nivel inferior.
- Establece `lang` en `<html>`: los scripts de core escriben sus textos en ese idioma (se incluyen inglés y español).

Computing the integrity hash
```text
curl -s https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css | openssl dgst -sha384 -binary | openssl base64 -A
```

Añade el resultado como `integrity="sha384-…"` a la etiqueta que carga ese archivo y repite el proceso con cada archivo.

El hash de un script solo cubre ese archivo, no los que carga después. `site.min.js` carga `search.min.js` en páginas con búsqueda, `consent.min.js` en páginas con un banner de cookies y `mode.min.js` en páginas con el modo de color automático.

Asigna a cada uno su propio hash en un mapa de importaciones, antes del primer script de módulo. Funciona en Chrome 127, Safari 18 y Firefox 138 y posteriores; un navegador más antiguo lo ignora y carga los archivos sin comprobarlos.

Un `<link rel="modulepreload">` con un hash no protege en Safari ni en Firefox: úsalo solo como indicación para mejorar el rendimiento.

Integrity for the site scripts
```html
<script type="importmap">
{
  "integrity": {
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/search.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/consent.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/mode.min.js": "sha384-…"
  }
}
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js" integrity="sha384-…" crossorigin="anonymous"></script>
```

### Siguientes pasos

- [Elige tu fragmento](https://nandovejer.github.io/luz/es/docs/get-started/snippet/) para tu tipo de sitio y la forma de cargarlo.
- [Explora los componentes](https://nandovejer.github.io/luz/es/docs/components/) y copia su marcado.
- [Configura los modos de color](https://nandovejer.github.io/luz/es/docs/tokens/modes/): claro, oscuro y de alto contraste.
- [Aprende cómo funcionan los tokens](https://nandovejer.github.io/luz/es/docs/tokens/) antes de escribir tus propios componentes.
- [Descubre cómo se organiza LUZ](https://nandovejer.github.io/luz/es/docs/get-started/structure/): paquetes, capas de CSS y estructura de la página.
