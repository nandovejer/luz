# Cabecera de artículo

Presenta un artículo con su sección, título, entradilla, autor y fecha, y una imagen opcional al principio.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Article header markup
```html
<header class="luz-cms-article-header">
  <p class="luz-cms-article-header__kicker"><a href="/coast/">Coast</a></p>
  <h1 class="luz-cms-article-header__title">What ten years of tide records say about the bay</h1>
  <p class="luz-cms-article-header__standfirst">Volunteers have read the gauge in the port twice a day since 2016. The sea is four centimetres higher, and winter storms now reach the old town's walls.</p>
  <div class="luz-cms-article-header__byline">
    <span class="luz-avatar luz-avatar--lg"><img src="/authors/ana-ruiz-96.jpg" width="48" height="48" alt=""></span>
    <div>
      <p>By <a href="/authors/ana-ruiz/">Ana Ruiz</a></p>
      <p class="luz-meta"><time datetime="2026-10-12">12 October 2026</time> <span>6 min read</span></p>
    </div>
  </div>
  <figure class="luz-cms-article-header__media">
    <div class="luz-image">
      <img src="/img/tide-gauge-1280.jpg" width="1280" height="720" alt="A green gauge post marked in centimetres, standing in shallow water by a stone quay" fetchpriority="high" decoding="async">
    </div>
    <figcaption>The tide gauge in the port, at low tide. Photo: Ana Ruiz.</figcaption>
  </figure>
</header>
```

### Variantes y opciones
No hay modificadores. Solo el título es obligatorio: omite las partes que no tengas.

- `.luz-cms-article-header`: El bloque: sus partes, separadas 12 px entre sí y con 32 px de espacio debajo
- `.luz-cms-article-header__kicker`: La sección, encima del título, en versalitas con la tipografía monoespaciada, como el antetítulo del [hero](https://nandovejer.github.io/luz/es/docs/landing/hero/). Opcional
- `.luz-cms-article-header__title`: El título: tipografía de encabezado, tamaño 3xl, peso ligero y líneas equilibradas; 2xl a 640 px o menos
- `.luz-cms-article-header__standfirst`: Una o dos frases en el color de texto secundario, un tamaño mayor que el texto del cuerpo y un máximo de 70 caracteres de ancho. Opcional
- `.luz-cms-article-header__byline`: Una fila con la tipografía sans que puede saltar de línea: un [avatar](https://nandovejer.github.io/luz/es/docs/components/avatar/), el autor y una [línea de metadatos](https://nandovejer.github.io/luz/es/docs/components/meta/) con la fecha. Opcional
- `.luz-cms-article-header__media`: Un `<figure>` sin panel alrededor, para un [marco de imagen](https://nandovejer.github.io/luz/es/docs/components/image/) y su pie. Opcional

### Cómo funciona
Una cuadrícula de una columna, con estilos de `@luz-ds/cms` en `cms.css`, que se carga después de `site.css`. Sin JavaScript.

- Cada parte aplica sus estilos al texto mediante la herencia, así que puedes poner la clase en el elemento que contiene el texto o en un contenedor. Una plantilla de CMS que envuelve la entradilla en un `<div>` funciona igual que un `<p>` sin contenedor. En una plantilla de bloques de WordPress, asigna a cada bloque su clase en `className`.
- El antetítulo es un enlace si las secciones tienen página propia; si no, es texto sin enlace. El título debe ser el `<h1>` de la página; las clases solo cambian su aspecto.
- La imagen inicial usa el [marco de imagen](https://nandovejer.github.io/luz/es/docs/components/image/) de core: mantiene su proporción y muestra una superficie plana hasta que se carga. No le asignes `loading="lazy"`: está cerca del principio de la página.
- La fecha visible es un `<time>` con un `datetime` legible por máquinas. Si el artículo se actualiza después de publicarse, añade una segunda línea: `Updated <time datetime="…">…</time>`.

### Sin JavaScript
No cambia nada: la cabecera del artículo usa HTML y CSS.

### Teclado y ARIA
La cabecera no tiene interacciones propias: al pulsar Tab se llega primero al enlace del antetítulo y después al del autor.

- El título `<h1>` permite encontrar el artículo en la lista de encabezados del lector de pantalla. El antetítulo aparece antes en el código fuente, igual que en pantalla; es breve y no retrasa la lectura del título.
- Dentro de `<article>`, `<header>` no es un punto de referencia; no necesita etiqueta.
- El avatar que aparece junto al nombre del autor es decorativo: las iniciales llevan `aria-hidden="true"` y la foto, `alt=""`.

### Cuándo usarlo
Usa una cabecera de artículo al principio de una noticia, una entrada o un reportaje: una página con autor y fecha que se lee de principio a fin.

### Cuándo no usarlo
No la uses en una página sin autor ni fecha, como una página de contacto o de sección: usa la [cabecera de página](https://nandovejer.github.io/luz/es/docs/cms/page-header/).

- Para el primer bloque de una página de inicio o de aterrizaje, usa el [hero](https://nandovejer.github.io/luz/es/docs/landing/hero/).
- Para un artículo de una lista, usa una [tarjeta de artículo](https://nandovejer.github.io/luz/es/docs/cms/templates/#post-card): la cabecera es para la página del artículo.
