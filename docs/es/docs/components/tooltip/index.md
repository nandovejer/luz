# Tooltip

Añade una indicación breve a un control al pasar el puntero o enfocarlo; nunca contiene información esencial.

### Problemas conocidos
Incumple parcialmente WCAG 1.4.13 (contenido al pasar el puntero o enfocar): Escape no cierra el tooltip, así que la persona tiene que apartar el puntero o el foco. Mantén los tooltips breves y no esenciales.

Incluido en la [declaración de accesibilidad](https://nandovejer.github.io/luz/es/docs/accessibility/).

### Copiar el marcado
Tooltip markup
```html
<div class="luz-tooltip">
  <button class="luz-btn luz-btn--outline" type="button" aria-describedby="archive-tip">Archive</button>
  <div class="luz-tooltip__text" role="tooltip" id="archive-tip">Hides the project from the list</div>
</div>
```

### Variantes y opciones
Una sola posición: encima del control y centrado. En navegadores compatibles con el posicionamiento de anclajes CSS, el tooltip se coloca debajo del control cuando no hay espacio encima.

No hay modificadores.

- `.luz-tooltip`: Envuelve el control y el tooltip, y muestra este al pasar el puntero o al enfocar un elemento de su interior.
- `.luz-tooltip__text`: El tooltip: una línea sobre la superficie intensa, con sombra

### Cómo funciona
Solo CSS, desde `components/tooltip.css`: el tooltip se muestra mientras el puntero está sobre el contenedor o este tiene el foco.

- Permanece abierto mientras el puntero se mueve del control al tooltip.
- Aparece y desaparece gradualmente durante `--luz-duration-fast`, y se muestra de inmediato cuando se reduce el movimiento.
- El tooltip no admite saltos de línea: mantenlo breve o podría desbordarse en una pantalla estrecha.
- **Mejora progresiva:** en los navegadores compatibles con el posicionamiento de anclajes CSS (Chrome y Edge 125, Safari 26, Firefox 147: disponible recientemente, pero aún no de forma generalizada), el tooltip se ancla a su control (`anchor-scope` y los desplazamientos de `anchor()`) y cambia de lado para colocarse debajo si no hay espacio encima. Fuera de un contenedor de tamaño, deja de quedar recortado por un antecesor que oculte el desbordamiento; dentro de uno, como el contenedor de una tabla o un reproductor, se coloca y recorta según ese cuadro, como antes. En los demás navegadores permanece arriba, como antes: las reglas están dentro de `@supports`, sin script.

### Sin JavaScript
No cambia nada: el tooltip no tiene script.

### Teclado y ARIA
Enfoca el control con Tab para mostrar el tooltip; aparta el foco para ocultarlo.

- `aria-describedby` en el control apunta al tooltip, para que los lectores de pantalla lo lean después del nombre del control.
- El tooltip tiene `role="tooltip"` y nunca recibe el foco.
- El control conserva su propio nombre: el tooltip es una descripción, no una etiqueta.

### Cuándo usarlo
Usa un tooltip para añadir una explicación breve a un control cuya etiqueta es clara, pero concisa.

### Cuándo no usarlo
No incluyas en un tooltip nada esencial, largo o interactivo.

- Las pantallas táctiles no tienen efecto hover: pon en la página la información que se necesite, como indicación ([campos de formulario](https://nandovejer.github.io/luz/es/docs/components/form/)).
- No uses nunca un tooltip como único nombre de un botón con icono.
- No incluyas enlaces ni botones.
