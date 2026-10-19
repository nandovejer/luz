# Cuadrícula de iconos

Permite explorar un conjunto de iconos por nombre y copiar el SVG de cada uno.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Icon grid markup
```html
<ul class="luz-icon-grid">
  <li class="luz-icon-item">
    <span class="luz-icon-display"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg></span>
    <span class="luz-icon-name" id="icon-plus">Plus</span>
    <button class="luz-copy-btn" type="button" id="icon-plus-copy" aria-labelledby="icon-plus-copy icon-plus" data-copy="&lt;svg …&gt;…&lt;/svg&gt;">Copy SVG</button>
  </li>
</ul>
```

Los mismos iconos como sprite: pégalo una vez en la página y luego dibuja cada uno con `<use>`. El sprite solo funciona en el mismo documento (`href="#id"`); los navegadores bloquean un `<use>` que apunte a un archivo de otro origen, incluido un CDN.

Icon sprite markup
```html
<svg width="0" height="0" aria-hidden="true" focusable="false">
  <symbol id="luz-icon-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
  <symbol id="luz-icon-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="luz-icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></symbol>
  <symbol id="luz-icon-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></symbol>
  <symbol id="luz-icon-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="luz-icon-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
  <symbol id="luz-icon-chevron-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
  <symbol id="luz-icon-chevron-up" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></symbol>
  <symbol id="luz-icon-chevron-end" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
  <symbol id="luz-icon-arrow-end" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="luz-icon-cart" viewBox="0 0 24 24"><path d="M3 4h2.5l2.2 10.5h9.6L19.5 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></symbol>
  <symbol id="luz-icon-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-4 3.6-6 7.5-6s6.9 2 7.5 6"/></symbol>
  <symbol id="luz-icon-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7.5l8.5 6 8.5-6"/></symbol>
  <symbol id="luz-icon-calendar" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/></symbol>
  <symbol id="luz-icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
  <symbol id="luz-icon-map-pin" viewBox="0 0 24 24"><path d="M12 21s7-5.8 7-11.5a7 7 0 0 0-14 0C5 15.2 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>
  <symbol id="luz-icon-download" viewBox="0 0 24 24"><path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14"/></symbol>
  <symbol id="luz-icon-external" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></symbol>
  <symbol id="luz-icon-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5v.01"/></symbol>
  <symbol id="luz-icon-warning" viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.01"/></symbol>
  <symbol id="luz-icon-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></symbol>
  <symbol id="luz-icon-filter" viewBox="0 0 24 24"><path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/></symbol>
</svg>

<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#luz-icon-cart"/></svg>
```

Un icono junto a una etiqueta y otro aislado. El nombre del botón procede de su texto, así que asigna un nombre al botón que solo contiene un icono mediante la clase `.u-sr-only`, no con `aria-label`: el texto de la etiqueta se traduce con la página.

Icon in a button markup
```html
<!-- With a label: the icon is 16 px inside a button -->
<button class="luz-btn luz-btn--primary" type="submit">
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 4h2.5l2.2 10.5h9.6L19.5 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>
  Add to cart
</button>

<!-- Icon only: the name is real text, hidden from the eye -->
<button class="luz-btn luz-btn--ghost" type="button">
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  <span class="u-sr-only">Menu</span>
</button>
```

Dos iconos apuntan al final de la línea: `chevron-end` y `arrow-end`, marcados con `data-luz-flip`. En texto de derecha a izquierda, LUZ refleja cualquier elemento con ese atributo mediante la regla siguiente, en la capa de utilidades de core, así que no tienes que escribir nada.

Añade el atributo a cualquier icono tuyo que apunte al final de la línea.

Right-to-left rule, shipped in luz.utilities
```css
:where([data-luz-flip]):dir(rtl) {
  transform: scaleX(-1);
}
```

### Variantes y opciones
No hay modificadores. La cuadrícula muestra tantas columnas de al menos 100 px como permita el ancho.

- `.luz-icon-grid`: La lista: una cuadrícula sin viñetas
- `.luz-icon-item`: Una celda con borde: icono, nombre y botón para copiar
- `.luz-icon-display`: Un cuadro de 48 × 48 px que centra el icono, en el color de texto secundario
- `.luz-icon-name`: El nombre bajo el icono

### Cómo funciona
Una lista `<ul>` de iconos con los estilos de `components/icon-grid.css`. Los botones para copiar son [botones para copiar](https://nandovejer.github.io/luz/es/docs/components/copy-button/) que activa `clipboard.js`.

- Cada botón incluye el SVG del icono, con los caracteres de escape, en `data-copy`.
- Los 22 iconos son propios de LUZ, dibujados sobre una cuadrícula de 24 × 24 con un trazo redondeado de 2 px en `currentColor`. No forman parte de ningún paquete ni se carga ningún archivo: copia el SVG o el sprite en tu página.
- El tamaño del icono es de 24 × 24 px tal como está escrito y de 16 px dentro de un `.luz-btn`. Para que un icono siga el tamaño del texto, establece `width="1.5em" height="1.5em"`.

### Sin JavaScript
Los botones para copiar quedan ocultos. La cuadrícula sigue mostrando todos los iconos y sus nombres.

### Teclado y ARIA
Pulsa Tab para llegar a cada botón para copiar y Enter o Espacio para copiar el SVG.

- El nombre de cada botón combina su propio texto con el nombre del icono mediante `aria-labelledby`: «Copy SVG Plus».
- Los iconos tienen `aria-hidden="true"` y `focusable="false"`: su nombre es el texto que aparece debajo o el texto `.u-sr-only` del botón que los contiene.
- Los iconos de información y advertencia siempre van acompañados de texto. Un glifo aislado no dice nada a quien no puede ver su forma o su color: coloca el texto a su lado o asigna al icono independiente `role="img"` y un nombre.
- El resultado de cada copia se anuncia en una región dinámica cortés.

### Cuándo usarlo
Usa una cuadrícula de iconos para que se pueda explorar un conjunto de iconos y copiar el que se necesite.

### Cuándo no usarlo
No la uses para disponer iconos que realizan acciones: es un catálogo, no una barra de herramientas.

- Para una fila de acciones, usa botones con texto en un [grupo de acciones](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-actions).
- No uses nunca un icono como única etiqueta de una acción: ponle un nombre en texto, visible o en una etiqueta oculta con la clase `.u-sr-only`.
- Para un logotipo o una ilustración, usa un `<img>` o un SVG con su tamaño original.
- Si necesitas cientos de iconos, usa tu propio conjunto: el de LUZ tiene 22.
