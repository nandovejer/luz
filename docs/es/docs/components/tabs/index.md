# Pestañas

Permite cambiar entre paneles de contenido relacionado en un mismo lugar; sin JavaScript, los paneles se muestran apilados en secciones.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Tabs markup
```html
<nav class="luz-tabs" aria-label="Project">
  <a class="luz-tab" href="#project-summary">Summary</a>
  <a class="luz-tab" href="#project-settings">Settings</a>
</nav>
<div class="luz-tabpanel" id="project-summary">…</div>
<div class="luz-tabpanel" id="project-settings">…</div>
```

Tabs script code
```js
import { initTabs } from "@luz-ds/core/tabs";
initTabs();
```

### Variantes y opciones
Un solo aspecto. La primera pestaña que se abre es la primera que cumpla una de estas condiciones:

- 1: La pestaña cuyo panel contiene el elemento indicado en el fragmento de la URL
- 2: Una pestaña con `aria-selected="true"` o `.is-active` en el marcado
- 3: La primera pestaña

### Cómo funciona
Fila de enlaces internos a los paneles, con estilos de `components/tabs.css` y mejorada por `tabs.js`.

- `initTabs()` añade el patrón de pestañas de ARIA: `role="tablist"`, `"tab"` y `"tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby` y un `tabindex` itinerante. Oculta los paneles inactivos. `luz.js` lo ejecuta.
- Un enlace a un elemento dentro de un panel oculto abre su pestaña al cargar, al producirse `hashchange` y al hacer clic.
- Los paneles inactivos usan `hidden="until-found"` cuando el navegador lo admite, de modo que la búsqueda en la página puede encontrarlos y abrir su pestaña.
- `activateTab(tab)` selecciona una pestaña desde tu propio script.

### Sin JavaScript
Las pestañas son una fila de enlaces y todos los paneles se muestran apilados en orden. Cada enlace salta a su panel.

Asigna un encabezado a cada panel para que la página apilada siga siendo fácil de leer.

### Teclado y ARIA
Tab entra en la fila de pestañas y lleva a la seleccionada; otra pulsación de Tab sale de la fila hacia el panel.

- Las flechas izquierda y derecha (o arriba y abajo) mueven el foco a la pestaña siguiente y la seleccionan; Home y End llevan a la primera y a la última.
- Espacio o Enter selecciona la pestaña enfocada.
- En texto de derecha a izquierda, las flechas izquierda y derecha siguen la dirección de lectura.
- Asigna un nombre a la fila de pestañas con `aria-label`; lo conserva cuando se convierte en una lista de pestañas.

### Cuándo usarlo
Usa pestañas para cambiar entre paneles del mismo nivel que no sea necesario ver a la vez, como el resumen, los ajustes y los registros de un servicio.

### Cuándo no usarlo
No uses pestañas para cambiar de página ni para ocultar contenido que se necesite ver de una vez.

- Para cambiar de página, usa una [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/) o enlaces en la cabecera.
- Para pasos que deban seguirse en orden, usa páginas separadas.
- Más de cinco o seis pestañas no caben en un móvil: usa secciones con encabezados.
