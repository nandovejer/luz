# Contenido principal y secciones

Da ritmo a una página de landing: espacio amplio entre los bloques del contenido principal, menos espacio dentro de cada sección, con su encabezado, y un resplandor opcional detrás de la página.

### Problemas conocidos
No se conocen problemas del contenido principal ni de las secciones. Una sección sobre la [banda](https://nandovejer.github.io/luz/es/docs/components/band/#known-issues) de core tiene los problemas de esta.

### Copiar el marcado
Main and sections markup
```html
<body class="o-page luz-landing-glow">
  <a class="luz-skip-link" href="#main-content">Skip to content</a>
  <!-- the header -->
  <main id="main-content" class="o-container o-stack luz-landing-main" tabindex="-1">
    <!-- the hero -->
    <section class="o-stack luz-landing-section" aria-labelledby="programme-title">
      <h2 id="programme-title">Programme</h2>
      <p>Twelve talks and six workshops over two days.</p>
    </section>
    <section class="o-stack luz-landing-section luz-band" aria-labelledby="last-seats-title">
      <h2 id="last-seats-title">Registration closes on 30 April</h2>
      <div class="o-actions">
        <a class="luz-btn luz-btn--primary" href="#register">Register now</a>
      </div>
    </section>
  </main>
  <!-- the footer -->
</body>
```

Section head markup
```html
<section class="o-stack luz-landing-section" aria-labelledby="why-title">
  <p class="luz-landing-section__eyebrow">Why teams switch</p>
  <h2 class="luz-landing-section__title" id="why-title">One count for <em>every</em> shelf</h2>
  <p class="luz-landing-section__lead">Acme Stock reads each sale as it happens, in every shop.</p>
  <!-- the content -->
</section>
```

### Variantes y opciones
Clases de landing sobre los objetos de core, el encabezado de una sección y dos propiedades ajustables. Una sección destaca sobre la [banda](https://nandovejer.github.io/luz/es/docs/components/band/) de core.

- `.luz-landing-main`: En `main.o-container.o-stack`: 64 px (`--luz-space-3xl`) entre los bloques y después del último; ninguno antes del primero, porque el hero ya incluye el suyo.
- `.luz-landing-section`: En `section.o-stack`: 16 px (`--luz-space-md`) entre sus elementos.
- `.luz-landing-section__eyebrow`: Sobre el título: una etiqueta breve, como la etiqueta superior del hero.
- `.luz-landing-section__title`: El título, un tamaño menor que el del hero: 3xl; 2xl por debajo de 1024 px y xl a 640 px o menos.
- `.luz-landing-section__lead`: Una o dos frases de hasta 70 caracteres de ancho, en color de texto secundario; tamaño lg y base a 640 px o menos.
- `--luz-landing-title-accent`: Una propiedad ajustable: el color del `em` del título de un hero o una sección. Si no se define, usa el color del título.
- `.luz-landing-glow`: En el elemento `.o-page`: un tinte sutil de la marca arriba, en la esquina donde empieza la lectura, sobre un degradado desde la superficie de la página hasta la superficie atenuada; se elimina al imprimir.
- `--luz-landing-glow-x`: Una propiedad ajustable del elemento con resplandor: indica dónde se sitúa el tinte en el borde superior; `0%` a la izquierda y `100%` a la derecha, en ambas direcciones. Si no se define, va al borde inicial.

### Cómo funciona
CSS de `@luz-ds/landing` sobre los objetos de core. No usa JavaScript y `@luz-ds/site` es opcional.

- `.o-container` de core da al contenido principal su ancho y sus márgenes interiores, y `.o-stack` dispone los elementos en columna; la capa de landing va después de los objetos de core, así que prevalecen sus separaciones.
- El tinte del resplandor va en el borde inicial: arriba a la izquierda en una página de izquierda a derecha y arriba a la derecha en una de derecha a izquierda. `--luz-landing-glow-x` lo desplaza; `50%` lo centra en ambas direcciones.
- El encabezado comparte sus reglas y la propiedad ajustable `em` con el [hero](https://nandovejer.github.io/luz/es/docs/landing/hero/).
- Usa una sección en un `<section>` cuando el grupo tenga su propio encabezado, o en un `<div>` cuando no lo tenga.

### Sin JavaScript
No cambia nada: el contenido principal, las secciones y el resplandor usan CSS.

### Teclado y ARIA
Ninguno de los tres tiene una interacción ni un rol propios.

- El `<main>` es el punto de referencia principal y el destino del enlace para saltar al contenido: asígnale `id` y `tabindex="-1"`.
- Un `<section>` con nombre mediante `aria-labelledby` se convierte en un punto de referencia de región; pon nombre solo a las secciones a las que se quiera saltar.
- El resplandor no transmite significado: si desaparece (con colores forzados o al imprimir), no se pierde nada.

### Cuándo usarlo
Usa el contenido principal y sus secciones en todas las páginas de un sitio de landing para mantener el mismo espacio entre bloques. Usa el resplandor en una página corta, como una página de inicio o de registro, para darle calidez.

### Cuándo no usarlo
No uses una sección para separar párrafos de texto seguido: los estilos del texto ya lo hacen.

- Para colocar bloques uno al lado del otro, usa los [objetos de cuadrícula](https://nandovejer.github.io/luz/es/docs/components/layout/) de core, como `ul.o-grid.o-grid--split` para varias características con la misma importancia.
- No uses el resplandor en páginas largas ni detrás de una banda: el tinte compite con ella.
