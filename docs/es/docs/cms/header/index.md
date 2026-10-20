# Cabecera

Abre cada página de un blog o periódico con el nombre de la publicación, sus secciones y una búsqueda: una fila fija arriba o una cabecera de tres filas.

### Problemas conocidos
Los problemas propios de la cabecera son los de los componentes de core que la forman y otro específico de la cabecera destacada.

- **El menú de la cabecera destacada sin posicionamiento de anclas.** En los navegadores sin posicionamiento de anclas CSS, el menú de secciones se abre cerca de la parte superior de la ventana y, mientras está abierto, cubre el nombre de la publicación y el botón de menú. Pulsa Escape o haz clic fuera del menú para cerrarlo y volver a la página.
- **El panel del menú.** Si sigues pulsando Tab después del último enlace del menú abierto, el foco avanza por la página y el menú permanece abierto encima; Escape lo cierra. Consulta los [problemas conocidos de la barra de navegación](https://nandovejer.github.io/luz/es/docs/components/navbar/#known-issues).
- **Barra fija y texto ampliado.** El relleno de desplazamiento de `.o-sticky` es un mínimo: con el texto al 300 % y la barra en varias filas, Safari puede dejar debajo de ella un campo al que se llega con Tab. Asigna a `scroll-padding-block-start` en `html` la altura real de la cabecera o prescinde de `.o-sticky`.

### Copiar el marcado
La barra de blog, con la búsqueda y el selector de idioma de site en sus acciones:

Blog bar markup
```html
<header class="luz-cms-header o-sticky">
  <div class="o-container o-container--inline o-row">
    <button class="luz-nav-toggle" type="button" popovertarget="cms-nav" aria-label="Sections">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
    </button>
    <a class="luz-cms-header__brand" href="/">The Vejer Review</a>
    <nav class="luz-navbar" id="cms-nav" aria-label="Sections" popover>
      <ul class="luz-navbar__list">
        <li><a class="luz-navbar__link" href="/news/" aria-current="true">News</a></li>
        <li><a class="luz-navbar__link" href="/culture/">Culture</a></li>
        <li><a class="luz-navbar__link" href="/opinion/">Opinion</a></li>
      </ul>
    </nav>
    <div class="o-row luz-cms-header__actions">
      <luz-search>…</luz-search>
      <luz-lang-switch>…</luz-lang-switch>
    </div>
  </div>
</header>
```

La cabecera destacada:

Masthead markup
```html
<header class="luz-cms-header luz-cms-header--masthead">
  <div class="o-container o-container--inline o-stack">
    <div class="o-row luz-cms-header__top">
      <p class="luz-cms-header__date"><time datetime="2026-10-14">Wednesday, 14 October 2026</time></p>
      <div class="o-row luz-cms-header__actions">
        <luz-search>…</luz-search>
      </div>
    </div>
    <a class="luz-cms-header__brand" href="/">The Vejer Review</a>
    <div class="o-row luz-cms-header__sections">
      <button class="luz-nav-toggle" type="button" popovertarget="cms-nav" aria-label="Sections">…</button>
      <nav class="luz-navbar" id="cms-nav" aria-label="Sections" popover>…</nav>
    </div>
  </div>
</header>
```

### Variantes y opciones
Un modificador. La cabecera es una clase de cms aplicada a un `<header>` nativo, maquetada con los objetos de core en el marcado.

- `.luz-cms-header`: En `<header>`: la barra de blog. La superficie de la página, una línea debajo, los espacios de la fila y el ancla bajo la que se abren sus paneles
- `.luz-cms-header--masthead`: La cabecera destacada del periódico: tres filas en un `.o-stack`, 16 px de espacio arriba y abajo, no fija
- `.luz-cms-header__brand`: El nombre de la publicación enlaza a la página de inicio, con la tipografía de encabezado en seminegrita y subrayado solo al pasar el puntero. En la barra ocupa el espacio libre de la fila; en la cabecera destacada es grande y centrado. El logotipo `<img>` mide 44 px de alto en la barra y 88 px en la cabecera destacada
- `.luz-cms-header__actions`: En un `.o-row`: la [búsqueda](https://nandovejer.github.io/luz/es/docs/site/search/) de site y después su [selector de idioma](https://nandovejer.github.io/luz/es/docs/site/lang-switch/)
- `.luz-cms-header__top`: Solo en la cabecera destacada, en un `.o-row`: la fecha al principio y las acciones al final, en una sola fila
- `.luz-cms-header__date`: Solo en la cabecera destacada: la fecha de hoy en un `<time datetime>`, pequeña y secundaria; salta de línea para dejar sitio a las acciones
- `.luz-cms-header__sections`: Solo en la cabecera destacada, en un `.o-row`: el botón de menú y la barra de navegación entre dos líneas, centrados a partir de 769 px; el panel se abre debajo de esta fila
- `.o-sticky` (core): Mantiene la barra de blog arriba mientras se desplaza la página, en ventanas de al menos 30 rem de alto; consulta [la página y sus barras](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-page). Nunca se usa en la cabecera destacada
- `.o-container.o-container--inline` (core): El ancho y los márgenes internos de la página, para que la cabecera empiece donde empieza el contenido
- `.luz-nav-toggle`, `.luz-navbar` (core): El botón de menú y las secciones: consulta la [barra de navegación](https://nandovejer.github.io/luz/es/docs/components/navbar/)

### Cómo funciona
CSS de `@luz-ds/cms` aplicado a los objetos y la barra de navegación de core. Sin JavaScript; `@luz-ds/site` es opcional.

- cms solo aporta la apariencia: la superficie de la página, la línea inferior, la marca y los espacios de la fila (8 px entre filas, 16 px entre elementos y 24 px a partir de 769 px). Core se ocupa del resto: `.o-sticky` aporta la fijación y el relleno de desplazamiento, `.o-container--inline` los márgenes internos, `.o-row` y `.o-stack` las filas, y la barra de navegación los enlaces y su panel.
- Una barra de una fila tiene la altura `--luz-bar-h` de core: controles de 44 px, 4 px arriba y abajo y una línea de 1 px. A 768 px o menos, la marca ocupa el espacio entre el botón de menú y las acciones, y salta de línea ahí para mantener los controles en una sola fila; al ampliar el texto, la fila se parte y la barra crece.
- La cabecera destacada no es fija: tres filas pegadas arriba ocuparían un tercio de la pantalla del móvil. La marca mide 49 px a partir de 1024 px, 39 px por debajo y 31 px a 640 px o menos (`--luz-text-4xl`, `-3xl` y `-2xl`, los tamaños del hero de landing).
- La barra, y la fila de secciones de la cabecera destacada, se identifican como el ancla `--luz-bar`, dentro de su propio ámbito. En los navegadores compatibles con el posicionamiento de anclas CSS, el panel de navegación se abre debajo. En los demás, se abre a `--luz-bar-h` desde la parte superior de la ventana (consulta Problemas conocidos).
- Con `@luz-ds/site`, la lista de `<luz-lang-switch>` se abre debajo de la barra. Sin él, no cambia nada: las reglas que amplían los elementos de site no coinciden con ninguno.
- El [índice](https://nandovejer.github.io/luz/es/docs/cms/toc/) de un artículo se queda fijo debajo de una barra con `.o-sticky`.

### Sin JavaScript
No cambia nada: el menú es una ventana emergente que abre `popovertarget` del botón, sin scripts; los enlaces son enlaces normales y la búsqueda de site muestra un enlace al índice alfabético.

### Teclado y ARIA
- **Orden:** el del código fuente. En la barra: botón de menú, marca, secciones y acciones. En la cabecera destacada: acciones de la fila superior, marca, botón de menú y secciones.
- **Teclas:** Enter o Espacio en el botón de menú abre y cierra el panel; Escape lo cierra y devuelve el foco al botón. El panel no es modal: al pulsar Tab después del último enlace se continúa por la página.
- **Nombres:** tanto `<nav>` como el botón de menú se llaman «Secciones»; el navegador expone el estado expandido del botón. La sección del artículo lleva `aria-current="true"` y el índice de la propia sección, `aria-current="page"`; ambos aparecen subrayados.
- **Marca:** un enlace, nunca un encabezado: el título del artículo es el único `h1` de la página. El logotipo es un `<img>` cuyo `alt` contiene el nombre de la publicación, sin texto al lado.
- **Puntos de referencia:** un `<header>` que es hijo directo de `<body>` es el banner. Pon antes el [enlace para saltar al contenido](https://nandovejer.github.io/luz/es/docs/components/skip-link/).

### Cuándo usarlo
Usa la cabecera al principio de cada página de un blog o periódico: quien llega a un artículo desde una búsqueda identifica la publicación y puede acceder a sus secciones y al buscador.

- La barra de blog para la mayoría de sitios: una fila que permanece arriba mientras se lee.
- La cabecera destacada para la portada y las secciones de un periódico, donde el nombre y la fecha marcan el tono.

### Cuándo no usarlo
No la uses en una página de aterrizaje ni en una app: sus paquetes tienen cabeceras propias.

- Una cabecera por página, nunca dentro de un componente o artículo: es el banner de la página.
- No fijes la cabecera destacada ni pongas la fecha en la barra: en una sola fila competiría con el nombre.
