# Cabecera de página

Da título y una frase explicativa a una página que no sea un artículo, como «Acerca de» o «Contacto».

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Page header markup
```html
<div class="luz-cms-page-header">
  <h1 class="luz-cms-page-header__title">About the Review</h1>
  <p class="luz-cms-page-header__lead">An independent paper for Vejer and the coast, paid for by its readers.</p>
</div>
```

### Variantes y opciones
No hay modificadores. La entradilla es opcional.

- `.luz-cms-page-header`: El bloque, con 32 px de espacio debajo
- `.luz-cms-page-header__title`: El título: tipografía de encabezado, tamaño 3xl y peso ligero; 2xl a 640 px o menos
- `.luz-cms-page-header__lead`: Un párrafo en el color de texto secundario, con un máximo de 600 px de ancho

### Cómo funciona
Un contenedor con título y entradilla, con estilos de `@luz-ds/cms`. Sin JavaScript; `@luz-ds/site` es opcional.

- Las clases solo cambian el aspecto. El título debe ser el `<h1>` de la página.
- En árabe, el título no tiene espaciado entre letras, ya que separaría los caracteres unidos de la escritura.
- Los artículos usan la [cabecera de artículo](https://nandovejer.github.io/luz/es/docs/cms/article-header/), con su sección, entradilla y firma.

### Sin JavaScript
No cambia nada: la cabecera de página usa HTML y CSS.

### Teclado y ARIA
La cabecera de página no tiene interacciones.

- El título `<h1>` permite encontrar el título de la página en la lista de encabezados del lector de pantalla.
- Ponla dentro de `<main>` para que el enlace para saltar al contenido lleve justo antes de ella.

### Cuándo usarlo
Usa una cabecera de página al principio de una página de blog o periódico que no sea un artículo (Acerca de, Contacto o el índice de una sección) para darle título y explicar su propósito en una frase.

### Cuándo no usarlo
No la uses para una sección dentro de la página: usa un encabezado normal del nivel adecuado.

- Una cabecera de página por página.
- Los artículos usan la [cabecera de artículo](https://nandovejer.github.io/luz/es/docs/cms/article-header/), que incluye autor y fecha.
