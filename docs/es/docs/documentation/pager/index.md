# Navegación entre páginas

Dos bloques de enlaces al final de una página, uno a la página anterior y otro a la siguiente, cada uno con el título de la página a la que lleva.

### Problemas conocidos
No se conocen.

### Copiar el marcado
Una lista de uno o dos bloques dentro de una zona de navegación:

Pager markup
```html
<nav aria-label="Previous and next page">
  <ul class="luz-docs-pager">
    <li class="luz-docs-pager__prev"><a class="luz-docs-pager__link" rel="prev" href="/install/"><span class="luz-docs-pager__label">Previous</span> <span class="luz-docs-pager__title">Install the tool</span></a></li>
    <li class="luz-docs-pager__next"><a class="luz-docs-pager__link" rel="next" href="/deploy/"><span class="luz-docs-pager__label">Next</span> <span class="luz-docs-pager__title">Deploy to production</span></a></li>
  </ul>
</nav>
```

### Variantes y opciones
No hay modificadores. Cada elemento indica en qué lado está.

- `.luz-docs-pager`: En un `<ul>`: dos columnas iguales con separación y sin viñetas. Una columna a 640px o menos
- `.luz-docs-pager__prev`: En el primer `<li>`: la primera columna
- `.luz-docs-pager__next`: En el segundo `<li>`: la segunda columna, con el texto al final. Se mantiene ahí cuando no hay una página anterior
- `.luz-docs-pager__link`: En el `<a>`: todo el bloque es un enlace, con borde y relleno. Al pasar el cursor cambian el borde y la superficie, y se subraya el título
- `.luz-docs-pager__label`: «Anterior» o «Siguiente», en tamaño pequeño y con el color secundario
- `.luz-docs-pager__title`: El título de la página a la que lleva, más grande, en seminegrita y con el color de los enlaces

### Cómo funciona
CSS de `@luz-ds/docs`. Define los bloques; tú decides el orden de las páginas.

- Los dos bloques tienen el mismo tamaño y todo el bloque es el área de activación, así que resulta fácil hacer clic o tocarlo.
- La primera página solo tiene «Siguiente» y la última solo «Anterior»: omite el otro `<li>`. Si solo hay «Siguiente», permanece al final de la segunda columna.
- Cada enlace tiene `rel="prev"` o `rel="next"` y un nombre que empieza por el texto visible: «Anterior: Instalar la herramienta».
- El título nunca se acorta: si es largo, se ajusta dentro del bloque.

### Sin JavaScript
No cambia nada. Son dos enlaces y el paquete no incluye ningún script.

### Teclado y ARIA
- **Orden:** primero «Anterior» y después «Siguiente», como en el código fuente. Con Tab llegas a cada enlace y con Enter lo abres.
- **Nombres:** el `<nav>` se llama «Página anterior y siguiente». El nombre de cada enlace coincide con su texto visible («Anterior: Instalar la herramienta»), así que quien oiga «pulsa Anterior» podrá encontrarlo (WCAG 2.5.3). No añadas un `aria-label` que lo sustituya.
- **Zona de referencia:** usa un único bloque de navegación entre páginas en cada página. Si hay otro `<nav>`, necesita un nombre distinto.

### Cuándo usarlo
Usa la navegación entre páginas al final del contenido para que, al terminar una página, quien lee pueda ir a la siguiente según el orden que hayas elegido.

- Páginas que se leen en orden: una guía, un tutorial o los capítulos de un manual.
- Después del contenido y antes del pie de página.

### Cuándo no usarlo
No uses la navegación entre páginas cuando las páginas no tengan un orden ni para las páginas de una lista de resultados.

- La barra lateral ya incluye todas las páginas. La navegación entre páginas indica el siguiente paso, no muestra todo el mapa.
- Para las páginas de una lista o tabla, usa la [paginación](https://nandovejer.github.io/luz/es/docs/components/pagination/), que incluye números de página.
