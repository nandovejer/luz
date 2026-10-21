# Cómo se organiza LUZ

Paquetes con dependencias en una sola dirección, CSS en capas de cascada dentro de una llamada luz y un script opcional.

### Límites entre paquetes

Cada paquete depende de los que aparecen por encima en esta lista, nunca de los que aparecen por debajo.

El nombre significa Light, Usable & Zero-dependency: ligero (CSS sin procesar y módulos ES, sin nada que compilar para quienes lo usan), usable por todo el mundo (HTML nativo, tres modos de color y pruebas de accesibilidad) y sin dependencias en tiempo de ejecución.

Package dependency chain
```text
@luz-ds/tokens   -> primitive and semantic tokens (standalone)
      ↓ required by
@luz-ds/core     -> components, objects, bare-element styles, optional JS
      ↓ required by
@luz-ds/site     -> search, consent, mode, lang-switch, submenu and banner

Each of these needs tokens and core, and takes site as an optional peer:
@luz-ds/landing  -> header, hero, sections and footer of a landing page (own version, 0.x)
@luz-ds/cms      -> page structure of a blog, a newspaper or any CMS (own version, 0.x)
@luz-ds/app      -> header and dashboard of a web application (own version, 0.x)
@luz-ds/docs     -> shell, page head, rail, example, do and don't, pager and page foot of a documentation site (own version, 0.x)
```

- Landing, cms, app y docs necesitan tokens y core, y pueden usar site si lo cargas; nunca dependen unos de otros. Site necesita core y tokens; core necesita tokens; tokens no necesita nada.
- Tokens, core y site comparten versión. Un paquete para un tipo de sitio, como landing, cms, app o docs, tiene su propia versión y especifica la versión principal de los otros paquetes que necesita.
- Los paquetes lo declaran como dependencias peer: obligatorias para tokens y core, y opcionales para site en landing, cms, app y docs. Los scripts de core y site avisan en la consola si falta una capa.

### Qué necesita cada paquete

Busca la pieza que quieres y instala el paquete de su fila y los que aparecen debajo.

Qué paquete contiene cada parte de una página

- Modos de color, tokens semánticos, ET Book: `--luz-*`, `data-theme`: tokens: No hace falta nada más
- Restablecimiento y estilos de elementos HTML sin clases: `h1`, `p`, `a`, `ul`…: core: En `base.css` y `luz.css`
- Componentes: `.luz-btn`, `.luz-field`, `.luz-card`, `.luz-table`, `.luz-tabs`…: core: También hay un archivo por componente en `components/`
- Diálogo modal: `.luz-modal` en un `<dialog>`: core: El script es una alternativa para navegadores sin `command` y `commandfor`
- Objetos de maquetación: `.o-container`, `.o-grid`, `.o-stack`, `.o-media`: core: El espaciado procede de los tokens de espacio
- Maquetación de una aplicación con barra lateral: `.o-shell`, `.o-main`, `.luz-sidebar`: core: Un `<footer>` sencillo, como hijo directo de `.o-shell`, ocupa la parte inferior; su aspecto lo decides tú o lo define un tipo de sitio
- Una página sin barra lateral, una barra fija, un grupo de acciones: `.o-page`, `.o-sticky`, `.o-actions`: core: En lugar de `.o-shell`, para una página sin barra lateral: [la página y sus barras](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-page)
- Enlace para saltar, banda y marco de imagen: `.luz-skip-link`, `.luz-band`, `.luz-image`: core: El marco de imagen mantiene una proporción y recorta la imagen; si no hay imagen, muestra una superficie lisa
- La cabecera, el hero, las secciones y el pie de una landing page: `.luz-landing-header`, `-hero`, `-main`, `-section`, `-footer`, `-glow`: landing: Se basa en los objetos de core (`.o-page`, `.o-sticky`, `.o-container`, `.o-grid--split`) y la navbar de core; site es opcional. Una cuadrícula de características usa `ul.o-grid.o-grid--split`, de core
- La cabecera, la cabecera de página y de artículo, el índice y el pie de un blog o periódico: `.luz-cms-header` (`--masthead`), `-page-header`, `-article-header`, `-article`, `-toc`, `-footer`: cms: Se basa en los objetos y la navbar de core; site es opcional. Las tarjetas, los listados y la ficha del autor usan la tarjeta de core: [plantillas de CMS](https://nandovejer.github.io/luz/es/docs/cms/templates/)
- La cabecera y el panel de control de una aplicación web: `.luz-app-header` (`__product`, `__actions`, `__account`), `.luz-app-dashboard` (`__head`, `__title`, `__panel`): app: Se basa en la estructura, la barra lateral, la barra fija, la cuadrícula y la tarjeta de core; site es opcional, para la búsqueda. Sin script. Consulta [App](https://nandovejer.github.io/luz/es/docs/app/)
- La estructura, la cabecera de página, la barra lateral, el ejemplo, Qué hacer y qué no, la paginación y el pie de una web de documentación: `.luz-docs-shell`, `.luz-docs-page-head`, `.luz-docs-rail`, `.luz-docs-example`, `.luz-docs-dodont`, `.luz-docs-pager`, `.luz-docs-page-foot`: docs: Se basa en la estructura, la barra lateral, el bloque de código y las tablas de core; site es opcional, para la búsqueda. Sin script. Consulta [Documentación](https://nandovejer.github.io/luz/es/docs/documentation/)
- Los enlaces de una cabecera y su botón de menú: `.luz-navbar`, `.luz-nav-toggle`: core: Panel popover a 768 px o menos, sin script
- Submenú y banner: `<luz-submenu>`, `<luz-banner>`: site: Etiquetas sin script ni clase: el submenú es un `<details>` nativo entre los enlaces de una cabecera; el banner, una `<section>`
- Consentimiento de cookies: `<luz-consent>`, `.luz-consent`: site: `site.js` carga el script `consent.js` cuando la página contiene el elemento; muestra una banda fija en la parte inferior de la ventana; sin el script permanece oculta
- Modo de color automático: `<luz-mode>`: site: `site.js` carga el script `mode.js` cuando la página contiene el elemento; sin él, los botones de opción del selector de core siguen funcionando y el modo automático es claro
- Selector de idioma: `<luz-lang-switch>`: site: Sin script
- Búsqueda del sitio: `<luz-search>`, `.luz-search`: site: Necesita el script (`site.js`, que carga `search.js` cuando la página contiene el elemento) y un archivo de índice; sin ellos, es un enlace
- Estilos de impresión: No hay que añadir nada: core: En `luz.css`; site añade sus propias reglas de impresión
- Marcado al que no puedes añadir clases: `data-luz-classless`: core: `classless.css`, un archivo independiente
- Comprobación de lo que has escrito tú o un agente de IA: `npx @luz-ds/check`, el comando `luz-check`: check: Una herramienta sin CSS ni capa, que no necesita ningún otro paquete: analiza tu HTML y CSS sin conexión. Consulta [Trabajar con IA](https://nandovejer.github.io/luz/es/docs/get-started/ai/)

- **Dos formas de maquetar una página, ambas de core.** `.o-shell` con `.o-main`: una columna lateral junto al área principal. `.o-page`: cabecera, contenido y pie en una columna. Elige una para la estructura de la página: la primera si tiene barra lateral y la segunda si no. Las cabeceras y los pies de landing o CMS funcionan con ambas; esta documentación usa `.o-shell`.
- Site necesita core, y core necesita tokens, así que cada paquete necesita también todos los paquetes de debajo. Landing, CMS, app y docs necesitan core y tokens; site es opcional para ellos.

### Capas CSS

El CSS de core usa capas de cascada nativas (`@layer`), en el orden ITCSS y dentro de una capa contenedora llamada `luz`. Las seis de abajo contienen sus reglas; [la página sobre capas](https://nandovejer.github.io/luz/es/docs/get-started/layers/) las enumera todas, junto con tokens, site e impresión.

Una capa posterior prevalece sobre una anterior, y cualquier CSS tuyo que no esté en una capa prevalece sobre todo LUZ, sin `!important`. [Cómo ordenarlas y sobrescribirlas](https://nandovejer.github.io/luz/es/docs/get-started/layers/).

Core cascade layers
```text
packages/core/src/
  settings/_settings.css      luz.settings    z-index, layout widths, field text
  generic/_reset.css          luz.generic     the reset
  elements/*.css              luz.elements    bare HTML elements, zero specificity
  objects/_objects.css        luz.objects     layout: .o-*
  components/*.css            luz.components  the components: .luz-*
  utilities/_utilities.css    luz.utilities   single-purpose helpers: .u-*
```

- La capa de componentes contiene 32 componentes.
- `dist/luz.css` contiene estas seis capas y `luz.print`. Tokens está en `luz.tokens`, site en `luz.site`, landing en `luz.landing`, cms en `luz.cms`, app en `luz.app` y docs en `luz.docs`; `luz.themes` está vacía, reservada para un tema propio. Si una página solo necesita unos pocos componentes, carga `dist/base.css` (ajustes, restablecimiento y elementos) y luego `dist/components/<name>.css` para cada uno.
- Las reglas de los elementos sin clase están dentro de `:where()`, así que cualquier clase prevalece sobre ellas.

### El script

Un único punto de entrada opcional, `luz.js`, inicia todos los comportamientos de la página: modo de color, botones para copiar, diálogos, resaltado, reproductores, pestañas y barra lateral.

Load the core script
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"></script>
```

Para cargar menos código, importa un módulo y llama a su función `init`. Consulta [Módulos de JavaScript](https://nandovejer.github.io/luz/es/docs/get-started/javascript/).

### Página mínima

Minimal page skeleton
```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign up – Acme</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
</head>
<body>
  <main class="o-container">
    <h1>Sign up</h1>
    <form action="/signup/" method="post">
      <div class="luz-field">
        <label class="luz-field__label" for="email">Email</label>
        <input class="luz-input" id="email" name="email" type="email" autocomplete="email" required>
      </div>
      <button class="luz-btn luz-btn--primary" type="submit">Create account</button>
    </form>
  </main>
</body>
</html>
```
