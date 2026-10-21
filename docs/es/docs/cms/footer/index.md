# Pie

Cierra cada página de un blog o periódico con quién lo publica y algunos enlaces secundarios, bajo una línea.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Footer markup
```html
<footer class="luz-cms-footer">
  <div class="o-container o-container--inline o-row">
    <p>The Vejer Review is published by a cooperative.</p>
    <nav class="o-actions" aria-label="Links">
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/corrections/">Corrections</a>
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/accessibility/">Accessibility statement</a>
    </nav>
  </div>
</footer>
```

### Variantes y opciones
No hay modificadores. El pie es una clase de cms aplicada a un `<footer>` nativo, con una fila de objetos de core dentro.

- `.luz-cms-footer`: En `<footer>`: una línea arriba, 24 px antes de su fila y 32 px después; la fila distribuye los elementos en ambos extremos y pasa a ser una columna alineada al inicio a 768 px o menos
- `.o-container.o-container--inline.o-row` (core): La fila: el ancho y los márgenes internos de la página, para que su contenido empiece donde empieza el contenido principal
- `.o-actions` (core): Los enlaces, como [grupo de acciones](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-actions)

### Cómo funciona
CSS de `@luz-ds/cms` aplicado a los objetos de core. Sin JavaScript; `@luz-ds/site` es opcional.

- cms añade la línea, el espacio alrededor de la fila y la distribución de sus elementos; `.o-container--inline` alinea la fila con el contenido de la página.
- Con `.o-page`, el contenido principal crece y el pie queda abajo aunque la página sea más corta que la ventana.
- A 768 px o menos, la columna no salta de línea y sus elementos permanecen uno debajo del otro.

### Sin JavaScript
No cambia nada: el pie usa HTML y CSS. El [selector de modo de color](https://nandovejer.github.io/luz/es/docs/components/mode-switcher/) que contenga sigue funcionando como grupo de botones de opción.

### Teclado y ARIA
El pie no tiene interacciones propias; sus enlaces mantienen las suyas.

- Un `<footer>` que es hijo directo de `<body>` es el punto de referencia de información del contenido.
- Identifica cada `<nav>` de enlaces con `aria-label` y conserva el mismo orden de enlaces en todas las páginas.

### Cuándo usarlo
Usa el pie al final de todas las páginas de un blog o periódico para indicar quién lo publica y ofrecer algunos enlaces secundarios: correcciones, contacto y declaración de accesibilidad.

### Cuándo no usarlo
No pongas la navegación principal ni nada necesario para completar una tarea en el pie.

- Las secciones van en la [cabecera](https://nandovejer.github.io/luz/es/docs/cms/header/).
- La página de aterrizaje tiene su propio [pie](https://nandovejer.github.io/luz/es/docs/landing/footer/).
