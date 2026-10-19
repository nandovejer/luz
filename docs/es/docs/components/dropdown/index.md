# Desplegable

Un botón que abre debajo una lista breve de acciones o enlaces.

### Problemas conocidos
No hay teclas de flecha: Tab permite recorrer las acciones, como en cualquier lista de botones. En los navegadores sin posicionamiento CSS de anclaje, la lista se abre como una hoja en la parte inferior de la pantalla, no debajo del botón.

### Copiar el marcado
Dropdown markup
```html
<div class="luz-dropdown">
  <button class="luz-btn luz-btn--secondary" type="button" popovertarget="project-actions">Actions</button>
  <div class="luz-dropdown__menu" id="project-actions" popover>
    <ul class="luz-dropdown__list">
      <li><a class="luz-dropdown__item" href="/project/edit/">Edit</a></li>
      <li><button class="luz-dropdown__item" type="button">Duplicate</button></li>
      <li><hr class="luz-dropdown__separator"></li>
      <li><button class="luz-dropdown__item luz-dropdown__item--danger" type="button">Delete project</button></li>
    </ul>
  </div>
</div>
```

### Variantes y opciones
- `.luz-dropdown`: El contenedor: el botón y su panel, uno junto al otro en el código fuente. Define el ámbito del anclaje, de modo que cada desplegable de la página se abre debajo de su propio botón
- `popovertarget` y `popover`: El botón identifica el panel mediante su `id`; el panel es el popover. El navegador se encarga del resto
- `.luz-dropdown__menu`: El panel: una superficie con borde y sombra, de al menos 12 rem de ancho, que permite desplazarse si supera los 24 rem de alto
- `.luz-dropdown__list`: La lista `<ul>` de acciones
- `.luz-dropdown__item`: Un enlace o botón de al menos 44 px de alto y del ancho del panel
- `.luz-dropdown__item--danger`: Una acción destructiva, en el color de peligro
- `aria-disabled="true"`: Una acción que no está disponible ahora: usa el color de texto desactivado y conserva su lugar en el orden de tabulación para que el lector pueda encontrarla
- `.luz-dropdown__separator`: Una línea entre dos grupos de acciones: un `<hr>` en su propio `<li>`

### Cómo funciona
Un [popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) nativo que abre un botón con `popovertarget` y al que da estilo `components/dropdown.css`. No necesita JavaScript.

- El navegador coloca el panel en la capa superior, lo cierra con Escape o al hacer clic fuera, devuelve el foco al botón e indica a la tecnología de asistencia si está expandido.
- En los navegadores con posicionamiento CSS de anclaje (Chrome y Edge 125, Safari 26 y Firefox 147), el panel se abre debajo del botón, alineado con su borde inicial, y pasa a abrirse encima si no hay espacio. Si no está disponible, el panel aparece como una hoja en la parte inferior de la pantalla.
- En los navegadores sin la API de popover, la lista permanece en la página, debajo del botón, y todas las acciones siguen funcionando.
- Es una lista de acciones, no un `menu` de ARIA: ese role implica teclas de flecha, un tabindex itinerante y búsqueda por escritura, funciones que LUZ no implementa con scripts. Los enlaces y botones normales conservan todos los comportamientos que les proporciona el navegador.

### Sin JavaScript
No cambia nada: el popover es HTML. Las acciones que son botones necesitan tus propios scripts para hacer algo, como cualquier botón; los enlaces funcionan tal cual.

### Teclado y ARIA
Enter o Espacio en el botón abre el panel; el foco se mantiene en el botón y el panel aparece a continuación en el orden de tabulación. Tab permite llegar a la primera acción y recorrer las demás; Mayús+Tab permite volver.

Escape cierra el panel y devuelve el foco al botón.

- Pon al botón un nombre que indique qué contiene: «Acciones» o «Más opciones para Ana», no solo «…».
- Una acción no disponible usa `aria-disabled="true"`, no `disabled`, para que siga siendo accesible y el lector de pantalla pueda anunciarla. No ejecutes la acción cuando se active.
- El panel no es un diálogo ni contiene formularios: para una decisión o un formulario, usa un [diálogo modal](https://nandovejer.github.io/luz/es/docs/components/modal/).

### Cuándo usarlo
Usa un desplegable para mostrar entre tres y siete acciones relacionadas con un elemento cuando mostrarlas todas recargaría la página: por ejemplo, las acciones de una fila de tabla, una tarjeta o un proyecto.

### Cuándo no usarlo
No uses un desplegable para elegir un valor ni para ocultar la acción principal.

- Para elegir un valor de un formulario, usa un [select](https://nandovejer.github.io/luz/es/docs/components/select/).
- Para la acción principal de una página, usa un [botón](https://nandovejer.github.io/luz/es/docs/components/button/) visible.
- Para las secciones de un sitio, usa una [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/) o una lista de navegación.
- LUZ no sustituye el menú contextual del botón derecho. El menú del navegador pertenece al lector y sustituirlo impide copiar, pegar y recibir ayuda ortográfica; ofrece las mismas acciones en un desplegable.
