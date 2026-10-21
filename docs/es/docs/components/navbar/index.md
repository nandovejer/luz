# Barra de navegación

Coloca los enlaces principales de un sitio en una fila de la cabecera y, en pantallas estrechas, en un panel debajo.

### Problemas conocidos
Si sigues pulsando Tab después del último enlace del menú abierto, el foco pasa a la página y el menú permanece abierto por encima, ocultando lo que hay detrás. Pulsa Escape para cerrarlo.

Cumple WCAG 2.4.11 (AA), pero no 2.4.12 (AAA).

- **Navegadores sin posicionamiento de anclas.** En los navegadores compatibles con el posicionamiento de anclas CSS (Chrome y Edge 125, Safari 26 y Firefox 147), el panel se abre debajo de la barra, esté donde esté, incluso si hay un aviso o el banner de cookies encima. En los demás, se abre a `--luz-bar-h` desde la parte superior de la ventana: con texto ampliado y una barra que salta a una segunda fila, o con una banda por encima antes de desplazar la página, puede tapar parte de la barra. Escape o un clic fuera lo cierran.
- **Colores forzados en Firefox.** No se dibuja la capa atenuada detrás del menú abierto, así que la página no se atenúa. El panel conserva su borde y sigue distinguiéndose.
- **Puntos de ruptura en Safari para Mac.** Con las barras de desplazamiento siempre visibles, Safari no las cuenta en las consultas de medios por ancho (error 52653 de WebKit), así que el menú se contrae, o los enlaces vuelven a la fila, cuando la ventana supera los 768 px por hasta unos 15 px.

### Copiar el marcado
La barra de navegación va en la fila de una barra, después del botón de menú de core y del nombre del sitio. La barra es tuya o es la cabecera de un paquete para un tipo de sitio, que también establece el ancla bajo la que se abre el panel.

Navbar markup
```html
<header class="o-sticky">
  <div class="o-container o-container--inline o-row">
    <button class="luz-nav-toggle" type="button" popovertarget="site-nav" aria-label="Menu">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
    </button>
    <a href="/">Acme</a>
    <nav class="luz-navbar" id="site-nav" aria-label="Main" popover>
      <ul class="luz-navbar__list">
        <li><a class="luz-navbar__link" href="/products/" aria-current="page">Products</a></li>
        <li><a class="luz-navbar__link" href="/pricing/">Pricing</a></li>
        <li><a class="luz-navbar__link" href="/support/">Support</a></li>
      </ul>
    </nav>
  </div>
</header>
```

### Variantes y opciones
- `.luz-navbar`: En el `<nav popover>`: una fila de la barra a partir de 769 px; un panel debajo, del ancho de la ventana, a 768 px o menos
- `.luz-navbar__list`: El `<ul>`: una fila que salta de línea, sin viñetas; una columna dentro del panel abierto
- `.luz-navbar__link`: Cada enlace mide al menos 44 px de alto; con `aria-current`, usa el color de texto principal y un subrayado de 2 px
- `anchor-name: --luz-bar`: Se establece en la barra, con `anchor-scope: --luz-bar`, desde la cabecera de un tipo de sitio o por tu parte: el panel se abre debajo. Si no se establece, se abre a `--luz-bar-h` desde la parte superior de la ventana

### Cómo funciona
Un `popover` nativo en `<nav>`, abierto con `.luz-nav-toggle` de core mediante `popovertarget`. Sin JavaScript, el navegador gestiona Escape, el cierre al pulsar fuera, la posición del panel abierto en el orden de tabulación y el estado expandido del botón.

- A partir de 769 px, el popover cerrado aparece como una fila de la barra y el botón de menú queda oculto.
- A 768 px o menos, el panel queda fijo debajo de la barra, ocupa todo el ancho de la ventana y tiene una sombra y una capa atenuada que empieza debajo de la barra, para que esta nunca se atenúe.
- Si el panel queda abierto cuando se amplía la ventana, permanece debajo de la barra hasta que se cierra.
- Sin la API de popover, los enlaces permanecen en la fila y saltan de línea, y el botón de menú sigue oculto.
- El submenú de site ([Submenú](https://nandovejer.github.io/luz/es/docs/site/submenu/)) puede ir dentro de un elemento de lista.

### Sin JavaScript
No cambia nada: la barra de navegación usa HTML, un popover nativo y CSS.

### Teclado y ARIA
Pulsa Tab para llegar a cada enlace, siguiendo el orden de la página.

- En pantallas estrechas, cuando está cerrado, los enlaces no forman parte del orden de tabulación. Pulsa Enter o Espacio en el botón de menú para abrir el panel; la siguiente pulsación de Tab llega al primer enlace.
- Pulsa Escape o haz clic fuera para cerrar el panel y devolver el foco al botón. El botón indica si está expandido.
- Asigna al elemento `<nav>` un nombre que no tenga ninguna otra navegación de la página, como «Principal».
- Marca la página actual con `aria-current="page"`, o con `"true"` para la sección a la que pertenece una página.

### Cuándo usarlo
Usa la barra de navegación para incluir los pocos enlaces principales de un sitio en la cabecera compartida por todas las páginas.

### Cuándo no usarlo
No la uses en una aplicación con muchas secciones ni para los enlaces de una página.

- Para muchas secciones o una jerarquía, usa la [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/).
- Para indicar dónde está una página dentro de una jerarquía, usa las [migas de pan](https://nandovejer.github.io/luz/es/docs/components/breadcrumb/).
- Para las secciones de una página, usa [pestañas](https://nandovejer.github.io/luz/es/docs/components/tabs/) o una lista de enlaces internos.
