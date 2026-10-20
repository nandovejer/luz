# Índice lateral

La lista de secciones de una página que permanece visible junto al contenido, con las acciones de la página debajo.

### Problemas conocidos
Sin el script de core, ningún enlace aparece marcado como actual, aunque los enlaces siguen funcionando. No se ha probado con un lector de pantalla.

### Copiar el marcado
El índice lateral como hijo directo de la estructura, entre la barra lateral y el contenido:

Rail markup
```html
<aside class="luz-docs-rail" aria-label="About this page">
  <div class="luz-docs-rail__inner">
    <nav class="luz-docs-rail__onpage" aria-labelledby="onpage-title">
      <details class="luz-docs-rail__fold" open>
        <summary class="luz-docs-rail__title" id="onpage-title">On this page</summary>
        <ul class="luz-docs-rail__list">
          <li><a class="luz-sidebar__link luz-docs-rail__link" href="#install">Install</a></li>
          <li><a class="luz-sidebar__link luz-docs-rail__link" href="#configure">Configure</a>
            <ul class="luz-docs-rail__sub">
              <li><a class="luz-sidebar__link luz-docs-rail__link" href="#config-file">The config file</a></li>
            </ul>
          </li>
        </ul>
      </details>
    </nav>
    <div class="luz-docs-rail__actions">
      <a href="https://example.com/docs/install.md">Copy page as Markdown</a>
      <a href="https://example.com/edit/install.md">Edit this page</a>
      <a href="https://example.com/issues/new">Report a problem</a>
    </div>
  </div>
</aside>
```

### Variantes y opciones
No hay modificadores. El índice lateral es un `<aside>` que contiene una caja con dos bloques: la lista y las acciones.

- `.luz-docs-rail`: En un `<aside>`: la tercera columna de la [estructura](https://nandovejer.github.io/luz/es/docs/documentation/shell/) a partir de 80rem, tan alta como el contenido; por debajo de ese ancho, aparece encima del contenido
- `.luz-docs-rail__inner`: En un `<div>`, único hijo del índice lateral, que contiene la lista y las acciones: a partir de 80rem es una caja fija dentro del índice, así nunca tapa el pie y se desplaza por sí sola, con espacio al principio para el anillo de foco
- `.luz-docs-rail__onpage`: En el `<nav>` de la lista, hijo directo de `__inner`: limita el reinicio del plegado y su título, y sirve de anclaje para un script
- `.luz-docs-rail__fold`: En un `<details>` nativo. Escribe `open` para que la lista se muestre sin script. Cuando el índice lateral está encima del contenido, un script puede cerrarlo al cargar la página
- `.luz-docs-rail__title`: En `<summary>`: «En esta página», en seminegrita. Es el nombre del `<nav>`
- `.luz-docs-rail__list`: En el `<ul>`: sin viñetas y con una línea al principio
- `.luz-docs-rail__link` junto con `.luz-sidebar__link`: En cada `<a>`: texto de la página, con 28px de alto. El enlace marcado con `aria-current="true"` tiene un borde al principio en el color de marca
- `.luz-docs-rail__sub`: En un `<ul>` anidado: el `h3` de un `h2`, con sangría
- `.luz-docs-rail__actions`: Una columna de enlaces bajo una línea: copiar, editar e informar

### Cómo funciona
CSS de `@luz-ds/docs` sobre el enlace de la barra lateral y su seguimiento del desplazamiento de core.

- Por debajo de 80rem, el índice lateral aparece encima del contenido, bajo la cabecera. A partir de 80rem ocupa una columna tan alta como el contenido, y su caja interior queda fija a `--luz-docs-rail-top` desde la parte superior de la ventana: se detiene al final del índice y nunca tapa el pie. La caja interior no supera la altura de la ventana y se desplaza por sí sola si la lista es más larga.
- Los enlaces usan `.luz-sidebar__link` de core, así que su script marca la sección visible con `aria-current="true"`. El índice lateral representa el enlace como texto de la página: la marca combina el grosor y un borde al principio, nunca depende solo del color.
- La lista incluye cada `h2` de la página y, debajo, cada `h3`. No hay más niveles de anidación.
- «Copiar la página como Markdown» es un enlace al archivo Markdown de la página; te corresponde implementar su copia con un script. El índice lateral no se imprime.

### Sin JavaScript
La lista y las acciones son enlaces, y el elemento `<details>` nativo funciona sin JavaScript. Ningún enlace aparece marcado como actual: esa marca la añade el script de core.

### Teclado y ARIA
- **Orden:** el índice lateral aparece entre la barra lateral y el contenido en el código fuente, así que con Tab llegas a él antes que al texto: primero la lista y después las acciones. El enlace para saltar va al contenido, pasando por encima del índice.
- **Teclas:** pulsa Enter o Espacio en «En esta página» para plegar la lista. Con Tab llegas a cada enlace; con Enter vas a su sección.
- **Nombres:** el `<aside>` es una zona de referencia llamada «Acerca de esta página»; el `<nav>` recibe el nombre de su resumen: «En esta página».

### Cuándo usarlo
Usa el índice lateral en páginas con varias secciones para que quien lee vea su estructura y pueda saltar a una de ellas.

- Una página con tres secciones o más, lo bastante larga como para desplazarse.
- Acciones propias de la página, no del sitio: editar, informar y copiar.

### Cuándo no usarlo
No uses el índice lateral en una página corta: leer dos enlaces lleva más que leer la propia página.

- Incluye las secciones de una sola página. Las páginas del sitio van en la barra lateral.
- No anides más allá de un `h3`. Para mostrar el índice junto a un artículo, usa la [tabla de contenidos de CMS](https://nandovejer.github.io/luz/es/docs/cms/toc/).
