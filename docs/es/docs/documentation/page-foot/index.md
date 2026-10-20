# Pie de página

La información breve al pie de una página: cuándo se actualizó por última vez y enlaces para editarla o informar de un problema.

### Problemas conocidos
No se conocen.

### Copiar el marcado
Un párrafo después de la navegación entre páginas:

Page foot markup
```html
<p class="luz-docs-page-foot">Last updated <time datetime="2026-10-17">17 October 2026</time> · <a href="https://example.com/edit/install.md">Edit this page</a> · <a href="https://example.com/issues/new">Report a problem</a></p>
```

### Variantes y opciones
No hay modificadores. El pie es una clase aplicada a un `<p>` nativo.

- `.luz-docs-page-foot`: En un `<p>` bajo el contenido: una línea encima, espacio sobre ella e información breve en la fuente de interfaz y el color secundario. Sus enlaces miden al menos `--luz-control-sm` (28px) de alto

### Cómo funciona
CSS de `@luz-ds/docs`. Define la línea, el tamaño y el color; los datos los pones tú.

- El pie es un párrafo. Se ajusta al texto, así que en una pantalla estrecha los enlaces pasan a la línea siguiente.
- Los puntos medios son texto del marcado, entre la fecha y los enlaces.
- La fecha se incluye en un `<time>` con un `datetime` que puede leer una máquina y la misma fecha escrita con palabras.
- Los enlaces llevan a tu propia página de edición y a tu propia lista de problemas. LUZ no proporciona ninguna de las dos.

### Sin JavaScript
No cambia nada. Es texto con dos enlaces y el paquete no incluye ningún script.

### Teclado y ARIA
- **Orden:** la fecha es texto; con Tab llegas a «Editar esta página» y después a «Informar de un problema».
- **Nombres:** el texto de los enlaces permite entenderlos fuera de contexto. No lo acortes a «Editar» e «Informar».
- **Fecha:** `<time datetime="2026-10-17">` ofrece la fecha en un formato que puede leer el software, junto a la fecha escrita que lee una persona.

### Cuándo usarlo
Usa el pie debajo del contenido de todas las páginas que se mantienen, para que quien lee sepa cuándo se actualizaron y pueda corregirlas.

- Una página que cambia con el tiempo, como una guía o una referencia.
- Un sitio cuyas páginas están en un repositorio, donde «Editar esta página» puede abrir el archivo.

### Cuándo no usarlo
No uses el pie de página para el pie del sitio: pertenece a una página concreta.

- El pie del sitio es un `<footer>`, hijo de la [estructura](https://nandovejer.github.io/luz/es/docs/documentation/shell/).
- No muestres una fecha que no se mantenga actualizada: una fecha incorrecta es peor que no poner ninguna.
