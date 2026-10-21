# Código

Muestra código dentro de una frase o en un bloque con colores de sintaxis en todos los modos.

### Problemas conocidos
El resaltador usa un conjunto de patrones, no un analizador: las etiquetas JSX, el contenido de los elementos `style` y `script` de HTML y los valores de atributos sin comillas se muestran sin formato. Los colores son decorativos: la tecnología de asistencia lee el código de la misma forma.

### Copiar el marcado
Code block markup
```html
<pre class="luz-code-block" data-lang="css" tabindex="0" role="region" aria-label="Panel styles"><code>.panel {
  color: var(--luz-text-primary);
}</code></pre>
```

Inline code markup
```html
<p>Set the colour with <code class="luz-code-inline">--luz-text-primary</code>.</p>
```

Highlighting script code
```js
import { initHighlight } from "@luz-ds/core/highlight";
initHighlight();
```

### Variantes y opciones
Dos clases y el idioma en un atributo.

- `.luz-code-block`: Un bloque sobre una superficie atenuada, con fuente mono y desplazamiento horizontal si una línea es larga
- `.luz-code-inline`: Código dentro de una frase, con el color de código
- `data-lang`: El idioma: `html`, `css`, `js`, `jsx`, `json`, `bash`, `sh` o `shell`. Se muestra como una etiqueta en una línea propia encima del código, en el borde final. Cualquier otro valor se muestra sin resaltarlo

### Cómo funciona
Un `<pre>` con un `<code>` dentro, al que da estilo `components/code.css`. El resaltado es opcional y lo proporciona `highlight.js`.

- `highlightBlock(pre)` colorea un bloque: envuelve el código con seis clases `.tok-*`, una por cada token `--luz-code-*`.
- `initHighlight()` lo hace con cada `pre.luz-code-block`, añade un `aria-label` a los bloques que no tengan ninguno («Ejemplo de CSS») y añade un botón para copiar en cada bloque. Core no asigna una posición a ese botón: colócalo con tu propio CSS o llama solo a `highlightBlock()`. `luz.js` ejecuta `initHighlight()`.
- En colores forzados, todos los colores pasan a ser el color de texto del sistema; las palabras clave en negrita y los comentarios en cursiva se mantienen.

### Sin JavaScript
El bloque es texto normal y legible de un solo color. Solo se pierden los colores.

### Teclado y ARIA
Un bloque puede ser más ancho que la pantalla, así que debe recibir el foco: con Tab se llega a él y las teclas de flecha permiten desplazarse.

- Usa `tabindex="0"`, `role="region"` y un `aria-label` que identifique el código, para que la parada de foco tenga un nombre.
- El código en línea no necesita nada.

### Cuándo usarlo
Usa un bloque de código para mostrar código o resultados del terminal que el lector pueda consultar o copiar, y código en línea para nombres dentro de una frase.

### Cuándo no usarlo
No uses un bloque de código para un archivo largo ni para texto que no sea código.

- Para enlazar a un archivo completo, enlaza al archivo original.
- Para indicar una tecla que debe pulsar el lector, usa `<kbd>`.
