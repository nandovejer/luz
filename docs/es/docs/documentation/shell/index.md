# Estructura de página

La página de un sitio de documentación en tres columnas: la barra lateral, el contenido y el índice lateral; en el móvil se reduce a una columna.

### Problemas conocidos
No se conocen.

### Copiar el marcado
La estructura en `<body>`, seguida de la cabecera, la barra lateral, el índice lateral, el contenido y el pie, en el orden en que se recorren con el teclado. El enlace para saltar al contenido lo lleva hasta él, más allá de la barra lateral y del índice:

Shell markup
```html
<body class="o-shell luz-docs-shell">
  <a class="luz-skip-link" href="#main-content">Skip to content</a>
  <header>
    <button class="luz-nav-toggle" type="button" popovertarget="docs-nav" aria-label="Menu">…</button>
    <p><a href="/">Acme docs</a></p>
  </header>
  <nav class="luz-sidebar luz-docs-nav" id="docs-nav" aria-label="Acme docs" popover>…</nav>
  <aside class="luz-docs-rail" aria-label="About this page">…</aside>
  <main class="o-main luz-docs-main" id="main-content" tabindex="-1">
    <header class="luz-docs-page-head">…</header>
    …
  </main>
  <footer>…</footer>
</body>
```

### Variantes y opciones
Sin modificadores. Tres clases en elementos nativos y tres propiedades personalizadas.

- `.luz-docs-shell`: En `<body>`, con `.o-shell` de core: las columnas y la posición de cada parte
- `.luz-docs-nav`: Con `.luz-sidebar` de core, en `<nav>`: la columna de la barra lateral
- `.luz-docs-main`: Con `.o-main`, en `<main>`: la columna del contenido. Sus elementos se ajustan al ancho de lectura
- `.luz-docs-rail`: En un `<aside>`: la tercera columna a partir de 80rem, por encima del contenido. Consulta [Índice lateral](https://nandovejer.github.io/luz/es/docs/documentation/rail/)
- `--luz-docs-measure`: Una línea de texto: `46rem`. Asígnala a la estructura en tu CSS para cambiarla
- `--luz-docs-nav-w`, `--luz-docs-rail-w`: La barra lateral y el índice lateral: `16.5rem` y `14rem`
- `--luz-docs-rail-top`: A qué distancia de la parte superior queda fijado el índice lateral. Auméntala si hay una cabecera fija

### Cómo funciona
CSS de `@luz-ds/docs` sobre la estructura y la barra lateral de core. Docs define las columnas y el ancho de lectura; core aporta la cuadrícula y el cajón.

- A partir de 80rem hay tres columnas: barra lateral, contenido e índice lateral. A partir de 60rem hay dos, y el índice lateral se muestra encima del contenido. Por debajo, hay una, en el orden del marcado: barra lateral, índice lateral, contenido y pie.
- Un `<header>` sin estilos ocupa todas las columnas. El pie queda debajo del contenido y la barra lateral se extiende a su lado.
- Entre 769px y 60rem, la barra lateral es el primer bloque, por encima del contenido. A 768px o menos, pasa a ser el cajón de core: un popover que abre el botón de menú.
- Todos los elementos del contenido respetan `--luz-docs-measure`, así que un ejemplo tiene el ancho de una línea de texto. Al imprimir, se omite el índice lateral.

### Sin JavaScript
No cambia nada: la maquetación está hecha con CSS. El cajón es un popover que abre el atributo `popovertarget` del botón de menú, sin necesidad de scripts.

En un navegador sin la API de popover, la barra lateral permanece en la página, por encima del contenido.

### Teclado y ARIA
- **Orden:** el del código fuente; la cuadrícula no lo cambia. Enlace para saltar al contenido, cabecera, barra lateral, índice lateral, contenido y pie. El enlace lleva al contenido, más allá de la barra lateral y del índice.
- **Enlace para saltar al contenido:** coloca primero el [enlace para saltar al contenido](https://nandovejer.github.io/luz/es/docs/components/skip-link/), dirigido a `<main>`, para que quien use el teclado pueda omitir la barra lateral.
- **Regiones:** un `<header>` hijo de `<body>` es el banner; nombra el `<nav>` con el nombre del sitio y el `<aside>` «Acerca de esta página».
- **Teclas:** pulsa Enter o Espacio en el botón de menú para abrir el cajón; Esc para cerrarlo. El navegador se encarga.

### Cuándo usarlo
Usa esta estructura para las páginas de un sitio de documentación: se leen una tras otra, con una barra lateral que las reúne y una lista de las secciones de cada página.

- Tu sitio tiene más páginas de las que caben en una cabecera.
- Quienes leen recorren las páginas en orden.

### Cuándo no usarlo
No uses esta estructura para una página que no sea de documentación: presupone que hay una barra lateral y una columna de contenido.

- Para una página sin barra lateral, usa `.o-page` de core: consulta [la página y sus bandas](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-page).
- Para una aplicación web, usa [App](https://nandovejer.github.io/luz/es/docs/app/); para un blog, [CMS](https://nandovejer.github.io/luz/es/docs/cms/).
