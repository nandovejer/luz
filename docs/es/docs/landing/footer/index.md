# Pie de página

Cierra cada página de un sitio de landing con quién lo ha creado, su licencia y algunos enlaces secundarios, separados por una línea, en una fila o en columnas.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Footer markup
```html
<footer class="luz-landing-footer">
  <div class="o-container o-container--inline o-row">
    <p>Acme Inc. · MIT licence</p>
    <nav class="o-actions" aria-label="Links">
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/status/">Service status</a>
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/accessibility/">Accessibility statement</a>
    </nav>
  </div>
</footer>
```

Footer with columns markup
```html
<footer class="luz-landing-footer">
  <div class="o-container o-container--inline o-grid">
    <div class="luz-landing-footer__brand">
      <p><strong>Acme Stock</strong> <span>v2.0</span></p>
      <p>Stock counts that keep up with the shop.</p>
    </div>
    <nav class="luz-landing-footer__col" aria-labelledby="footer-product">
      <h2 class="luz-landing-footer__col-title" id="footer-product">Product</h2>
      <ul>
        <li><a href="/pricing/">Pricing</a></li>
        <li><a href="/trial/">Start free trial</a></li>
      </ul>
    </nav>
    <nav class="luz-landing-footer__col" aria-labelledby="footer-company">
      <h2 class="luz-landing-footer__col-title" id="footer-company">Company</h2>
      <ul>
        <li><a href="/about/">About</a></li>
      </ul>
    </nav>
  </div>
</footer>
```

### Variantes y opciones
Sin modificadores. El pie de página es una clase de landing aplicada a un `<footer>` nativo, con una fila de core o una cuadrícula para la marca y las columnas.

- `.luz-landing-footer`: En `<footer>`: una línea arriba, 24 px hasta la fila y 32 px debajo; la fila separa a sus hijos hacia los dos extremos y, a 768 px o menos, se convierte en una columna alineada al inicio.
- `.o-container.o-container--inline.o-row` (core): La fila: el ancho y los márgenes interiores de la página, para que el contenido empiece donde empieza el área principal.
- `.luz-landing-footer__brand`: La primera celda de `.o-container.o-container--inline.o-grid` (core), con una separación de 24 px (`--luz-space-lg`): un nombre, una versión y una línea. A partir de 768 px ocupa dos columnas.
- `.luz-landing-footer__col`: Una columna en un `<nav>`: un título sobre una lista de enlaces sin marcadores, separados 8 px (`--luz-space-xs`); cada enlace es un cuadro de 28 px (`--luz-control-sm`) de alto, con un área de activación de 24 px o más.
- `.luz-landing-footer__col-title`: El título de una columna: tipografía sans, pequeño, seminegrita y en color de texto principal.
- `.o-actions` (core): Los enlaces, como un [grupo de acciones](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-actions).

### Cómo funciona
CSS de `@luz-ds/landing` sobre los objetos de core. No usa JavaScript y `@luz-ds/site` es opcional.

- Landing añade la línea, el espacio alrededor de la fila y la distribución de sus elementos; `.o-container--inline` alinea la fila con el contenido de la página.
- En un `.o-page`, el área principal crece, así que el pie de página queda abajo cuando la página es más corta que la ventana.
- Con una marca y columnas, las celdas se apilan; a partir de 768 px se colocan en fila: la marca ocupa dos partes y cada columna, una.
- A 768 px o menos, la columna no se ajusta y sus elementos permanecen uno debajo del otro.

### Sin JavaScript
No cambia nada: el pie de página es HTML y CSS. El [selector de modo de color](https://nandovejer.github.io/luz/es/docs/components/mode-switcher/) que incluya sigue funcionando con botones de opción.

### Teclado y ARIA
El pie de página no tiene interacción propia; sus enlaces mantienen la suya.

- Un `<footer>` que sea hijo directo de `<body>` es el punto de referencia de información del contenido.
- Nombra un `<nav>` de enlaces con `aria-label` y mantén los enlaces en el mismo orden en todas las páginas.
- Nombra el `<nav>` de una columna con su título mediante `aria-labelledby` y convierte el título en un encabezado (`<h2>`).

### Cuándo usarlo
Usa el pie de página al final de cada página de un sitio de landing para indicar quién lo ha creado, su licencia y algunos enlaces secundarios.

### Cuándo no usarlo
No pongas en el pie de página la navegación principal ni nada que haga falta para completar una tarea.

- La navegación principal va en la [cabecera](https://nandovejer.github.io/luz/es/docs/landing/header/).
