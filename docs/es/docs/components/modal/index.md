# Diálogo modal

Pide tomar una decisión antes de continuar, mediante un elemento dialog nativo.

### Problemas conocidos
Algunos navegadores compatibles aún no admiten los atributos `command` y `commandfor`. En esos navegadores, si JavaScript está desactivado, el botón de apertura no hace nada.

Ofrece a quien lee otra forma de realizar la misma acción.

### Copiar el marcado
Modal markup
```html
<button class="luz-btn luz-btn--primary" type="button" commandfor="rename" command="show-modal">Rename project</button>

<dialog class="luz-modal" id="rename" aria-labelledby="rename-title">
  <div class="luz-modal__header">
    <button class="luz-modal__close" type="button" commandfor="rename" command="close" aria-label="Close dialog">×</button>
    <h2 class="luz-modal__title" id="rename-title">Rename project</h2>
  </div>
  <form method="dialog">
    <div class="luz-modal__body">
      <div class="luz-field">
        <label class="luz-field__label" for="rename-name">New name</label>
        <input class="luz-input" id="rename-name" type="text" autofocus>
      </div>
    </div>
    <div class="luz-modal__footer">
      <button class="luz-btn luz-btn--ghost" type="button" commandfor="rename" command="close">Cancel</button>
      <button class="luz-btn luz-btn--primary" value="rename">Rename project</button>
    </div>
  </form>
</dialog>
```

Fallback script code
```js
import { initModals } from "@luz-ds/core/modal";
initModals();
```

### Variantes y opciones
Un tamaño y ningún modificador: hasta 600 px de ancho y el 90 % de la altura de la ventana gráfica, con desplazamiento interno si el contenido es más largo.

- `.luz-modal`: La superficie del diálogo, con un fondo atenuado y ligeramente difuminado
- `.luz-modal__header`, `__title`: La fila del título, con una línea debajo
- `.luz-modal__close`: El botón ×, al final de la fila del título, de al menos 28 px
- `.luz-modal__body`: El contenido
- `.luz-modal__footer`: Los botones, al final de la fila, con una línea por encima
- `command="show-modal"`, `command="close"`: Abre y cierra el diálogo indicado en `commandfor`

### Cómo funciona
Un elemento nativo `<dialog>` con estilos de `components/modal.css`, que se abre como diálogo modal.

- El navegador se encarga de lo difícil: la página del fondo queda inerte, el foco permanece dentro, Escape lo cierra y el foco vuelve al botón que lo abrió.
- Los botones lo abren y lo cierran con `command` y `commandfor`, sin scripts.
- `initModals()` de `modal.js` gestiona los mismos dos comandos en los navegadores que aún no los admiten, y no hace nada en los demás. `luz.js` lo ejecuta.
- Al enviar un `<form method="dialog">` que esté dentro, el diálogo se cierra y su `returnValue` toma el valor del botón pulsado.

### Sin JavaScript
Todo funciona en los navegadores que admiten `command`. En los demás, el botón de apertura no hace nada: consulta «Problemas conocidos».

### Teclado y ARIA
Tab y Mayús+Tab permiten moverse solo dentro del diálogo; Escape lo cierra.

- Al abrirlo, el foco pasa al primer elemento que lo admite o al que tenga `autofocus`.
- Asigna un nombre al diálogo con `aria-labelledby`, que apunte a su título.
- El botón × necesita `aria-label="Close dialog"`: su texto es un símbolo.

### Cuándo usarlo
Usa un diálogo modal para pedir una decisión o una breve respuesta que deba resolverse antes de continuar.

- Para confirmar una acción que no se puede deshacer.
- Para pedir uno o dos datos, como un nombre nuevo.

### Cuándo no usarlo
No uses un diálogo modal para algo que se pueda ignorar o retomar más tarde.

- Para información sobre la página, usa una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/).
- Para una confirmación que no requiere respuesta, usa un [aviso emergente](https://nandovejer.github.io/luz/es/docs/components/toast/).
- Para un formulario largo, usa una página propia.
- No abras nunca un diálogo modal al cargar la página.
