# Línea de metadatos

Muestra en una línea algunos datos sobre un elemento, como la fecha, el tiempo de lectura y el autor, separados por puntos.

### Problemas conocidos
Los lectores de pantalla ocultan los puntos mediante texto alternativo para el contenido generado, compatible con Firefox desde la versión 128 y con Safari desde la 17.4. En navegadores anteriores, el lector de pantalla lee cada punto.

Aún no se ha probado con un lector de pantalla.

### Copiar el marcado
Meta line markup
```html
<p class="luz-meta">
  <span>By <a href="/authors/ana-ruiz/">Ana Ruiz</a></span>
  <time datetime="2026-10-12">12 October 2026</time>
  <span>6 min read</span>
</p>
```

### Variantes y opciones
No hay modificadores.

- `.luz-meta`: La línea: datos en una fila que salta de línea, con tipografía sans y el color de texto secundario
- Cada elemento secundario: Un dato: un elemento `<time>`, un enlace o un `<span>` de texto. Antes de cada elemento, salvo el primero, aparece un punto

### Cómo funciona
Solo CSS, en `components/meta.css`: una fila flexible que salta de línea y un punto dibujado con `::before` en cada dato después del primero.

- El punto queda en el espacio anterior al dato. La línea recorta los bordes inicial y final, de modo que, si un dato salta al principio de una línea nueva, su punto queda fuera: ninguna línea empieza con un punto.
- La línea tiene 4 px de relleno en cada extremo, espacio para el anillo de foco de un enlace dentro del recorte y un margen negativo del mismo tamaño, para que sus líneas de texto queden alineadas con el texto anterior.
- El punto se escribe como `content: "·" / ""`: un texto alternativo vacío para que los lectores de pantalla no lo lean.
- No hay ningún elemento posicionado, así que, en una tarjeta cuyo enlace de título cubra toda la tarjeta, esta sigue siendo un único enlace.

### Sin JavaScript
No cambia nada: la línea de metadatos está hecha con CSS. Sin CSS, los datos se unen en una sola línea con los espacios del marcado: deja un espacio o un salto de línea entre los elementos.

### Teclado y ARIA
La línea no recibe el foco ni añade ningún rol. Pulsa Tab para llegar a los enlaces que contiene, en orden.

- El lector de pantalla lee los datos uno tras otro, sin los puntos. Escribe cada dato para que tenga sentido por sí solo: «6 min de lectura», no «6».
- Asigna a las fechas un elemento `<time datetime>` para que el software pueda leerlas.

### Cuándo usarlo
Usa una línea de metadatos para mostrar entre dos y cuatro datos breves sobre una entrada, una historia o un elemento: el autor, la fecha, el tiempo de lectura o la sección.

### Cuándo no usarlo
No la uses para una frase ni para datos que haya que comparar entre varios elementos.

- Los datos con etiquetas, como un precio y una talla, van en una lista de descripciones (`<dl>`) o en una [tabla](https://nandovejer.github.io/luz/es/docs/components/table/).
- Una ruta de páginas es una [miga de pan](https://nandovejer.github.io/luz/es/docs/components/breadcrumb/); un conjunto de etiquetas es una fila de [etiquetas](https://nandovejer.github.io/luz/es/docs/components/tag/).
