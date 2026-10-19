# Botón para copiar

Copia un comando o un valor en el portapapeles e indica que lo ha hecho.

### Problemas conocidos
La API del portapapeles necesita un contexto seguro (https o localhost durante el desarrollo). En otros contextos, la copia falla.

El fallo solo se anuncia a los lectores de pantalla: el botón no muestra ningún mensaje, así que quienes pueden verlo no perciben que haya pasado nada. Aun así, el texto se puede seleccionar y copiar a mano.

### Copiar el marcado
Copy button markup
```html
<code class="luz-code-inline">npm install @luz-ds/core</code>
<button class="luz-copy-btn" type="button" data-copy="npm install @luz-ds/core" aria-label="Copy the install command">Copy</button>
```

Copy script code
```js
import { initCopyButtons } from "@luz-ds/core/clipboard";
initCopyButtons();
```

### Variantes y opciones
Una clase y un atributo. El aspecto no cambia.

- `.luz-copy-btn`: Botón mono pequeño, de 24 px de alto; oculto hasta que se ejecuta el script
- `data-copy`: El texto exacto que se debe copiar
- `.is-copied`: El script lo establece durante aproximadamente un segundo tras copiar: color de éxito y etiqueta «Copiado»

### Cómo funciona
Un `<button>` nativo, al que da estilo `components/copy-btn.css` y que controla `clipboard.js`.

- `initCopyButtons()` escucha los clics en cualquier `.luz-copy-btn` y copia su `data-copy`. `luz.js` lo ejecuta.
- Durante aproximadamente un segundo, la etiqueta muestra «Copiado» y luego vuelve a su estado anterior.
- Una región dinámica cortés anuncia «Copiado en el portapapeles» o que la copia ha fallado. Los textos proceden de `i18n.js` y están en el idioma de la página.
- `copyToClipboard(text, el)` hace lo mismo con tus propios controles.

### Sin JavaScript
El botón está oculto porque no haría nada. El texto que copia permanece en la página para que el lector lo seleccione y lo copie.

### Teclado y ARIA
Con Tab se llega al botón; Enter o Espacio copia el texto. El foco permanece en el botón.

- La etiqueta visible es «Copiar»; el `aria-label` empieza con esas palabras e indica qué se copia: «Copiar el comando de instalación».
- El resultado se anuncia en una región dinámica cortés que comparten todos los botones para copiar.

### Cuándo usarlo
Usa un botón para copiar una cadena breve que el lector vaya a pegar en otro sitio: un comando, el nombre de un token o una clave.

### Cuándo no usarlo
No uses un botón para copiar si es igual de fácil seleccionar el texto ni como única forma de obtener el contenido.

- Para textos largos, usa un [bloque de código](https://nandovejer.github.io/luz/es/docs/components/code/) que el lector pueda seleccionar.
