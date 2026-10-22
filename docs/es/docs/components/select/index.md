# Select

Lista desplegable nativa para elegir una opción de una lista larga; el cuadro cerrado está diseñado con tokens.

### Problemas conocidos
La lista abierta se ve distinta en cada navegador y sistema. Es lo esperado.

- El cuadro cerrado es igual en todas partes. La lista que se abre la dibuja el navegador o el sistema operativo y es la que ya conoce quien la usa.
- Los navegadores compatibles con `appearance: base-select` (Chrome y Edge 135 o posterior, Safari 27 o posterior) también muestran la lista con los colores, la forma y el espaciado de LUZ. Firefox muestra su propia lista.
- En los móviles se abre el selector del sistema, que LUZ no puede diseñar.

### Copiar el marcado
Select markup
```html
<div class="luz-field">
  <label class="luz-field__label" for="country">Country</label>
  <select class="luz-select" id="country" name="country">
    <option value="">Select a country</option>
    <option value="de">Germany</option>
    <option value="es">Spain</option>
    <option value="fr">France</option>
  </select>
</div>
```

### Variantes y opciones
Una clase en el propio `<select>`. No hay contenedor ni modificador: el estado depende de los atributos nativos.

- `.luz-select`: El cuadro cerrado: 44 px de alto, con borde inferior y una flecha al final de la línea
- `aria-invalid="true"`: Estado de error: borde más grueso del color de peligro. Acompáñalo del texto de error
- `disabled`: Texto desactivado y borde discontinuo
- `multiple`, `size`: Lista siempre abierta, con borde completo y sin flecha
- `<optgroup label>`: Conjunto de opciones con etiqueta

### Cómo funciona
Un `<select>` nativo diseñado por `components/select.css`, en dos capas. Sin JavaScript.

- **El cuadro cerrado, en todos los navegadores.** El borde, la altura, la tipografía y los colores proceden de tokens. La flecha está hecha con dos degradados en `currentcolor`, así que sigue el color del texto, el estado desactivado y los colores forzados. Está al final en línea y, por eso, pasa a la izquierda en textos de derecha a izquierda.
- **La lista abierta, cuando el navegador lo permite.** Dentro de `@supports (appearance: base-select)` también se diseñan la lista, sus opciones y la marca de verificación. Fuera de esa regla no cambia nada.
- `color-scheme` sigue el modo de color, así que la lista del sistema se abre en el modo adecuado.

### Sin JavaScript
No cambia nada: select es un elemento nativo y LUZ no le añade ningún script.

### Teclado y ARIA
Se aplican las teclas nativas; cuáles abren la lista varía un poco entre sistemas.

- Tab lleva al select. Enter o Espacio abre la lista y Escape la cierra sin hacer cambios.
- Las flechas arriba y abajo recorren las opciones; al escribir las primeras letras, se salta a la coincidencia.
- Añade un `<label for>` visible. No añadas ningún role: el elemento ya tiene semántica propia.
- Si hay un error, establece `aria-invalid="true"` y haz que `aria-describedby` apunte al texto del error.

### Cuándo usarlo
Usa un select cuando la persona tenga que elegir una opción de una lista larga y ya sepa cuál busca.

- Un país, un año o una zona horaria: más de seis opciones y una sola respuesta.
- Las opciones son breves y se pueden recorrer en orden.

### Cuándo no usarlo
Un select oculta las opciones hasta que se abre, lo que a algunas personas les resulta difícil. El [GOV.UK Design System](https://design-system.service.gov.uk/components/select/) recomienda usarlo como último recurso.

La regla de seis es propia de LUZ: esa guía no indica ninguna cifra.

- Con seis opciones o menos, usa [botones de opción](https://nandovejer.github.io/luz/es/docs/components/form/): todas las opciones quedan a la vista.
- Para elegir varias opciones, usa [casillas de verificación](https://nandovejer.github.io/luz/es/docs/components/form/).
- Antes de usar una lista larga, haz una pregunta que permita acortarla.
- No construyas nunca tu propio listbox con elementos `<div>` ni ocultes el select detrás de una copia.
