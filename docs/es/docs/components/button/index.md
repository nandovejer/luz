# Botón

Inicia una acción en la página actual, como guardar, enviar o abrir un diálogo.

### Problemas conocidos
Ninguno conocido.

### Copiar el marcado
Primary button markup
```html
<button class="luz-btn luz-btn--primary" type="button">Save changes</button>
```

Un enlace a otra página con aspecto de botón:

Link styled as a button markup
```html
<a class="luz-btn luz-btn--outline" href="/pricing/">See the plans</a>
```

Todo el ancho de un contenedor estrecho, como una tarjeta o un formulario en un móvil:

Full-width button markup
```html
<form action="/cart/add" method="post">
  <button class="luz-btn luz-btn--primary luz-btn--block" type="submit">Add to cart</button>
</form>
```

### Variantes y opciones
Combina `.luz-btn` con una variante y, si hace falta, un tamaño y el ancho completo.

- `.luz-btn--primary`: Relleno de marca: la acción principal de la vista
- `.luz-btn--secondary`: Superficie neutra intensa: una acción secundaria
- `.luz-btn--outline`: Texto y borde de marca, sin relleno
- `.luz-btn--ghost`: Solo texto de marca: una acción de baja prioridad
- `.luz-btn--danger`: Relleno de peligro: una acción que elimina o no se puede deshacer
- `.luz-btn--sm`: 36 px de alto, texto pequeño
- `.luz-btn--lg`: 56 px de alto, texto base
- `.luz-btn--block`: Ocupa el ancho del contenedor y permite que la etiqueta ocupe varias líneas: para tarjetas, formularios o cajones, no para columnas anchas
- `disabled`: Texto atenuado, borde discontinuo y sin eventos de puntero

La altura predeterminada es 44 px. Un `<svg>` dentro del botón se muestra a 16 × 16 px, antes o después de la etiqueta.

### Cómo funciona
Un `<button>` (o `<a>`) nativo con clases de `components/button.css`. No necesita JavaScript.

- Define `type="button"` salvo que el botón envíe un formulario; el tipo predeterminado es `submit`.
- La altura es mínima: la etiqueta puede crecer junto con el tamaño de fuente del lector.
- `.luz-btn--block` establece `inline-size: 100%`. Úsalo cuando el botón sea el único elemento de su fila: en una fila flex ocuparía todo el espacio. Su etiqueta ocupa varias líneas y las palabras que no caben se dividen para que nada sobresalga con 320 px de ancho o texto al 200 %.

### Sin JavaScript
Un botón funciona como cualquier botón nativo: envía el formulario o no hace nada. Tu script define qué ocurre al hacer clic.

En esta página, las opciones Pruébalo y Ancho del ejemplo necesitan JavaScript: sin él no se muestran, pero sí aparecen los ejemplos y su marcado.

### Teclado y ARIA
Con Tab se llega al botón; Enter o Espacio lo activa. Un enlace con aspecto de botón solo responde a Enter, como cualquier enlace.

- No hace falta ARIA: la etiqueta visible es el nombre.
- Un botón que solo tiene un icono necesita un nombre: `aria-label="Close"`; el icono debe llevar `aria-hidden="true"`.
- Tab omite los botones desactivados y es posible que los lectores de pantalla no los encuentren: es preferible usar un botón activo que explique qué falta.

### Cuándo usarlo
Usa un botón para iniciar una acción en la página actual: guardar, enviar, eliminar o abrir un diálogo.

- Un botón principal por vista, para la acción que realiza la mayoría.
- Usa botones secundarios, de contorno o fantasma para las demás acciones.
- Usa el ancho completo (`.luz-btn--block`) cuando la acción sea lo único que hay en un contenedor estrecho: una tarjeta, un cajón o el botón para enviar un formulario en un móvil.

### Cuándo no usarlo
No uses un botón para ir a otra página: usa un enlace, con aspecto de botón solo si es la llamada principal a la acción.

- Para mostrar varias acciones relacionadas en una fila, usa un [grupo de acciones](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-actions).
- No desactives un botón para ocultar una acción que el lector aún no puede realizar: explica el motivo.
- No extiendas un botón por una columna ancha: una barra de 1.000 px no es un botón. Dos acciones en paralelo son dos botones con su propio ancho.
