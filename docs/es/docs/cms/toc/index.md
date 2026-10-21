# Índice

Enumera las secciones de un artículo largo, junto al texto cuando hay espacio y encima cuando no lo hay.

### Problemas conocidos
La marca de la sección visible necesita el script de core; sin él, no se marca ningún enlace. Junto al texto, el índice queda en el extremo en línea, pero aparece primero en el código fuente, así que Tab llega a él antes que al texto.

Aún no se ha probado con un lector de pantalla.

### Copiar el marcado
Table of contents markup
```html
<article class="luz-cms-article">
  <header class="luz-cms-article-header">…</header>
  <div class="luz-cms-article__layout">
    <nav class="luz-cms-toc" aria-labelledby="toc-title" data-luz-spy>
      <h2 class="luz-cms-toc__title" id="toc-title">Contents</h2>
      <ol class="luz-cms-toc__list">
        <li><a href="#method">How the readings were taken</a></li>
        <li><a href="#level">Four centimetres in ten years</a></li>
        <li><a href="#storms">Storms that reach the walls</a></li>
      </ol>
    </nav>
    <div class="luz-prose">
      <p>Since March 2016, a group of volunteers has read the tide gauge…</p>
      <h2 id="method">How the readings were taken</h2>
      <p>…</p>
      <h2 id="level">Four centimetres in ten years</h2>
      <p>…</p>
      <h2 id="storms">Storms that reach the walls</h2>
      <p>…</p>
    </div>
  </div>
</article>
```

### Variantes y opciones
No hay modificadores. El índice es opcional: si se omite, el texto ocupa la primera columna.

- `.luz-cms-article`: El artículo: su ancho determina la maquetación, no el de la ventana (contenedor de tamaño)
- `.luz-cms-article__layout`: El índice y, después, el texto. Cuando el artículo mide al menos 46rem: el texto va en la primera columna y el índice en una columna de 13rem al extremo en línea, con 48 px de separación; por debajo, se usa una columna
- `.luz-cms-toc`: El `<nav>`. Junto al texto permanece visible mientras este se desplaza, y una lista más alta que la ventana se desplaza por dentro
- `data-luz-spy` en `.luz-cms-toc`: El seguimiento de desplazamiento de core marca el enlace de la sección visible. Opcional
- `.luz-cms-toc__title`: El encabezado del índice, en sans y seminegrita
- `.luz-cms-toc__list`: La lista, sin marcadores y con una línea en el inicio en línea; un enlace por línea
- `--luz-cms-toc-top`: El espacio sobre el índice mientras permanece visible: 24 px, o 24 px por debajo de una barra fija (el `.o-sticky` de core, una fila de `--luz-bar-h`, como la [cabecera](https://nandovejer.github.io/luz/es/docs/cms/header/)). Si la cabecera tiene otra altura, asígnalo a `.luz-cms-toc`

### Cómo funciona
Una cuadrícula CSS dentro de un contenedor de tamaño, de `@luz-ds/cms`. No necesita JavaScript propio.

- La maquetación se adapta al espacio del artículo: en una página con barra lateral o con texto más grande, el índice pasa antes encima del texto. Por debajo de 46rem es una lista normal encima del texto y no permanece visible, porque lo taparía.
- El índice aparece primero en el código fuente, así que se lee primero y Tab llega a él antes en ambas maquetaciones. El texto es un elemento único, segundo hijo de `__layout`; en un CMS, es el elemento que contiene el artículo.
- Cada enlace apunta al `id` del encabezado de una sección. La mayoría de CMS pueden generar esos ids; en WordPress, usa el ancla HTML de cada bloque de encabezado.
- Con el script de core (`luz.js` o `initSidebar()` de `@luz-ds/core/sidebar`), el enlace de la sección visible recibe `aria-current="true"`, que dibuja una barra y lo muestra en seminegrita. El script localiza los enlaces mediante el atributo `data-luz-spy` en `<nav>`: todos los enlaces internos a secciones de la página.

### Sin JavaScript
El índice es una lista de enlaces a las secciones a las que se desplaza el navegador. El script solo hace falta para marcar la sección visible; sin él, no se marca ningún enlace.

### Teclado y ARIA
Tab recorre los enlaces en orden; Enter sigue uno. El navegador mueve el foco y se desplaza hasta la sección.

- Un `<nav>` identificado por su encabezado: quienes usan lector de pantalla lo encuentran en la lista de puntos de referencia como «Contenido». Usa `<ol>`: las secciones tienen un orden.
- `aria-current="true"` identifica la sección visible; el script lo actualiza. Sin el script, ninguna sección aparece como actual.
- Debajo de una cabecera fija, el relleno de desplazamiento de `.o-sticky` de core evita que la cabecera tape el encabezado de la sección al seguir un enlace.

### Cuándo usarlo
Usa un índice en un artículo con cuatro o más secciones, que se lea por partes o se consulte varias veces: una guía, un informe o una entrevista larga.

### Cuándo no usarlo
No lo uses en una entrada corta: tres párrafos no necesitan un mapa.

- No sirve para enlazar a otras páginas: eso es navegación y va en la [cabecera](https://nandovejer.github.io/luz/es/docs/cms/header/) o en una [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/).
- Tampoco sirve para los pasos ordenados de una tarea: numéralos en el texto.
