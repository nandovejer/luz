# Campos de formulario

Recoge datos con campos, opciones y selectores nativos, cada uno con una etiqueta visible, una indicación y un error.

### Problemas conocidos
Ninguno conocido.

### Copiar el marcado
Text field with a hint markup
```html
<div class="luz-field">
  <label class="luz-field__label" for="project-name">Project name</label>
  <input class="luz-input" id="project-name" type="text" aria-describedby="project-name-hint">
  <div class="luz-field__helper" id="project-name-hint">Shown on the dashboard.</div>
</div>
```

Field with an error markup
```html
<div class="luz-field">
  <label class="luz-field__label" for="slug">Slug</label>
  <input class="luz-input luz-input--error" id="slug" type="text" aria-invalid="true" aria-describedby="slug-error">
  <div class="luz-field__error" id="slug-error"><span class="u-sr-only">Error: </span>Use letters, numbers and dashes only.</div>
</div>
```

Radio group markup
```html
<fieldset class="luz-fieldset">
  <legend>Plan</legend>
  <div class="luz-check-group">
    <div class="luz-check-item"><input type="radio" name="plan" id="plan-free" checked><label for="plan-free">Free</label></div>
    <div class="luz-check-item"><input type="radio" name="plan" id="plan-team"><label for="plan-team">Team</label></div>
  </div>
</fieldset>
```

Switch markup
```html
<label class="luz-toggle">
  <input class="luz-toggle__input" type="checkbox" role="switch">
  <span class="luz-toggle__track" aria-hidden="true"><span class="luz-toggle__thumb"></span></span>
  <span class="luz-toggle__label">Weekly digest</span>
</label>
```

### Variantes y opciones
Cada control es un elemento nativo con una clase de LUZ. El estado se define con atributos nativos.

- `.luz-field`: Agrupa una etiqueta, su control, su indicación y su error
- `.luz-field__label`: La etiqueta visible
- `.luz-field__label--required`: Añade « *» en rojo después de la etiqueta
- `.luz-field__helper`: Una indicación debajo del control
- `.luz-field__error`: Un error debajo del control, en el color de peligro
- `.luz-input`: Campos de texto, correo electrónico, número, fecha, hora, color, archivo y rango, y `<textarea>`; 44 px de alto
- `.luz-input--error`: Un subrayado de 2 px en color de peligro; combínalo con `aria-invalid="true"`
- `.luz-input--textarea`: Altura automática, de al menos 80 px y redimensionable en vertical
- `.luz-select`: Un `<select>`, documentado en su propia página: [Select](https://nandovejer.github.io/luz/es/docs/components/select/)
- `.luz-check-group`, `.luz-check-item`: Una lista de casillas o botones de opción, cada uno con su etiqueta
- `.luz-fieldset`: Un grupo con borde y un `<legend>` en mayúsculas
- `.luz-toggle`: Un interruptor: una casilla con `role="switch"`, representada por una pista y un control deslizante
- `.luz-meter`: Una barra `<meter>` del color de marca en todos los estados: consulta [Meter](https://nandovejer.github.io/luz/es/docs/components/meter/)
- `.luz-output`: Un valor calculado
- `disabled`, `readonly`: Atenuado; el estado de solo lectura también tiene un subrayado discontinuo

### Cómo funciona
Controles de formulario nativos, con estilos de `components/form.css`. No necesitan JavaScript: el navegador gestiona el estado, el teclado, la validación y el envío.

- Cada control obtiene su nombre de `<label>`; la indicación y el error se asocian mediante `aria-describedby`.
- LUZ no marca los campos no válidos por ti: cuando falle la validación, añade `.luz-input--error`, `aria-invalid="true"` y el texto del error.
- El texto de los campos es de 16 px con pantallas de 768 px o menos y en pantallas táctiles para que iOS Safari no amplíe la página.

### Sin JavaScript
Todos los controles, incluido el interruptor, funcionan y se envían con su formulario. Solo faltan las funciones que añaden tus propios scripts, como la validación en vivo o mostrar un valor en un elemento `<output>`.

### Teclado y ARIA
Se aplican las teclas nativas. Tab permite pasar de un control a otro.

- Espacio marca una casilla o activa un interruptor.
- Las teclas de flecha permiten elegir una opción del grupo o mover un control deslizante.
- Agrupa los controles relacionados en un `<fieldset>` con un `<legend>` o en un elemento con `role="group"` identificado mediante `aria-labelledby`.
- Escribe «Error: » antes del texto del error; si quieres, ocúltalo visualmente con `.u-sr-only`.

### Cuándo usarlo
Usa estos campos para recoger datos y elige el control nativo que corresponda.

- Texto, correo electrónico, número, fecha y hora: usa un input con el `type` correspondiente.
- Para elegir una opción entre pocas (seis o menos), usa botones de opción. Para elegir entre muchas, usa un [select](https://nandovejer.github.io/luz/es/docs/components/select/).
- Para elegir varias opciones, usa casillas. Para un ajuste que se aplica al instante, usa un interruptor.

### Cuándo no usarlo
No recrees un control nativo con elementos `<div>`.

- No uses un placeholder como etiqueta: desaparece cuando el lector escribe.
- No uses un interruptor en un formulario que se envía con un botón: usa una casilla.
- Para mostrar el avance de una tarea, usa [progress](https://nandovejer.github.io/luz/es/docs/components/progress/), no [meter](https://nandovejer.github.io/luz/es/docs/components/meter/).
