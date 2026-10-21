# Qué hacer y qué no

Un ejemplo que seguir y otro que evitar, cada uno con su motivo, colocados uno al lado del otro cuando hay espacio.

### Problemas conocidos
En los navegadores sin texto alternativo para el contenido generado (Safari anterior a 17.4, Firefox anterior a 128), un lector de pantalla puede leer la marca de verificación o la cruz antes de «Hazlo» o «No lo hagas». La palabra siguiente siempre se lee.

No se ha probado con un lector de pantalla.

### Copiar el marcado
Una pareja: primero lo que hay que hacer y después lo que no. Cada ejemplo es una figura cuyo pie explica el motivo:

Do and don't markup
```html
<div class="luz-docs-dodont">
  <figure class="luz-docs-dodont__item luz-docs-dodont__item--do">
    <figcaption><strong class="luz-docs-dodont__verdict">Do</strong> Title a page for what it lets the reader do.</figcaption>
    <div class="luz-docs-dodont__stage" inert aria-hidden="true">
      <h3>Install the command line tool</h3>
    </div>
  </figure>
  <figure class="luz-docs-dodont__item luz-docs-dodont__item--dont">
    <figcaption><strong class="luz-docs-dodont__verdict">Don't</strong> Use a title that fits any page: "Introduction" tells the reader nothing.</figcaption>
    <div class="luz-docs-dodont__stage" inert aria-hidden="true">
      <h3>Introduction</h3>
    </div>
  </figure>
</div>
```

### Variantes y opciones
Un bloque, sus partes y dos modificadores para los dos veredictos.

- `.luz-docs-dodont`: En un `<div>`: la pareja, en columnas de al menos 17.5rem. Una al lado de la otra si hay espacio; apiladas por debajo
- `.luz-docs-dodont__item`: En cada `<figure>`: un recuadro con marco, pie y ejemplo visual
- `.luz-docs-dodont__item--do`: Un marco continuo en el color de éxito
- `.luz-docs-dodont__item--dont`: Un marco discontinuo en el color de peligro
- `.luz-docs-dodont__verdict`: En un `<strong>` al principio del pie: «Hazlo» o «No lo hagas», del color del marco y con una marca de verificación o una cruz delante
- `.luz-docs-dodont__stage`: El ejemplo visual: un recuadro con borde sobre la superficie de la página. Asígnale `inert` y `aria-hidden="true"`. Si el error supondría una barrera, usa un `pre.luz-code-block` en su lugar

### Cómo funciona
CSS de `@luz-ds/docs`. Muestra el veredicto de tres maneras; el texto lo escribes tú.

- El veredicto se expresa primero con una palabra. La marca de verificación o la cruz, el marco continuo o discontinuo y el color son indicaciones adicionales; ninguna se usa por sí sola.
- La marca de verificación y la cruz son contenido generado con alternativa vacía, así que el lector de pantalla no las lee.
- El ejemplo visual es inerte y está oculto para las tecnologías de asistencia: es una imagen y el pie explica qué muestra. Nada de lo que contiene recibe el foco ni se anuncia.
- Un error que supondría una barrera si se mostrara en vivo, como un contraste bajo o una semántica incorrecta, se presenta como código en un `pre.luz-code-block`, nunca como ejemplo visual activo.
- Escribe primero qué hacer y después qué no. Una página puede tener varias parejas, una tras otra.

### Sin JavaScript
No cambia nada. El atributo del ejemplo visual lo hace inerte y la pareja usa CSS.

### Teclado y ARIA
- **Orden:** primero lo que hay que hacer y después lo que no. Cada ejemplo es un `<figure>` con un `<figcaption>`, que se lee como pie de la imagen.
- **Ejemplo visual:** `inert` impide que reciba el foco o los clics, y `aria-hidden="true"` lo oculta del árbol de accesibilidad. No pongas dentro enlaces ni campos que quien lee deba usar.
- **Ejemplo de código:** un `pre.luz-code-block` conserva `tabindex="0"` y `aria-label` cuando se desplaza.

### Cuándo usarlo
Usa ejemplos de qué hacer y qué no para enseñar una regla mediante el contraste: quien lee ve la forma correcta junto a la incorrecta.

- Una lección más fácil de mostrar que de explicar, como un título, una etiqueta o un espaciado.
- Una pareja por lección, y el ejemplo de lo que no hay que hacer refleja un error real.

### Cuándo no usarlo
No lo uses para una regla sin nada con lo que compararla ni para mostrar un elemento que funciona.

- Para mostrar el aspecto y la estructura de un elemento, usa [el ejemplo](https://nandovejer.github.io/luz/es/docs/documentation/example/).
- No inventes un error que nadie comete para rellenar el ejemplo de lo que no hay que hacer.
- No muestres un fallo activo. Los fallos de contraste o semántica se presentan como código.
