# Cabecera

La barra discreta en la parte superior del área principal de una aplicación: botón de menú, nombre del producto en el móvil, búsqueda y cuenta.

### Problemas conocidos
Los problemas propios de la cabecera son los de los componentes de core que la forman.

- **La lista de cuenta sin posicionamiento de anclas.** En los navegadores sin posicionamiento de anclas CSS, la lista se abre como panel en la parte inferior de la ventana, en vez de debajo del botón. Pulsa Escape o haz clic fuera para cerrarla.
- **Barra fija y texto ampliado.** El relleno de desplazamiento de `.o-sticky` es un mínimo: con el texto al 300 % y la barra en varias filas, Safari puede dejar debajo de ella un campo al que se llega con Tab. Asigna a `scroll-padding-block-start` en `html` la altura real de la cabecera o prescinde de `.o-sticky`.

### Copiar el marcado
La barra, dentro de `.o-main` junto a la barra lateral, con la búsqueda de site antes de la cuenta:

App header markup
```html
<div class="o-shell">
  <nav class="luz-sidebar" id="app-nav" aria-label="Main" popover>…</nav>
  <div class="o-main">
    <header class="luz-app-header o-sticky">
      <div class="o-row">
        <button class="luz-nav-toggle" type="button" popovertarget="app-nav" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
        </button>
        <p class="luz-app-header__product">Bodega</p>
        <div class="o-row luz-app-header__actions">
          <luz-search>…</luz-search>
          <div class="luz-dropdown">
            <button class="luz-btn luz-btn--ghost luz-app-header__account" type="button" popovertarget="account-menu"><span class="luz-avatar luz-avatar--sm">AM</span> <span class="luz-app-header__account-name">Ana Martín</span></button>
            <div class="luz-dropdown__menu" id="account-menu" popover>
              <ul class="luz-dropdown__list">
                <li><a class="luz-dropdown__item" href="/account/">Account settings</a></li>
                <li><a class="luz-dropdown__item" href="/logout/">Sign out</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main class="luz-app-dashboard" id="main-content" tabindex="-1">…</main>
  </div>
</div>
```

### Variantes y opciones
Sin modificadores. La cabecera es una clase de app aplicada a un `<header>` nativo, maquetada con los objetos de core en el marcado.

- `.luz-app-header`: En `<header>`, hijo de `.o-main`: la superficie de la página y una línea debajo. Es una fila de `--luz-bar-h`; su `.o-row` usa los márgenes internos del contenido
- `.luz-app-header__product`: El nombre del producto en texto mediano y seminegrita. Solo aparece a 768 px o menos, cuando la barra lateral es un panel y su marca queda oculta
- `.luz-app-header__actions`: En un `.o-row`: las herramientas globales al extremo en línea de la barra. Primero la [búsqueda](https://nandovejer.github.io/luz/es/docs/site/search/) de site y después la cuenta
- `.luz-app-header__account`: En el `.luz-btn.luz-btn--ghost` que abre la lista de cuenta: al menos 44 por 44 px, con sus iniciales en un `.luz-avatar` y después el nombre
- `.luz-app-header__account-name`: El nombre de la cuenta. A 640 px o menos se oculta, pero sigue formando parte del nombre del botón
- `.o-sticky` (core): Mantiene la barra arriba mientras se desplaza la página, en una ventana de al menos 30 rem de alto; consulta [la página y sus barras](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-page)
- `.luz-dropdown` (core): La lista de cuenta, un desplegable de enlaces: consulta [Desplegable](https://nandovejer.github.io/luz/es/docs/components/dropdown/)

### Cómo funciona
CSS de `@luz-ds/app` aplicado a la estructura, la barra fija, el panel y el desplegable de core. Sin JavaScript; `@luz-ds/site` es opcional.

- App solo aporta la apariencia: la superficie de la página, la línea inferior y los espacios de la fila (8 px entre filas, 16 px entre elementos). Core se ocupa del resto: `.o-sticky` aporta la fijación y el relleno de desplazamiento, `.o-row` la fila, el control de navegación y la barra lateral el panel, y el desplegable la lista de cuenta.
- Una barra de una fila tiene la altura `--luz-bar-h` de core: controles de 44 px, 4 px arriba y abajo y una línea de 1 px. Al ampliar el texto, la fila se parte y la barra crece.
- Se desplaza la página, no `.o-main`, así que la barra fija permanece en la parte superior de la ventana. Si asignas una altura propia a `.o-main` y haces que se desplace, su relleno de desplazamiento evita que los elementos enfocados queden bajo la barra.
- La lista de cuenta se abre debajo del botón y termina donde este termina, así que nunca se sale de la ventana por el extremo en línea de la barra.
- Sin site no hay búsqueda: omite `<luz-search>`. No cambia nada más.
- El `h1` y la acción principal de la vista no van aquí: son la primera fila del [panel de control](https://nandovejer.github.io/luz/es/docs/app/dashboard/). La barra solo contiene los elementos comunes a todas las vistas.

### Sin JavaScript
No cambia nada.

El panel y la lista de cuenta son ventanas emergentes que abre `popovertarget` del botón, sin scripts; la búsqueda de site muestra un enlace al índice alfabético. En navegadores sin la API de ventanas emergentes, la barra lateral queda en la página, encima del contenido; el botón de menú no se muestra y la lista de cuenta permanece debajo de su botón.

### Teclado y ARIA
- **Orden:** el del código fuente y la pantalla. Enlace para saltar al contenido, barra lateral (una columna a partir de 769 px), búsqueda, cuenta y vista. A 768 px o menos, el panel cerrado queda fuera del orden: enlace para saltar al contenido, botón de menú, búsqueda, cuenta y vista.
- **Teclas:** Enter o Espacio en el botón de menú abre el panel y, en el botón de cuenta, abre la lista; Tab recorre los enlaces en orden; Escape lo cierra y devuelve el foco al botón.
- **Nombres:** el botón de menú se llama «Menú» (`aria-label`, traducido como el resto de la página). El nombre del botón de cuenta son primero las iniciales y después el nombre: «AM Ana Martín», así quien busque «AM» lo encontrará a cualquier ancho. El navegador expone el estado expandido de los botones.
- **No es un menú:** la lista de cuenta es una lista de enlaces en una ventana emergente. No lleva `role="menu"` ni `aria-haspopup`, y no se usan las teclas de flecha.
- **Puntos de referencia:** un `<header>` dentro de `.o-main`, que es un `<div>`, es el banner de la página y va junto a `<main>`, nunca dentro. La barra lateral es el único elemento de navegación y se llama «Principal». Pon primero el [enlace para saltar al contenido](https://nandovejer.github.io/luz/es/docs/components/skip-link/): omite la barra lateral y la barra superior.

### Cuándo usarlo
Usa la cabecera en la parte superior del área principal de cada vista de una aplicación: así siempre se encuentran la búsqueda y la cuenta en el mismo lugar.

- Una fila discreta con herramientas globales: botón de menú, búsqueda y cuenta.
- El nombre del producto en el móvil, donde la marca de la barra lateral queda detrás del panel.

### Cuándo no usarlo
No la uses para el título ni las acciones de la vista: van en la primera fila del panel de control.

- Una cabecera por página, dentro de `.o-main`: es el banner de la página.
- No pongas un botón principal en la barra: la acción principal de la vista se perdería entre los elementos de interfaz.
- Para una barra con secciones propias del sitio, usa la [barra de navegación](https://nandovejer.github.io/luz/es/docs/components/navbar/) en la cabecera de [landing](https://nandovejer.github.io/luz/es/docs/landing/header/) o [CMS](https://nandovejer.github.io/luz/es/docs/cms/header/).
