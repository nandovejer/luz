# Submenú

Agrupa algunos enlaces de una cabecera bajo un mismo botón para que la fila de enlaces siga siendo corta.

### Problemas conocidos
Un submenú es un `<details>` nativo, que no tiene tecla Esc ni se cierra al hacer clic en otro lugar: se cierra al volver a pulsar su botón o al abrir otro (en los navegadores que admiten `name` en `<details>`: Chrome y Edge 120, Safari 17.2 y Firefox 130; en los anteriores pueden quedar varios abiertos a la vez). A partir de 769 px, un cuadro abierto queda por encima de la parte superior de la página hasta que se cierre y, si sigues pulsando Tab, un enlace de la página que hay detrás puede quedar oculto (criterio de éxito 2.4.11 de WCAG 2.2, foco no oculto).

Esto no ocurre en el menú a 768 px o menos: los enlaces siguen el flujo y Esc cierra todo el menú. No se ha probado con un lector de pantalla.

### Copiar el marcado
Un elemento de la lista de la [barra de navegación](https://nandovejer.github.io/luz/es/docs/components/navbar/) de core, en una cabecera de [landing](https://nandovejer.github.io/luz/es/docs/landing/header/) o de [CMS](https://nandovejer.github.io/luz/es/docs/cms/header/), cuyo contenido es un `<luz-submenu>` alrededor de un `<details>`: su `<summary>` es el botón y, a continuación, hay una lista de enlaces. No necesita clases: la etiqueta es el bloque y sus partes se identifican por su posición.

Asigna el mismo `name` a todos los submenús de la cabecera para que, al abrir uno, se cierren los demás.

Submenu markup
```html
<nav class="luz-navbar" id="site-nav" aria-label="Main" popover>
  <ul class="luz-navbar__list">
    <li><a class="luz-navbar__link" href="/" aria-current="page">Home</a></li>
    <li>
      <luz-submenu>
        <details name="site-menu">
          <summary>Wines</summary>
          <ul>
            <li><a class="luz-navbar__link" href="/wines/red/">Red wines</a></li>
            <li><a class="luz-navbar__link" href="/wines/white/">White wines</a></li>
          </ul>
        </details>
      </luz-submenu>
    </li>
    <li><a class="luz-navbar__link" href="/visits/">Visits</a></li>
  </ul>
</nav>
```

### Variantes y opciones
No hay variantes. Los atributos son los del navegador.

- `<luz-submenu>`: Rodea el `<details>` con `display: contents`: no dibuja ningún cuadro ni añade un rol. El `<summary>` tiene el aspecto de los enlaces de al lado, con un chevrón; la lista de enlaces queda indentada debajo y, a partir de 769 px, aparece un cuadro también debajo.
- `name`: El mismo valor en todos los submenús de la cabecera: al abrir uno, se cierran los demás. Los navegadores que no lo admiten los dejan abiertos.
- `open`: Lo establece el navegador. No lo escribas en el marcado: un submenú abierto en todas las páginas las ocultaría.

### Cómo funciona
CSS de `@luz-ds/site` y un `<details>` nativo. No usa JavaScript: ningún script define la etiqueta `<luz-submenu>`.

- El navegador lo abre y lo cierra, e informa a las tecnologías de asistencia de si está abierto. Se abre al hacer clic o tocar el botón, o al pulsar Enter o Espacio: nunca al pasar el puntero, así no se abre por accidente y funciona igual en una pantalla táctil.
- A 768 px o menos, dentro del menú de la cabecera, los enlaces del grupo se abren en el flujo, debajo del botón y con sangría, y empujan hacia abajo los enlaces siguientes.
- A partir de 769 px, cuando los enlaces de la cabecera están en una fila, se abren en un cuadro debajo del botón, por encima de la página, sin desplazarla. El cuadro del último elemento se abre hacia el inicio de la fila para que quepa en la ventana, en ambas direcciones de escritura.
- El chevrón se dibuja con dos bordes y no tiene texto: el estado es el que expone el navegador.
- No usa la API de popover: un popover aparece en la capa superior, así que no podría abrirse dentro del menú.

### Sin JavaScript
No cambia nada: no hay ningún script. Los enlaces son enlaces normales.

### Teclado y ARIA
- **Orden:** un submenú cerrado ocupa una parada: su botón. Cuando está abierto, sus enlaces aparecen justo después y, a continuación, el siguiente elemento de la cabecera.
- **Teclas:** Enter o Espacio en el botón lo abre y lo cierra; el foco permanece en el botón. Tab y Shift+Tab recorren los enlaces. Esc no hace nada en un submenú (consulta Problemas conocidos); en el menú de la cabecera a 768 px o menos, lo cierra y devuelve el foco al botón del menú.
- **Nombres:** el nombre del botón es su texto. El navegador expone el estado expandido de `<summary>`: no escribas `aria-expanded`, `role="menu"` ni `role="menuitem"`; son enlaces de un punto de referencia de navegación, no un menú de aplicación.
- **Página actual:** pon `aria-current="page"` en el enlace de la página, también dentro del submenú.

### Cuándo usarlo
Úsalo cuando la cabecera necesite más enlaces de los que caben en una fila corta y algunos pertenezcan al mismo grupo: tipos de vino, páginas sobre la empresa.

### Cuándo no usarlo
No lo uses para un único enlace ni para ocultar páginas que necesita la mayoría de visitantes: ponlas en la propia fila.

- No anides un submenú dentro de otro: dos niveles ocultan páginas y son difíciles de usar con el puntero y el teclado.
- No pongas acciones, formularios ni ajustes: contiene enlaces a páginas. Para las acciones, usa botones o un [menú desplegable](https://nandovejer.github.io/luz/es/docs/components/dropdown/).
- Si cada grupo tiene muchos enlaces, crea una página para cada grupo y enlázala: un submenú largo es una página dentro de un cuadro.

Sustituye la navegación desplegable creada con un script y el menú que aparece al pasar el puntero. No elimina nada de LUZ.
