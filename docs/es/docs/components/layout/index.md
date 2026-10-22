# Objetos de maquetación

Organiza bloques en una pila, una fila o una cuadrícula; coloca elementos junto a una imagen o agrupa acciones, y estructura la página con su barra fija mediante las clases o-*

### Ejemplos

`.o-shell`, `.o-main` y `.o-container` se aplican a toda la página: [esta página los usa](https://nandovejer.github.io/luz/es/docs/components/layout/#page-nav).

### Elige un objeto

Los objetos solo organizan la maquetación: no aplican color ni tipografía. El espaciado procede de los tokens de espacio.

- `.o-stack`: Una columna, con 12 px entre elementos
- `.o-row`: Una fila que salta de línea, con los elementos centrados en vertical y 12 px entre ellos
- `.o-grid`: Una cuadrícula con espacios de 16 px; define las columnas con tu propio `grid-template-columns` o con uno de los modificadores siguientes
- `.o-grid--auto`: Tantas columnas iguales como quepan, ninguna más estrecha que `--luz-grid-min` (16 rem de forma predeterminada): la cuadrícula se redistribuye sola y no necesita puntos de ruptura
- `.o-grid--2`, `.o-grid--3`, `.o-grid--4`: Ese número de columnas iguales por encima de 768 px; una columna a 768 px o menos
- `.o-grid--split`: Dos columnas iguales cuando cada una alcanza `--luz-grid-min` (16 rem de forma predeterminada), y una por debajo: una sección destacada con su imagen o dos características en paralelo. Con texto más grande, se apilan automáticamente
- `.o-media`, `.o-media__body`: Un elemento de tamaño fijo, como un avatar, junto al contenido, que ocupa el ancho restante
- `.o-container`: El ancho del contenido (`--luz-content-max`, 1100 px) y el relleno de la página; menos relleno a 640 px o menos
- `.o-container--inline`: Solo el ancho del contenedor y los márgenes laterales, sin relleno arriba ni abajo: la fila de una barra, para que su contenido empiece donde empieza el de la página
- `.o-page`: Una página sin barra lateral: una columna de al menos la altura de la ventana cuyo `<main>` crece, de modo que el pie quede al fondo en las páginas cortas. Antes de la cabecera puede haber cualquier número de bandas
- `.o-sticky`: Una barra que permanece arriba mientras se desplaza la página, en una ventana de al menos 30 rem de alto, con un relleno de desplazamiento que mantiene fuera de ella lo que se alcanza con Tab
- `.o-actions`: Dos o tres botones o enlaces relacionados en una fila que salta de línea, separados por 8 px; a 640 px o menos, una columna de acciones de ancho completo cuyas etiquetas pueden saltar de línea
- `.o-shell`: La maquetación de la aplicación: una columna de barra lateral (`--luz-sidebar-width`) junto al área principal y un pie que ocupa todo el ancho; una sola columna a 768 px o menos
- `.o-main`: El área principal dentro de `.o-shell`

### La página y sus barras

Una página sin barra lateral usa `.o-page`: primero las bandas que haya (un aviso, la pregunta sobre cookies), y después la cabecera, `<main>` y el pie. La fila de la cabecera es `.o-container.o-container--inline`, para que el nombre del sitio empiece donde empieza el contenido, y `.o-sticky` mantiene la cabecera arriba.

Page markup
```html
<body>
  <a class="luz-skip-link" href="#main-content">Skip to main content</a>
  <div class="o-page">
    <header class="o-sticky">
      <div class="o-container o-container--inline o-row">…</div>
    </header>
    <main id="main-content" class="o-container o-stack" tabindex="-1">…</main>
    <footer>
      <div class="o-container o-container--inline o-row">…</div>
    </footer>
  </div>
</body>
```

- Los objetos solo organizan la maquetación: tu CSS o la cabecera de un paquete para un tipo de sitio se encargan de la superficie y el separador de la cabecera.
- `--luz-bar-h` es la altura de una barra de una fila con controles de 44 px y el tamaño de texto predeterminado: el control, dos rellenos de 4 px y un separador de 1 px. El panel de la [barra de navegación](https://nandovejer.github.io/luz/es/docs/components/navbar/) se abre a esa altura si no hay nada que lo ancle.
- Con `.o-sticky` en la página, el relleno de desplazamiento de `<html>` es el mayor de `--luz-bar-h` y 3.5em, más medio control: un campo al que llegas con Tab o el destino del [enlace para saltar](https://nandovejer.github.io/luz/es/docs/components/skip-link/) se detiene debajo de la barra. Es un mínimo: una barra que ocupa varias filas con el texto ampliado es más alta, y Safari puede dejar un campo parcialmente oculto debajo al ampliar el texto al 300 por ciento.
- Por debajo de 30 rem de alto de ventana, la barra se desplaza con la página, así que nunca ocupa la mayor parte de una pantalla baja.

### Acciones y cuadrícula dividida

Split grid and actions markup
```html
<section class="o-grid o-grid--split">
  <div class="o-stack">
    <h1>…</h1>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="/register/">Register now</a>
      <a class="luz-btn luz-btn--outline" href="/programme/">See the programme</a>
    </div>
  </div>
  <div class="luz-image">…</div>
</section>

<!-- two columns only when each gets 24 rem -->
<section class="o-grid o-grid--split hero">…</section>
<style>.hero { --luz-grid-min: 24rem; }</style>
```

- Una acción principal por grupo y, si hay otra opción, una segunda secundaria con contorno. En la columna estrecha, la principal va primero, como en el orden de origen.
- Un `.luz-btn` dentro de `.o-actions` permite que la etiqueta salte de línea en la columna estrecha, para que nunca se salga de la ventana.

### La cuadrícula

LUZ no tiene un sistema de 12 columnas: una cuadrícula de contenido consta de unas pocas columnas iguales, que crea `.o-grid`. Usa `.o-grid--auto` cuando los elementos deban decidir cuántas caben, como las tarjetas; usa `.o-grid--2` a `--4` cuando el número forme parte del diseño.

Grid markup
```html
<!-- as many columns as fit, each at least 16 rem -->
<div class="o-grid o-grid--auto">…cards…</div>

<!-- at least 12 rem: set the property in your own CSS -->
<div class="o-grid o-grid--auto gallery">…</div>
<style>.gallery { --luz-grid-min: 12rem; }</style>

<!-- three columns above 768 px, one below -->
<div class="o-grid o-grid--3">…</div>
```

- Los elementos conservan el orden de origen: la cuadrícula no los reordena, así que el orden de lectura y de tabulación coincide con el de la página.
- Las columnas usan `minmax(0, 1fr)`, así que una palabra larga o una tabla ancha dentro de un elemento no pueden ensanchar la cuadrícula más que su contenedor.
- Para una maquetación que dependa del ancho de una tarjeta y no de la ventana, coloca la cuadrícula en un contenedor y ajusta allí el tamaño de los elementos; los objetos no consultan el contenedor.

### Listas

Si los elementos forman una lista (entradas, ponentes, etiquetas), aplica `.o-grid`, `.o-stack` o `.o-row` al propio `<ul>` o `<ol>`. El objeto elimina las viñetas y la sangría, pero los elementos siguen siendo una lista: el lector de pantalla indica cuántos hay y permite saltarlos.

List grid markup
```html
<ul class="o-grid o-grid--auto">
  <li class="luz-card">…</li>
  <li class="luz-card">…</li>
</ul>
```

- Safari puede eliminar el rol de lista de una lista sin viñetas que esté fuera de un `<nav>`. Asigna un encabezado a cada elemento, como en las tarjetas, para que se pueda seguir recorriendo la lista.
- No necesitas ninguna regla propia. Dentro de [texto corrido](https://nandovejer.github.io/luz/es/docs/components/prose/), que devuelve las viñetas a las listas, las listas con un objeto siguen sin tenerlas.

### Copiar el marcado

Media object markup
```html
<div class="o-media">
  <span class="luz-avatar luz-avatar--md" aria-hidden="true">AB</span>
  <div class="o-media__body">
    <p>Ana Belén</p>
  </div>
</div>
```

App shell markup
```html
<body class="o-shell">
  <nav class="luz-sidebar" aria-label="Main">…</nav>
  <main class="o-main" id="main-content">
    <div class="o-container">…</div>
  </main>
  <footer>…</footer>
</body>
```

El pie es un `<footer>` normal, que core coloca de lado a lado en la parte inferior: nada de esto necesita site. Para páginas completas sin barra lateral, usa [`.o-page`](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-page).

[Qué necesita cada paquete](https://nandovejer.github.io/luz/es/docs/get-started/structure/#needs) enumera todos los elementos.
