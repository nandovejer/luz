# Texto corrido

Establece líneas de unos 70 caracteres y espacio entre bloques de texto largo, sea cual sea el marcado que escriba el editor.

### Problemas conocidos
Una tabla sin contenedor que sea más ancha que la columna desplaza la página lateralmente en pantallas estrechas. Coloca las tablas anchas en el contenedor de tablas de core, [table](https://nandovejer.github.io/luz/es/docs/components/table/), `.luz-table-wrap`, que permite desplazarse por su interior.

Aún no se ha probado con un lector de pantalla.

### Copiar el marcado
Prose markup
```html
<div class="luz-prose">
  <!-- What the editor or the Markdown writes, as it is -->
  <p>Since March 2016, a group of volunteers has read the tide gauge…</p>
  <h2 id="method">How the readings were taken</h2>
  <p>…</p>
  <ul class="wp-block-list">
    <li>…</li>
  </ul>
  <figure>
    <img src="gauge.jpg" width="1200" height="800" alt="The tide gauge in the port, a post marked in centimetres">
    <figcaption>The gauge at low tide.</figcaption>
  </figure>
</div>
```

### Variantes y opciones
No hay modificadores.

- `.luz-prose`: En el elemento que contiene el texto: líneas de unos 70 caracteres, espacio entre bloques, sangría y viñetas para las listas, y el código integrado con aspecto de ficha
- `--luz-prose-measure`: El ancho máximo de línea, `70ch` de forma predeterminada. Establécelo en el contenedor entre `60ch` y `80ch`
- `data-luz-classless` en el mismo elemento: Con el [modo classless](https://nandovejer.github.io/luz/es/docs/get-started/classless/) cargado, sus tablas, botones y campos adoptan el aspecto de los componentes de core.

### Cómo funciona
Solo CSS, en `components/prose.css`. Todos los selectores están dentro de `:where()`, así que prevalece un componente de LUZ dentro del texto o una regla tuya.

- **Longitud de línea.** Cada bloque del contenedor tiene como máximo la anchura de `--luz-prose-measure`. Las figuras, tablas, bloques de código, imágenes, vídeos y `.luz-table-wrap` ocupan todo el ancho del contenedor, pero no lo superan.
- **Espacio entre bloques.** Cada bloque empieza `--luz-space-md` por debajo del anterior. Los encabezados y las líneas separadoras empiezan más abajo (`--luz-space-xl`), y el bloque posterior a un encabezado queda más cerca (`--luz-space-sm`). Se usan márgenes, no una separación: los componentes conservan sus propios márgenes y los dos se combinan.
- **Listas.** Todas las listas recuperan su sangría y sus viñetas, con o sin clase (por ejemplo, la lista `ul.wp-block-list` de un editor), salvo las que tengan un objeto de maquetación (`.o-grid`, `.o-stack`) o una clase de componente de LUZ.
- **Código integrado** tiene el aspecto de `.luz-code-inline`. Las palabras y direcciones largas saltan de línea en vez de desplazar la página lateralmente.
- **Modo classless** aplica la misma separación de tres pasos entre bloques, así que ambos modos coinciden; el texto corrido está en una capa posterior y prevalece donde se superponen. El texto corrido establece la longitud de línea y las listas; el modo classless, el aspecto de las tablas y los controles.

### Sin JavaScript
No cambia nada: el texto corrido se crea con CSS.

### Teclado y ARIA
El texto corrido no recibe el foco ni añade un rol. Pulsa Tab para llegar a los enlaces y controles que contiene, en el orden de origen.

- Un `<pre>` largo se desplaza lateralmente por su interior. Para recorrerlo con el teclado, asígnale `tabindex="0"`, `role="region"` y un nombre, como hace el [bloque de código](https://nandovejer.github.io/luz/es/docs/components/code/) de core.
- Los encabezados internos crean el esquema del texto: empieza en el nivel posterior al título de la página y no te saltes ninguno.

### Cuándo usarlo
Usa el texto corrido alrededor de texto continuo cuyo marcado no escribes bloque a bloque: el cuerpo de una entrada o de una página de un editor de CMS, Markdown o un artículo de ayuda.

### Cuándo no usarlo
No lo apliques a toda una página ni a una interfaz: la cabecera, la navegación, los formularios y las tarjetas se organizan por sí solos.

- Para una columna de bloques que construyas tú, usa [`.o-stack`](https://nandovejer.github.io/luz/es/docs/components/layout/).
- Para una o dos líneas dentro de un componente, como el texto de una tarjeta, usa las clases del propio componente.
