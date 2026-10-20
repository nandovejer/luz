# Hero

Abre una página de inicio o landing con un título, una frase, las acciones principales y una imagen opcional.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Hero markup
```html
<section class="luz-landing-hero o-grid o-grid--split" aria-labelledby="hero-title">
  <div class="luz-landing-hero__copy">
    <p class="luz-landing-hero__eyebrow">12 and 13 May 2027 · Seville</p>
    <h1 class="luz-landing-hero__title" id="hero-title">Acme Summit 2027</h1>
    <p class="luz-landing-hero__lead">Two days of talks and workshops for retail teams.</p>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="#register">Register</a>
      <a class="luz-btn luz-btn--outline" href="#programme">See the programme</a>
    </div>
  </div>
  <div class="luz-landing-hero__media">
    <div class="luz-image luz-image--4x3">
      <img src="/img/venue-1280.jpg" width="1280" height="960" alt="The main hall, full, before the opening talk" fetchpriority="high" decoding="async">
    </div>
  </div>
</section>
```

### Variantes y opciones
Dos modificadores, `--centered` y `__media--bleed`, como en la [plantilla de página de producto](https://nandovejer.github.io/luz/es/docs/landing/templates/#product-page). La etiqueta superior, la entradilla y la imagen son opcionales; sin imagen, el texto ocupa todo el ancho.

El bloque es una clase de landing sobre la cuadrícula dividida de core.

- `.luz-landing-hero`: En un `<section>` con `.o-grid.o-grid--split` de core: espacio encima, separación entre elementos y columnas de al menos 24 rem (`--luz-grid-min`); cuando cada una dispone de 24 rem, son dos columnas iguales; si no, una debajo de otra.
- `.luz-landing-hero--centered`: Una columna a cualquier ancho: el texto mide como máximo 48 rem, está centrado y también lo están sus acciones; la imagen queda debajo.
- `.luz-landing-hero__copy`: El texto y las acciones, primero en el código fuente.
- `.luz-landing-hero__eyebrow`: Una línea breve sobre el título, en versalitas pequeñas con tipografía mono; en árabe se usa sans.
- `.luz-landing-hero__title`: El título: tipografía de encabezado, tamaño 4xl y líneas equilibradas; 3xl por debajo de 1024 px y 2xl a 640 px o menos.
- `.luz-landing-hero__lead`: Una o dos frases de hasta 70 caracteres de ancho, en color de texto secundario; tamaño xl, lg por debajo de 1024 px y base a 640 px o menos.
- `.luz-landing-hero__media`: La segunda columna, que contiene el [marco de imagen](https://nandovejer.github.io/luz/es/docs/components/image/) de core.
- `.luz-landing-hero__media--bleed`: En un hero centrado, la imagen va de un extremo al otro de la ventana, más allá de los márgenes interiores de la página, sin desplazamiento lateral. El marco tiene una proporción de 16:9, salvo que indiques otra.

### Cómo funciona
Un `<section>` con el nombre de su título, maquetado con la cuadrícula dividida de core y con estilos de `@luz-ds/landing`. No usa JavaScript y `@luz-ds/site` es opcional.

- Las columnas son la [cuadrícula dividida](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-actions) intrínseca de core: dependen del espacio disponible para el hero, no del ancho de la ventana. Un hero tan ancho como la página se divide a partir de unos 900 px de ventana; en una columna estrecha o con texto más grande permanece en una sola columna.
- El orden es el del código fuente: el texto va primero, a la izquierda en una página de izquierda a derecha y a la derecha en una de derecha a izquierda.
- Las acciones son el [grupo de acciones](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-actions) de core, `.o-actions`: a 640 px o menos, los botones se apilan y ocupan todo el ancho.
- El desbordamiento mide la ventana sin una unidad de viewport, que cuenta la barra de desplazamiento y mueve la página lateralmente: la raíz de la página se convierte en un contenedor de tamaño (`container-type: inline-size`). La columna debe centrarse respecto a la ventana, como hace `.o-container` de core.
- El `em` de un título toma el color de `--luz-landing-title-accent`, que por defecto es el del título.
- Las clases solo cambian el aspecto. El título debe ser el `<h1>` de la página.

### Sin JavaScript
No cambia nada: el hero es HTML y CSS.

### Teclado y ARIA
El hero no tiene interacción propia: Tab recorre sus enlaces en el orden del código fuente.

- `aria-labelledby` en `<section>` apunta al título, así que el hero es una región con el nombre de la página.
- Déjalo al principio de `<main>` para que el enlace para saltar al contenido llegue justo antes.

### Cuándo usarlo
Usa un hero al principio de una página de inicio, una landing o una portada para explicar en pocas palabras de qué trata el sitio o el evento y qué hacer primero.

### Cuándo no usarlo
No lo uses en una página a la que se llega para leer o completar una tarea: utiliza un `<h1>` sencillo y una entradilla, que ocupan menos espacio.

- Un hero por página y solo al principio.
- No lo uses para un mensaje en medio de la página: utiliza una [sección](https://nandovejer.github.io/luz/es/docs/landing/section/) y, si tiene que destacar, una [banda](https://nandovejer.github.io/luz/es/docs/components/band/) de core.
