# Barra lateral

Contiene la navegación principal de un sitio o una aplicación y se convierte en un panel lateral en pantallas pequeñas.

### Problemas conocidos
En un navegador sin la API de popover, la navegación no se convierte en un panel lateral: permanece visible sobre el contenido en pantallas pequeñas.

### Copiar el marcado
Sidebar with its drawer button markup
```html
<header>
  <button class="luz-nav-toggle" type="button" popovertarget="site-nav" aria-label="Menu">
    <span class="luz-nav-toggle__bar"></span>
    <span class="luz-nav-toggle__bar"></span>
    <span class="luz-nav-toggle__bar"></span>
  </button>
</header>

<nav class="luz-sidebar" id="site-nav" popover aria-label="Main">
  <div class="luz-sidebar__section">
    <div class="luz-sidebar__section-label">Account</div>
    <a class="luz-sidebar__link is-active" href="/profile/" aria-current="page">Profile</a>
    <a class="luz-sidebar__link" href="/billing/">Billing</a>
  </div>
</nav>
```

Sidebar script code
```js
import { initSidebar } from "@luz-ds/core/sidebar";
initSidebar();
```

### Variantes y opciones
- `.luz-sidebar`: Columna de navegación, con los colores de la barra lateral
- `popover` en `.luz-sidebar`: La convierte en un panel lateral con 768 px o menos
- `.luz-sidebar__brand`, `__brand-name`, `__logo`, `__version`: Bloque de marca opcional en la parte superior
- `.luz-sidebar__section`, `__section-label`: Grupo de enlaces y su etiqueta
- `.luz-sidebar__link`: Enlace
- `data-luz-spy` en cualquier elemento: No forma parte de la barra lateral: el indicador de desplazamiento también marca los enlaces a secciones de la página dentro de ella, como una tabla de contenidos con tu propio diseño
- `.is-active` en un enlace: Resalta el enlace actual con el grosor y el color; acompáñalo de `aria-current="page"`
- `.luz-sidebar__footer`: Fijado en la parte inferior, por ejemplo, para el [selector del modo de color](https://nandovejer.github.io/luz/es/docs/components/mode-switcher/)
- `.luz-nav-toggle`: Botón de menú, visible con 768 px o menos; colócalo al principio de la fila de cabecera
- `.luz-nav-toggle--fixed`: Fija el botón de menú en la esquina superior inicial, en páginas sin cabecera

### Cómo funciona
Punto de referencia `<nav>`, con estilos de `components/sidebar.css`. En pantallas pequeñas es un panel lateral nativo de tipo popover.

- El botón de menú lo abre mediante `popovertarget`, sin scripts. El navegador se encarga de Escape, de cerrarlo al hacer clic fuera, de la capa superior y del estado expandido.
- `initSidebar()` de `sidebar.js` es opcional: marca el enlace de la sección visible en páginas largas (`aria-current="true"`) y cierra el panel al seguir un enlace. `luz.js` lo ejecuta.
- El indicador de desplazamiento localiza los enlaces mediante `.luz-sidebar__link` y `data-luz-spy`: en cualquier elemento (como un `<nav>` de contenidos), sigue todos los enlaces internos que apuntan a una sección de la página (`href="#…"`). El atributo es el punto de conexión; el diseño de esos enlaces es cosa tuya.

### Sin JavaScript
La barra lateral y el panel funcionan. El enlace actual es el que marcas en el marcado; no sigue el desplazamiento.

### Teclado y ARIA
Tab recorre los enlaces en orden. En pantallas pequeñas, el botón de menú abre el panel; Escape o un clic fuera lo cierra y el foco vuelve al botón.

- Si la página tiene más de un `<nav>`, asígnale un nombre con `aria-label`.
- Marca la página actual con `aria-current="page"` y `.is-active`: la clase solo aporta el aspecto visual.
- El botón de menú conserva el nombre «Menú» tanto si el panel está abierto como cerrado; popover expone el estado.

### Cuándo usarlo
Usa una barra lateral para la navegación principal de una aplicación o de un sitio de documentación con muchas secciones.

### Cuándo no usarlo
No uses una barra lateral en un sitio con pocas páginas: la navegación en la cabecera es más sencilla.

- Para mostrar la ruta hasta la página actual, usa [migas de pan](https://nandovejer.github.io/luz/es/docs/components/breadcrumb/).
- Para los paneles de una misma página, usa [pestañas](https://nandovejer.github.io/luz/es/docs/components/tabs/).
