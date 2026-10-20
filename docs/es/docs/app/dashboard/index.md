# Panel de control

La vista general de una aplicación: el título y la acción principal, seguidos de una cuadrícula de paneles que aprovecha el espacio disponible.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
La vista: una fila de título y, después, los paneles. La fila de título es un `<div>` y cada panel empieza con su encabezado.

Dashboard markup
```html
<main class="luz-app-dashboard" id="main-content" tabindex="-1">
  <div class="luz-app-dashboard__head">
    <h1 class="luz-app-dashboard__title">Overview</h1>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="/reports/new/">New report</a>
      <a class="luz-btn luz-btn--secondary" href="/export/">Export data</a>
    </div>
  </div>
  <ul class="o-grid o-grid--auto">
    <li class="luz-card luz-app-dashboard__panel luz-app-dashboard__panel--wide">
      <h2 class="luz-card__title">Sales this month</h2>
      <p class="luz-card__body">…</p>
    </li>
    <li class="luz-card luz-app-dashboard__panel">
      <h2 class="luz-card__title">Stock alerts</h2>
      <p class="luz-card__body">…</p>
    </li>
  </ul>
</main>
```

### Variantes y opciones
Un modificador para el panel. El panel de control es una clase de app aplicada a un `<main>` nativo; la cuadrícula y la tarjeta son de core.

- `.luz-app-dashboard`: En `<main>`: la vista. 32 px de relleno (16 px a 640 px o menos), 24 px entre filas y un contenedor para sus propias consultas de tamaño
- `.luz-app-dashboard__head`: En un `<div>`: el título al principio y las acciones al final, en una fila que puede saltar de línea; a 640 px o menos, en una columna
- `.luz-app-dashboard__title`: El único `<h1>` de la vista: tamaño 2xl, seminegrita y color de texto; xl a 640 px o menos
- `.luz-app-dashboard__panel`: En una `.luz-card` de la cuadrícula: puede encogerse, para que un elemento hijo ancho nunca ensanche la columna
- `.luz-app-dashboard__panel--wide`: Dos columnas cuando el panel de control mide al menos 40 rem de ancho; por debajo, una sola, para no pedir una columna que no cabe
- `.o-grid.o-grid--auto` (core): En `<ul>`: tantas columnas iguales como quepan, ninguna de menos de 18 rem
- `.o-actions` (core): Dos o tres acciones relacionadas: una fila que puede saltar de línea y, a 640 px o menos, una columna de acciones a ancho completo

### Cómo funciona
CSS de `@luz-ds/app` aplicado a la cuadrícula y la tarjeta de core. Sin JavaScript.

- El panel de control asigna `--luz-grid-min: 18rem` a `.o-grid--auto` de core, así que las columnas nunca miden menos de 18 rem y su número depende del espacio: una a 320 px, dos a 768 px y tres a 1280 px junto a una barra lateral.
- El panel de control es un contenedor de tamaño. El panel ancho consulta el ancho del panel de control, no el de la ventana, así que cabe tanto con barra lateral como sin ella. A partir de 40 rem siempre caben dos columnas (dos de 18 rem y un espacio); al ampliar el texto al 200 %, ambas siguen medidas en rem y no se desbordan.
- Los paneles conservan el orden del marcado. No hay empaquetado denso ni se usa `order`: si un panel ancho no cabe en el espacio restante de una fila, empieza en la siguiente y se mantiene la separación. El orden de lectura, el del foco y el visual coinciden.
- Un panel puede encogerse, así que una línea larga de código o una tabla se desplaza dentro de su propio contenedor y no ensancha la columna.
- Los paneles vacíos, en carga o con errores forman parte del contenido del panel: una frase y un enlace, el [indicador de progreso](https://nandovejer.github.io/luz/es/docs/components/progress/) o la [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/) de core. En 0.1 no hay una clase para esqueletos de carga.

### Sin JavaScript
No cambia nada: la cuadrícula, la consulta del contenedor y las tarjetas usan CSS.

### Teclado y ARIA
- **Orden:** el del código fuente: primero las acciones de la fila del título y, después, cada panel. Si un panel es una tarjeta con un enlace, se llega a él mediante ese enlace.
- **Encabezados:** la vista tiene un `<h1>` en la fila del título y cada panel empieza con un `<h2>`. La fila del título es un `<div>`, no un `<header>`.
- **Lista:** los paneles son un `<ul>` de elementos `<li>`; el lector de pantalla indica cuántos hay. Safari puede quitar el rol de lista si no hay marcadores; los encabezados permiten recorrer los paneles.
- **Acciones:** una acción que lleva a otro sitio es un enlace (`<a href>`); una que hace algo en esta página es un `<button type="button">`. Nunca uses `<a>` sin `href`.
- **Puntos de referencia:** el panel de control es el `<main>` de la página, hermano de la [cabecera](https://nandovejer.github.io/luz/es/docs/app/header/). Es el destino del enlace para saltar al contenido y lleva `tabindex="-1"`.

### Cuándo usarlo
Usa el panel de control para una vista que muestre varios aspectos del mismo tema, cada uno lo bastante breve para leerse de un vistazo y con un enlace a su propia página.

- Un resumen, una página de estado o una vista de inicio desde la que consultar y actuar sobre un elemento.
- El panel más importante va primero y es ancho: ocupa el espacio cuando la vista lo tiene.

### Cuándo no usarlo
No lo uses para una vista que sea una única pieza larga: una tabla, un formulario o un documento no son paneles.

- Una acción principal por vista, en la fila del título, nunca en un panel.
- No hagas que un panel sea más alto que los contiguos mediante celdas que ocupen varias filas o empaquetado denso: eso lo desplaza por delante de otros que aparecen antes en el marcado.
- Para una cuadrícula sencilla de tarjetas en una página de contenido, usa la [cuadrícula](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-grid) y la [tarjeta](https://nandovejer.github.io/luz/es/docs/components/card/) de core.
