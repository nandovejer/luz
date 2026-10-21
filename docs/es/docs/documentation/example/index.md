# Ejemplo

Una vista previa en vivo con el código debajo, en un mismo marco y con la anchura que le asignes.

### Problemas conocidos
No se conocen.

### Copiar el marcado
Una figura con la vista previa y, debajo, el código. El código es opcional:

Example markup
```html
<figure class="luz-docs-example">
  <div class="luz-docs-example__preview">
    <div class="luz-docs-example__frame">
      <button class="luz-btn luz-btn--primary" type="button">Save changes</button>
    </div>
  </div>
  <div class="luz-docs-example__code">
    <pre class="luz-code-block" data-lang="html" tabindex="0" aria-label="Markup of the example"><code>&lt;button class="luz-btn luz-btn--primary" type="button"&gt;Save changes&lt;/button&gt;</code></pre>
  </div>
</figure>
```

### Variantes y opciones
No hay modificadores. La anchura se controla con una propiedad personalizada.

- `.luz-docs-example`: En un `<figure>`: una caja enmarcada con un borde redondeado sobre la superficie. La vista previa y el código comparten el marco
- `.luz-docs-example__preview`: El marcado en vivo, con espacio interior alrededor del marco
- `.luz-docs-example__frame`: Dentro de la vista previa: ocupa su anchura o la que indique `--luz-docs-example-w` (nunca más), y está centrado. Es un contenedor de tamaño
- `.luz-docs-example__code`: Opcional, debajo de la vista previa, a todo su ancho y con una línea encima. Si contiene un `pre.luz-code-block`, este pierde su propio borde
- `--luz-docs-example-w`: La anchura del marco. Asígnala al marco: `style="--luz-docs-example-w: 20rem"` equivale a un móvil. De forma predeterminada, ocupa toda la vista previa

### Cómo funciona
CSS de `@luz-ds/docs` sobre el bloque de código y el resaltado de core.

- La vista previa y el código comparten un marco, así que se entienden como un único ejemplo. Las líneas largas se desplazan dentro del bloque de código y nunca ensanchan la figura.
- La anchura del marco es `min(100%, var(--luz-docs-example-w, 100%))`: si supera el espacio disponible, la figura no se ensancha.
- El marco es un contenedor de tamaño (`container-type: inline-size`). Un botón de bloque ocupa el marco, no la ventana, y puedes hacer que una regla propia responda al marco con `@container`.
- Escribe el marcado una vez y muéstralo de dos formas, como vista previa y como código escapado: quien lee ve lo que va a copiar.

### Sin JavaScript
El marco no cambia. El bloque de código es texto sin formato en una región desplazable que puede recibir el foco, sin el resaltado ni el botón de copia del script de core.

### Teclado y ARIA
- **Orden:** primero los controles de la vista previa y después el bloque de código.
- **Bloque de código:** conserva `tabindex="0"` y un `aria-label` en `<pre>`: el bloque se desplaza y, sin esos atributos, quien usa el teclado no puede llegar hasta él ni saber qué es.
- **Vista previa:** es interactiva, así que su contenido funciona como en cualquier otro sitio. Incluye las imágenes que no deban usarse en [Qué hacer y qué no](https://nandovejer.github.io/luz/es/docs/documentation/dodont/), cuya zona de ejemplo es inerte.

### Cuándo usarlo
Usa el ejemplo para mostrar una pieza y el marcado que la crea en un mismo marco, con el código debajo de la vista previa.

- Un componente, un patrón o un fragmento que quien lee pueda copiar.
- Una pieza cuyo aspecto dependa de su anchura: ajusta la anchura del marco.

### Cuándo no usarlo
No uses el ejemplo para mostrar un error ni código que no tenga una vista previa.

- Las imágenes de errores van en [Qué hacer y qué no](https://nandovejer.github.io/luz/es/docs/documentation/dodont/), que es inerte.
- El código que no tenga nada que mostrar, como un comando, va en un [bloque de código](https://nandovejer.github.io/luz/es/docs/components/code/) normal.
