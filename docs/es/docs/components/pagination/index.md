# Paginación

Enlaza a las páginas de una lista que se extiende a lo largo de varias páginas y marca la página actual.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Pagination markup
```html
<nav aria-label="Pagination">
  <ul class="luz-pagination">
    <li><a class="luz-pagination__link" href="/blog/?page=1" rel="prev">Previous</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=1" aria-label="Page 1">1</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=2" aria-label="Page 2" aria-current="page">2</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=3" aria-label="Page 3">3</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=3" rel="next">Next</a></li>
  </ul>
</nav>
```

### Variantes y opciones
No hay modificadores. En pantallas estrechas, la lista ocupa más líneas.

- `.luz-pagination`: La lista: una fila de elementos que salta de línea en pantallas estrechas
- `.luz-pagination__link`: Una página, Anterior o Siguiente: un área interactiva de al menos 44 px
- `aria-current="page"`: Marca la página actual con un relleno sólido y un peso de fuente mayor
- `aria-disabled="true"`: Anterior o Siguiente en los extremos, como `<span>` y no como enlace: color de texto desactivado
- `.luz-pagination__gap`: La «…» de una lista larga: una marca oculta a los lectores de pantalla

### Cómo funciona
Un punto de referencia `<nav>` alrededor de una lista de enlaces, con estilos de `components/pagination.css`. Cada página tiene una dirección propia, así que el servidor la genera y funcionan el botón Atrás, los marcadores y los motores de búsqueda.

Sin JavaScript.

- Los números son enlaces, no botones: al seguir uno, se carga otra página.
- `rel="prev"` y `rel="next"` indican qué enlaces llevan a las páginas anterior y siguiente.
- La página actual es un enlace con `aria-current="page"`, así que se sigue anunciando como enlace y conserva su posición en el orden.
- En la primera o la última página, Anterior o Siguiente es un `<span>` con `aria-disabled="true"`: solo texto, sin parada de foco.
- Conserva el `<nav>`. Algunos navegadores eliminan la semántica de lista de un `<ul>` sin viñetas, y el punto de referencia hace que siga anunciándose como lista; si no hay `<nav>`, añade `role="list"` al `<ul>`.

### Sin JavaScript
No cambia nada: es una lista de enlaces con CSS. Sin CSS, se lee como una lista de enlaces.

### Teclado y ARIA
Pulsa Tab para llegar a cada enlace en orden y Enter para abrirlo.

- Asigna al elemento `<nav>` el nombre «Paginación» con `aria-label`, para distinguirlo de la navegación principal.
- Asigna a un número el nombre «Página 3» con `aria-label`. El número visible sigue formando parte del nombre. `aria-current="page"` indica al lector de pantalla cuál es la página actual, así que no hace falta incluirlo en el nombre.
- Marca el espacio con `aria-hidden="true"`: el lector de pantalla oye las páginas, no los puntos.

### Cuándo usarlo
Usa la paginación cuando una lista sea demasiado larga para una sola página y se pueda acceder a cada página con su propia dirección: resultados de búsqueda, archivo de un blog o tabla de registros.

### Cuándo no usarlo
No uses la paginación para una lista corta ni para los pasos de una tarea.

- Para las páginas superiores a la actual, usa [migas de pan](https://nandovejer.github.io/luz/es/docs/components/breadcrumb/).
- Para las secciones de una página, usa [pestañas](https://nandovejer.github.io/luz/es/docs/components/tabs/).
- Si tienes un flujo que se carga al desplazarse, ofrece también un enlace a la página siguiente: es la única versión a la que pueden llegar quienes usan teclado o lector de pantalla.
