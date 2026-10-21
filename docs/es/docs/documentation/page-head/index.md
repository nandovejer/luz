# Cabecera de página

La parte superior de una página de documentación: el epígrafe, el título, una frase y las etiquetas que indican de qué trata.

### Problemas conocidos
No se conocen.

### Copiar el marcado
La cabecera, como primer elemento hijo del contenido:

Page head markup
```html
<header class="luz-docs-page-head">
  <p class="luz-docs-page-head__eyebrow">Guides · Setup</p>
  <h1>Install the command line tool</h1>
  <p class="luz-docs-page-head__lead">Add the tool to a project and check that it runs, in about two minutes.</p>
  <ul class="luz-docs-page-head__meta">
    <li>Version 2</li>
    <li>macOS, Linux and Windows</li>
    <li><a href="#known-issues">No known issues</a></li>
  </ul>
</header>
```

### Variantes y opciones
No hay modificadores. La cabecera es una clase aplicada a un `<header>` nativo con cuatro partes.

- `.luz-docs-page-head`: En un `<header>` del contenido: una columna, con separación entre sus partes y espacio debajo. Su `h1` usa `--luz-text-4xl`, o `--luz-text-2xl` a 640px o menos
- `.luz-docs-page-head__eyebrow`: En un `<p>`: el área y el grupo, en mayúsculas pequeñas espaciadas y con el color secundario. Si incluye un `<code>` con el nombre de un paquete, este conserva sus mayúsculas y minúsculas. En árabe se omite el espaciado entre letras
- `.luz-docs-page-head__lead`: En un `<p>`: una frase en color secundario y con un tamaño mayor que el del texto
- `.luz-docs-page-head__meta`: En un `<ul>`: las etiquetas. Cada `<li>` contiene una o dos palabras dentro de un contorno redondeado y mide al menos `--luz-control-sm` (28px) de alto. Los enlaces que contienen tienen la misma altura
- `.luz-docs-page-head__files`: En un `<p>`, en lugar de las etiquetas y solo en páginas que no sean de componentes: «Archivos:» y cada archivo dentro de un `<code>`, en una línea pequeña de color secundario

### Cómo funciona
CSS de `@luz-ds/docs`. Define el ritmo y los tamaños; las palabras las eliges tú.

- La cabecera es una cuadrícula de una columna. La separación entre las partes es `--luz-space-sm` y el espacio debajo de la cabecera es `--luz-space-xl`.
- El `h1` es un elemento sin clase dentro de la cabecera; esta le aplica estilos según su posición.
- Las etiquetas enumeran los datos que alguien quiere saber antes de leer: qué archivos y scripts se usan, qué modos hay, si se ha probado y si se conocen problemas. Si una etiqueta lleva a otro sitio, es un enlace.
- Las palabras largas de las etiquetas se parten en lugar de ensanchar la página, de modo que las etiquetas se ajustan a 320px.

### Sin JavaScript
No cambia nada. La cabecera contiene texto y enlaces; el paquete no incluye ningún script.

### Teclado y ARIA
- **Orden:** el del código fuente: epígrafe, título, entradilla y, después, las etiquetas. Con Tab solo llegas a los enlaces de las etiquetas.
- **Encabezados:** el `h1` es el único `h1` de la página. Un `<header>` dentro de `<main>` no es una zona de referencia de tipo banner.
- **Etiquetas:** una lista de elementos sencillos que se anuncia como lista. Una etiqueta sin enlace es texto y no recibe el foco.

### Cuándo usarlo
Usa la cabecera en la parte superior de todas las páginas de un sitio de documentación, para que el título y el tema de la página estén siempre en el mismo sitio.

- Una frase que explique qué permite hacer la página.
- Unas cuantas etiquetas con los datos que ayudan a decidir si seguir leyendo.

### Cuándo no usarlo
No uses la cabecera para el banner del sitio: contiene el `h1` de la página.

- Usa una sola cabecera por página. Una sección de una página larga lleva un `h2`, no otra cabecera.
- Para la cabecera de un artículo de blog, usa la [cabecera de artículo de CMS](https://nandovejer.github.io/luz/es/docs/cms/article-header/).
- Una página de landing empieza con el [hero](https://nandovejer.github.io/luz/es/docs/landing/hero/).
