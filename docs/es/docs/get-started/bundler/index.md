# Con un empaquetador o framework

Importa el CSS y el script de LUZ en Astro o en cualquier herramienta que resuelva nombres de paquetes, y conserva el orden de las capas y las fuentes.

### Los imports

Importa el CSS de cada paquete que uses, primero tokens, y el script si quieres añadir comportamiento. Un empaquetador resuelve estos nombres desde `node_modules`; un `<link>` en HTML no puede hacerlo.

The imports
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/core";

// Only if the page uses a site element: search, consent, language switch
import "@luz-ds/site/css";
import "@luz-ds/site";

// Only for one kind of site: landing, cms or app
import "@luz-ds/landing/css";
```

- Primero van los tokens: todos los demás paquetes los necesitan.
- `import "@luz-ds/core"` es el script. Es opcional: todas las páginas de LUZ funcionan sin él.
- Para cargar menos CSS, importa `@luz-ds/core/base.css` y después un archivo por componente, por ejemplo `@luz-ds/core/components/button.css`.
- Para cargar un módulo de script, impórtalo por su nombre y llama a su función: consulta [Módulos de JavaScript](https://nandovejer.github.io/luz/es/docs/get-started/javascript/).

Para ver las líneas adecuadas a lo que estás creando, con las etiquetas CDN y sus hashes de integridad, [elige tu fragmento](https://nandovejer.github.io/luz/es/docs/get-started/snippet/).

Cada nombre anterior es una entrada del mapa `exports` de su paquete. Esta tabla los enumera todos.

Exportaciones de cada paquete

- `@luz-ds/tokens`: `.`: `luz-tokens.css`, el mismo archivo que `./css`, para herramientas que buscan la hoja de estilos principal de un paquete
- `@luz-ds/tokens`: `./css`: `luz-tokens.css`: todos los tokens, con las reglas `@font-face` de ET Book
- `@luz-ds/tokens`: `./css/min`: `luz-tokens.min.css`: lo mismo, minimizado
- `@luz-ds/tokens`: `./tokens.css`: `tokens.css`: todos los tokens, sin `@font-face`. Para cuando aportas tu propia fuente
- `@luz-ds/tokens`: `./fonts.css`: Solo las reglas `@font-face`
- `@luz-ds/tokens`: `./tokens.json`: Los tokens en formato JSON, para herramientas
- `@luz-ds/tokens`: `./dtcg`: Los tokens en formato W3C Design Tokens, para Figma y otras herramientas de diseño
- `@luz-ds/tokens`: `./dtcg/resolver`: Un documento resolver para los mismos tokens, con sus tres modos de color
- `@luz-ds/tokens`: `./fonts/*`: Los archivos de fuente ET Book a los que apuntan las hojas de estilos
- `@luz-ds/tokens`: `./classes.json`: Todas las clases y propiedades personalizadas que define el paquete, con su tipo y capa, en JSON para herramientas y agentes de IA
- `@luz-ds/core`: `.`: `luz.js`: el script que inicia todos los comportamientos de la página. Impórtalo en el navegador
- `@luz-ds/core`: `./css`: `luz.css`: el restablecimiento, los elementos sin clases, los objetos de maquetación, los componentes y las utilidades
- `@luz-ds/core`: `./css/min`: `luz.min.css`: lo mismo, minimizado
- `@luz-ds/core`: `./base.css`: Los ajustes, el restablecimiento y los elementos sin clases, para cargar los componentes uno a uno
- `@luz-ds/core`: `./print.css`: Solo los estilos de impresión. `luz.css` ya los incluye
- `@luz-ds/core`: `./classless.css`: Estilos para marcado al que no puedes añadir clases, dentro de `data-luz-classless`
- `@luz-ds/core`: `./components/*`: Una hoja de estilos por componente, como `@luz-ds/core/components/button.css`
- `@luz-ds/core`: `./themes/*`: La plantilla para crear tu propio aspecto, `themes/_template.css`
- `@luz-ds/core`: `./theme`: Modo de color: `initThemeSystem`, `applyTheme`
- `@luz-ds/core`: `./sidebar`: Seguimiento del desplazamiento y cajón: `initSidebar`
- `@luz-ds/core`: `./clipboard`: Botones de copia: `initCopyButtons`
- `@luz-ds/core`: `./modal`: Alternativa para `command` y `commandfor` en un diálogo: `initModals`
- `@luz-ds/core`: `./highlight`: Resaltado de código: `initHighlight`
- `@luz-ds/core`: `./player`: Reproductores de audio y vídeo: `initPlayers`
- `@luz-ds/core`: `./tabs`: Pestañas: `initTabs`
- `@luz-ds/core`: `./midi`: El reproductor MIDI: `MidiPlayer`, cargado cuando hace falta
- `@luz-ds/core`: `./table-sort`: Tablas ordenables: `initTableSort`, cargadas cuando hacen falta
- `@luz-ds/core`: `./timeline`: El elemento `<luz-timeline>`, cargado cuando hace falta
- `@luz-ds/core`: `./utils`: Funciones auxiliares, como `formatTime` y `enableJs`
- `@luz-ds/core`: `./i18n`: Los textos de los scripts: `t`, `registerLocale`, `loadLocales`
- `@luz-ds/core`: `./i18n/*`: Los textos de uno de los idiomas que incluye LUZ, por ejemplo `@luz-ds/core/i18n/es`: su exportación predeterminada es un objeto de textos que se carga cuando hace falta
- `@luz-ds/core`: `./classes.json`: Todas las clases y propiedades personalizadas que define el paquete, con su tipo y capa, en JSON para herramientas y agentes de IA
- `@luz-ds/core`: `./custom-elements.json`: Todos los elementos personalizados que define o estiliza el paquete, con sus atributos y eventos, en formato Custom Elements Manifest para editores y agentes de IA
- `@luz-ds/site`: `.`: `site.js`: carga el script de cada elemento del sitio que haya en la página
- `@luz-ds/site`: `./search`: El elemento `<luz-search>`
- `@luz-ds/site`: `./consent`: El elemento `<luz-consent>` y `getConsent`
- `@luz-ds/site`: `./mode`: El elemento `<luz-mode>`
- `@luz-ds/site`: `./css`: `site.css`: los estilos de los elementos del sitio
- `@luz-ds/site`: `./css/min`: `site.min.css`: lo mismo, minimizado
- `@luz-ds/site`: `./print.css`: Solo las reglas de impresión de los elementos del sitio
- `@luz-ds/site`: `./components/*`: Una hoja de estilos por elemento del sitio: banner, consentimiento, selector de idioma, modo, búsqueda y submenú
- `@luz-ds/site`: `./classes.json`: Todas las clases y propiedades personalizadas que define el paquete, con su tipo y capa, en JSON para herramientas y agentes de IA
- `@luz-ds/site`: `./custom-elements.json`: Todos los elementos personalizados que define o estiliza el paquete, con sus atributos y eventos, en formato Custom Elements Manifest para editores y agentes de IA
- `@luz-ds/landing`: `./css`: `landing.css`: los elementos de una landing page
- `@luz-ds/landing`: `./css/min`: `landing.min.css`: lo mismo, minimizado
- `@luz-ds/landing`: `./components/*`: Una hoja de estilos por elemento
- `@luz-ds/landing`: `./classes.json`: Todas las clases y propiedades personalizadas que define el paquete, con su tipo y capa, en JSON para herramientas y agentes de IA
- `@luz-ds/cms`: `./css`: `cms.css`: los elementos de un blog o CMS
- `@luz-ds/cms`: `./css/min`: `cms.min.css`: lo mismo, minimizado
- `@luz-ds/cms`: `./components/*`: Una hoja de estilos por elemento
- `@luz-ds/cms`: `./classes.json`: Todas las clases y propiedades personalizadas que define el paquete, con su tipo y capa, en JSON para herramientas y agentes de IA
- `@luz-ds/app`: `./css`: `app.css`: los elementos de una aplicación web
- `@luz-ds/app`: `./css/min`: `app.min.css`: lo mismo, minimizado
- `@luz-ds/app`: `./components/*`: Una hoja de estilos por elemento
- `@luz-ds/app`: `./classes.json`: Todas las clases y propiedades personalizadas que define el paquete, con su tipo y capa, en JSON para herramientas y agentes de IA
- `@luz-ds/docs`: `./css`: `docs.css`: los elementos de una página de documentación
- `@luz-ds/docs`: `./css/min`: `docs.min.css`: lo mismo, minimizado
- `@luz-ds/docs`: `./components/*`: Una hoja de estilos por elemento
- `@luz-ds/docs`: `./classes.json`: Todas las clases y propiedades personalizadas que define el paquete, con su tipo y capa, en JSON para herramientas y agentes de IA

### El orden de las capas se conserva al empaquetar

Todos los archivos CSS que publica LUZ empiezan con la misma declaración `@layer`, que define el orden de todas sus capas. Así, el orden se mantiene aunque tu herramienta divida, reordene o una los archivos: el primer archivo que se carga lo establece.

En la compilación de Astro que aparece a continuación, las capas quedaron en el orden declarado, primero `luz.tokens` y al final `luz.print`; una regla del consumidor sin capa quedó la última.

Tu CSS que esté fuera de cualquier capa prevalece sobre todas las capas de LUZ, esté donde esté, sin necesidad de `!important`. [Capas de cascada](https://nandovejer.github.io/luz/es/docs/get-started/layers/) contiene la lista completa y explica cómo sobrescribir una.

### Astro, paso a paso

Un proyecto nuevo de Astro con los tokens y core de LUZ, una plantilla que los carga y CSS propio que se aplica al final.

**Creado con Astro 7.3 el 2026-10-15.** LUZ está en beta y Astro cambia entre versiones, así que esta página tiene fecha: si algún paso falla con una versión más reciente de Astro, consulta primero sus notas de esa versión.

Para la compilación se usaron paquetes creados desde el repositorio de LUZ en la versión 0.0.0, instalados con `npm install --legacy-peer-deps`, porque los rangos de dependencias peer `^0.1.0` no se resuelven hasta que se publique la versión 0.1.0. Después, el comando siguiente no necesita ninguna opción.

#### El proyecto

The files of the project
```text
my-site/
├─ package.json
├─ astro.config.mjs            (empty config: defineConfig({}))
└─ src/
   ├─ layouts/Base.astro       the two CSS imports, the script
   ├─ styles/site.css          your own CSS, last, outside any layer
   └─ pages/index.astro
```

`astro.config.mjs` se deja tal y como lo crea Astro. LUZ no necesita ninguna configuración en él.

#### Los comandos

The commands
```bash
npm create astro@latest my-site
cd my-site
npm install @luz-ds/tokens @luz-ds/core
npm run dev
```

#### La plantilla

src/layouts/Base.astro
```html
---
// src/layouts/Base.astro
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "../styles/site.css";
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My site</title>
  </head>
  <body>
    <slot />
    <script>
      import "@luz-ds/core";
    </script>
  </body>
</html>
```

#### Tu CSS y la página

src/styles/site.css
```css
/* src/styles/site.css */
:root { --luz-type-base: 1.125rem; }
```

src/pages/index.astro
```html
---
// src/pages/index.astro
import Base from "../layouts/Base.astro";
---
<Base>
  <main class="o-container">
    <h1>My site</h1>
    <button class="luz-btn luz-btn--primary" type="button">Save changes</button>
  </main>
</Base>
```

La regla de `site.css` establece el control tipográfico en 1.125rem y prevalece sobre el valor predeterminado de LUZ, sin capa y sin `!important`. [Hazlo tuyo](https://nandovejer.github.io/luz/es/docs/get-started/make-it-yours/) explica los demás controles.

#### Qué mostró la compilación

- `astro build` y `astro dev` funcionaron con los dos imports CSS en el encabezado de una plantilla y sin configuración en `astro.config.mjs`.
- Astro agrupó `<script>` con `import "@luz-ds/core"` en un único archivo de módulo y separó los fragmentos de carga diferida.
- Las fuentes se generaron como archivos con hash, y las capas y tu propia regla quedaron en el orden descrito arriba.

Se examinó el resultado de la compilación, pero no se abrió la página generada en un navegador. No se probó Astro con un enrutador de transiciones de vista (`<ClientRouter />`) ni Windows.

Los imports de `landing`, `cms` y `app` tienen la misma estructura que los anteriores, pero no se compilaron.

### Vite, Next, Nuxt y SvelteKit

Para esta página solo se compiló Astro; Vite por sí solo, Next, Nuxt y SvelteKit no se compilaron ni probaron. Los imports son los mismos y van en la plantilla raíz o en el archivo de entrada de la aplicación.

La documentación de cada herramienta indica dónde colocar el CSS de un paquete:

- [Documentación de Vite](https://vite.dev/guide/)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Nuxt](https://nuxt.com/docs)
- [Documentación de SvelteKit](https://svelte.dev/docs/kit)

Hay algo que todas comparten. Un módulo de LUZ no produce efectos secundarios al importarlo hasta que llamas a su función `init`, y `luz.js` y `site.js` comprueban primero que exista `document`.

Por eso, los frameworks que renderizan en el servidor pueden importarlos. En Node sin `document` se importaron diez módulos de core y site sin errores.

### Fuentes y recursos

`@luz-ds/tokens/css` es `luz-tokens.css`, y sus reglas `@font-face` apuntan a los archivos de ET Book con `url()`. El empaquetador resuelve esas rutas: Astro generó los archivos como recursos `woff2` con hash.

Para no usar ET Book, importa `@luz-ds/tokens/tokens.css`. Incluye los mismos tokens y no tiene reglas `@font-face`, así que no se descarga ninguna fuente.

Después, define `--luz-font-body` con la fuente que uses: [Hazlo tuyo](https://nandovejer.github.io/luz/es/docs/get-started/make-it-yours/) explica cómo.

### Una CDN en un framework

Puedes cargar LUZ desde una CDN en la plantilla de un framework en lugar de importarlo. En una plantilla de Astro, el `<link rel="stylesheet">` en `<head>` y el `<script type="module" src="https://…">`, cada uno con `integrity` y `crossorigin`, se quedan tal cual.

Lo mismo ocurre con un script con `is:inline`. Astro solo procesa un `<script>` que no tenga ningún atributo aparte de `src`.

Usa la CDN o los imports, pero no ambos: LUZ se cargaría dos veces. [Elige tu fragmento](https://nandovejer.github.io/luz/es/docs/get-started/snippet/) incluye las etiquetas y sus hashes.

### Si algo no funciona

- **Un aviso sobre una dependencia peer.** `@luz-ds/core` requiere `@luz-ds/tokens` en la versión `^0.1.0`. Instala ambos en la misma versión: `npm install @luz-ds/tokens @luz-ds/core`.
- **La herramienta no puede resolver `@luz-ds/core/css`.** La exportación es `./css`, sin extensión de archivo. Si la herramienta indica que un import no se puede resolver, añade el paquete a `vite.ssr.noExternal`, como se explica en la [guía de estilos de Astro](https://docs.astro.build/en/guides/styling/).
- **Los estilos aparecen en el orden equivocado.** Dos copias de LUZ en la página, por ejemplo una de una CDN y otra del empaquetador, ponen sus reglas en las mismas capas: cárgalo una sola vez. Un `@import` con `layer(luz)` anida los nombres como `luz.luz.components`: quita `layer()`. [Capas de cascada](https://nandovejer.github.io/luz/es/docs/get-started/layers/) explica el orden.

astro.config.mjs with the package left to the bundler
```js
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
  vite: { ssr: { noExternal: ["@luz-ds/tokens", "@luz-ds/core"] } },
});
```
