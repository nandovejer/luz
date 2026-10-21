# Selector de modo de color

Permite elegir entre los modos claro, oscuro y de alto contraste: con botones de opción que funcionan sin JavaScript o con un único botón que los alterna.

### Problemas conocidos
Un modo de color guardado puede parpadear una vez al cargar: `initThemeSystem()` es un módulo diferido y se ejecuta después del primer pintado, y LUZ no incluye ningún script para `<head>`, por diseño. Este sitio establece el modo antes del primer pintado con un pequeño script propio.

### Copiar el marcado
Radio group markup
```html
<fieldset class="luz-mode-switcher">
  <legend class="luz-mode-switcher__label">Color mode</legend>
  <label class="luz-mode-btn" data-theme="light"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="light" checked>Light</label>
  <label class="luz-mode-btn" data-theme="dark"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="dark">Dark</label>
  <label class="luz-mode-btn" data-theme="high-contrast"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="high-contrast">High contrast</label>
</fieldset>
```

La variante de alternancia: los mismos botones de opción, un icono en cada etiqueta y un botón con un icono por modo.

Cycle variant markup
```html
<fieldset class="luz-mode-switcher luz-mode-switcher--cycle">
  <legend class="luz-mode-switcher__label">Color mode</legend>
  <button class="luz-mode-cycle" type="button" aria-label="Change color mode">
    <svg class="luz-mode-btn__icon" data-mode-icon="light" viewBox="0 0 24 24" aria-hidden="true">…</svg>
    <!-- the same for data-mode-icon="dark" and "high-contrast" -->
  </button>
  <span class="luz-mode-cycle__status" role="status"></span>
  <label class="luz-mode-btn" data-theme="light">
    <input class="luz-mode-btn__input" type="radio" name="luz-theme" value="light" checked>
    <svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>
    Light
  </label>
  <!-- the same for dark and high-contrast -->
</fieldset>
```

Mode script code
```js
import { initThemeSystem, initThemeCycle } from "@luz-ds/core/theme";
initThemeSystem();
initThemeCycle();
```

### Variantes y opciones
- `.luz-mode-switcher`: El grupo de botones de opción, en forma de fila de botones; el seleccionado aparece relleno
- `.luz-mode-switcher--cycle`: Un botón en lugar de los botones de opción cuando se activa JavaScript
- `.luz-mode-cycle`: El botón de alternancia; muestra el icono cuyo `data-mode-icon` coincide con el botón de opción seleccionado
- `.luz-mode-cycle__status`: Una región dinámica oculta para el nuevo modo; el script la añade si falta
- `name="luz-theme"`: El nombre del grupo de botones de opción que usan los tokens y `theme.js`

### Cómo funciona
Un grupo nativo de botones de opción con estilos de `components/mode-switcher.css`. Los botones de opción son el control y la fuente de verdad.

- Los tokens cambian el ámbito de la página según el botón de opción seleccionado con `:root:has()`, de modo que puedes elegir un modo sin usar scripts.
- `initThemeSystem()` de `theme.js` establece `data-theme` en `<html>` y guarda la elección como `luz-theme` en `localStorage`. Parte del atributo de `<html>` o del modo claro si no hay ninguno: para [partir del ajuste del sistema](https://nandovejer.github.io/luz/es/docs/tokens/modes/#system), establece el atributo antes de que se ejecute.
- `initThemeCycle()` convierte cada grupo `--cycle` en un único botón. Cada pulsación selecciona el siguiente modo y dispara su evento `change`, para que lo aplique lo que escucha los botones de opción. Añade el botón si no está en el marcado.
- Un estilo propio ([crea uno](https://nandovejer.github.io/luz/es/docs/tokens/themes/)) se incluye en las opciones si su nombre aparece en `data-luz-themes` de `<html>`: solo se aceptan los tres modos y esos nombres como valores guardados.
- `luz.js` ejecuta ambas funciones.
- Para añadir una opción Automático que siga el ajuste del sistema o la hora del día, envuelve los botones de opción, con un cuarto para esta opción, en [`<luz-mode>`](https://nandovejer.github.io/luz/es/docs/site/mode/) de `@luz-ds/site`.

### Sin JavaScript
Se muestran los tres botones de opción, incluso en la variante de alternancia, y elegir uno cambia el modo de la página. La elección no se recuerda en la página siguiente.

### Teclado y ARIA
Botones de opción: usa Tab para llegar al grupo y las teclas de dirección para elegir un modo.

- Botón de alternancia: usa Tab para llegar a él y Enter o Espacio para pasar al modo siguiente.
- Su nombre indica lo que hace y el modo actual: «Cambiar modo de color. Actual: Oscuro».
- Un estado cortés anuncia el nuevo modo: «Modo de color: Oscuro».

### Cuándo usarlo
Ofrece un selector de modo de color en todas las páginas del sitio, siempre en el mismo lugar, para que cada persona elija el modo que le resulte más fácil de leer.

- El grupo de botones de opción, si hay espacio, por ejemplo en una página de ajustes o en el pie de una barra lateral.
- La variante de alternancia cuando hay poco espacio, por ejemplo en una cabecera o en el pie de página.

### Cuándo no usarlo
No uses la variante de alternancia cuando haya que comparar los modos: el grupo de botones de opción muestra los tres a la vez.

- No lo ocultes únicamente en una página de ajustes: quien no pueda leer la página no encontrará el ajuste.
