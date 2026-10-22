# Cabecera

Inicia cada página de un sitio de landing con su nombre, sus enlaces principales y algunos controles, en una fila que permanece arriba.

### Problemas conocidos
Los problemas propios de la cabecera son los de las piezas de core que la componen.

- **El panel del menú.** Si sigues pulsando Tab después del último enlace del menú abierto, el foco pasa a la página y el menú permanece abierto por encima; Esc lo cierra. Sin posicionamiento mediante anclas CSS, el panel y la lista de idiomas se abren desde la parte superior de la ventana, a la altura de una cabecera de una sola fila, así que con el texto ampliado pueden cubrir parte de la cabecera. Consulta los [problemas conocidos de la barra de navegación](https://nandovejer.github.io/luz/es/docs/components/navbar/#known-issues).
- **Cabecera fija y texto ampliado.** El relleno de desplazamiento de `.o-sticky` es un mínimo: con el texto al 300 % y la cabecera repartida en varias filas, Safari puede dejar oculto un campo al que se llega con Tab. Define `scroll-padding-block-start` en `html` con la altura real de la cabecera o prescinde de `.o-sticky`.

### Copiar el marcado
Header markup
```html
<header class="luz-landing-header o-sticky">
  <div class="o-container o-container--inline o-row">
    <button class="luz-nav-toggle" type="button" popovertarget="site-nav" aria-label="Menu">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
    </button>
    <a class="luz-landing-header__brand" href="/">Acme Summit</a>
    <nav class="luz-navbar" id="site-nav" aria-label="Main" popover>
      <ul class="luz-navbar__list">
        <li><a class="luz-navbar__link" href="/programme/" aria-current="page">Programme</a></li>
        <li><a class="luz-navbar__link" href="/speakers/">Speakers</a></li>
        <li><a class="luz-navbar__link" href="/tickets/">Tickets</a></li>
      </ul>
    </nav>
    <div class="o-row luz-landing-header__actions">
      <a class="luz-btn luz-btn--ghost" href="/account/">Log in</a>
    </div>
  </div>
</header>
```

### Variantes y opciones
No hay modificadores. La cabecera es una clase de landing aplicada a un `<header>` nativo, maquetada en el HTML con los objetos de core.

- `.luz-landing-header`: En `<header>`: la superficie de la página, una línea debajo, los espacios de la fila y el ancla bajo la que se abren sus paneles.
- `.luz-landing-header__brand`: El nombre del sitio como enlace a la página de inicio: seminegrita, sin subrayar, de al menos 44 px de alto; ocupa el espacio libre de la fila.
- `.luz-landing-header__actions`: Al final de una fila `.o-row`: búsqueda, un [selector de idioma](https://nandovejer.github.io/luz/es/docs/site/lang-switch/) y un botón.
- `.o-sticky` (core): Mantiene la cabecera arriba mientras se desplaza la página, en ventanas de al menos 30 rem de alto; consulta [la página y sus barras](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-page).
- `.o-container.o-container--inline.o-row` (core): La fila: el ancho y los márgenes interiores de la página; se ajusta en vez de desbordarse.
- `.luz-nav-toggle`, `.luz-navbar` (core): El botón del menú y los enlaces: consulta la [barra de navegación](https://nandovejer.github.io/luz/es/docs/components/navbar/).

### Cómo funciona
CSS de `@luz-ds/landing` sobre los objetos y la barra de navegación de core. No usa JavaScript y `@luz-ds/site` es opcional.

- Landing solo añade la apariencia: la superficie de la página, la línea inferior, la marca y los espacios de la fila (8 px entre filas, 16 px entre elementos y 24 px a partir de 769 px). Core aporta el resto: `.o-sticky`, la posición fija y el relleno de desplazamiento; `.o-container--inline`, los márgenes interiores; `.o-row`, la fila adaptable; y la barra de navegación, los enlaces y su panel.
- Una cabecera de una fila mide lo que `--luz-bar-h` de core: controles de 44 px, 4 px arriba y abajo y una línea de 1 px. Con el texto ampliado, la fila se ajusta y la cabecera crece.
- La cabecera se asigna a sí misma el ancla `--luz-bar`. En los navegadores compatibles con el posicionamiento mediante anclas CSS, el panel de la barra de navegación y la lista del `<luz-lang-switch>` del sitio se abren debajo, con una o dos filas. En los demás se abren a `--luz-bar-h` desde la parte superior de la ventana.
- Sin `@luz-ds/site` no cambia nada: sus reglas adicionales no coinciden con ningún elemento.

### Sin JavaScript
No cambia nada: el botón abre el menú como popover con `popovertarget`, sin scripts, y los enlaces son enlaces normales.

### Teclado y ARIA
- **Orden:** botón del menú, marca, enlaces y, por último, acciones, en el orden del código fuente. Con el menú abierto, el siguiente Tab después del botón lleva a sus enlaces.
- **Teclas:** Enter o Espacio en el botón abre y cierra el panel; Esc lo cierra y devuelve el foco al botón.
- **Nombres:** el `<nav>` tiene un `aria-label` («Principal»). El nombre del botón es «Menú»; el navegador expone si está expandido. El enlace actual tiene `aria-current="page"` y un subrayado.
- **Puntos de referencia:** un `<header>` que sea hijo directo de `<body>` es el banner. Pon el [enlace para saltar al contenido](https://nandovejer.github.io/luz/es/docs/components/skip-link/) antes.

### Cuándo usarla
Usa la cabecera al principio de cada página de un sitio de landing: permite reconocer el sitio y llegar desde cualquier página a sus partes principales.

### Cuándo no usarla
No la uses en un blog, un periódico o una aplicación: sus paquetes tienen sus propias cabeceras.

- Una cabecera por página, nunca dentro de un componente: es el banner de la página.
- Una página única que cabe en una pantalla necesita un encabezado y un enlace para saltar al contenido, no una cabecera.
