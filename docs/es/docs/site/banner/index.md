# Banner

Comunica una sola cosa breve a todas las personas que visitan el sitio, en la parte superior de la página, como una oferta, un evento o un mantenimiento previsto.

### Problemas conocidos
No se puede cerrar: un botón de cierre necesita un script, y para recordar una elección entre páginas hace falta almacenamiento. Mantén el banner breve y elimínalo del marcado cuando ya no haga falta.

En los navegadores sin posicionamiento de anclas CSS (anteriores a Chrome y Edge 125, Safari 26 y Firefox 147), el menú de la cabecera, a 768 px o menos, se abre en la parte superior de la ventana; antes de desplazarse por la página, cubre parte de la cabecera bajo el banner. Se cierra con Escape o al hacer clic fuera.

### Copiar el marcado
Un `<luz-banner>` alrededor de un `<section>`, cuyo nombre indican sus primeras palabras. Va después del [enlace para saltar al contenido](https://nandovejer.github.io/luz/es/docs/components/skip-link/) y del [consentimiento de cookies](https://nandovejer.github.io/luz/es/docs/site/consent/), y antes de la cabecera de la página (de una [landing](https://nandovejer.github.io/luz/es/docs/landing/header/) o de un [CMS](https://nandovejer.github.io/luz/es/docs/cms/header/)).

Banner markup
```html
<a class="luz-skip-link" href="#main">Skip to main content</a>
<luz-banner>
  <section aria-labelledby="banner-label">
    <p><strong id="banner-label">Open day.</strong> Visit the winery on Saturday 25 October,
      from 11:00 to 18:00. <a href="/visits/">Book a visit</a></p>
  </section>
</luz-banner>
<header>…</header>
```

### Variantes y opciones
- `<luz-banner>`: Envuelve un solo `<section>`, que se convierte en una franja del ancho de su contenedor, con una superficie atenuada y una línea inferior, en texto sans pequeño. El texto empieza donde empieza la fila de la cabecera. Una etiqueta que ningún script define: no tiene clase ni rol propios.
- `tone="warning"`: En la etiqueta, el único tono: los colores de aviso, para algo que impide a quien visita la página hacer lo que venía a hacer, como un mantenimiento. Exprésalo también con palabras: «Mantenimiento previsto». Cualquier otro valor deja la franja sencilla.

### Cómo funciona
CSS de `@luz-ds/site`. Sin JavaScript: `<luz-banner>` es una etiqueta que ningún script define.

- Es una franja de la página, dentro del flujo: se desplaza con la página y una cabecera `.o-sticky` permanece fija arriba, debajo. No cubre la página.
- Su relleno en línea alinea el texto con la fila de la cabecera, hasta un ancho de `--luz-content-max`, en ambas direcciones de escritura.
- No tiene botón de cierre. Para cerrarlo de forma permanente se necesita un script y un valor almacenado en el navegador; nunca se muestra un botón que no hace nada sin un script. Un banner dura poco: elimina su marcado cuando termina el evento.
- No hay un tono de éxito o error: un banner no responde a algo que haya hecho quien visita la página. Para eso, usa una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/) en la página.

### Sin JavaScript
No cambia nada: no hay ningún script.

### Teclado y ARIA
- **Orden:** su enlace va después del enlace para saltar al contenido y antes de la cabecera.
- **Región:** un `<section>` con nombre es una región, así que el lector de pantalla la incluye entre las regiones de la página; asígnale un nombre con `aria-labelledby` que apunte a sus primeras palabras. Si solo contiene esa frase, basta un `<div>` sin nombre.
- **No es una región dinámica:** aparece al cargar la página, así que no necesita `role="status"` ni `role="alert"`; el lector de pantalla lo lee junto con el resto de la página.

### Cuándo usarlo
Úsalo para comunicar durante unos días y en todas las páginas una sola cosa breve y oportuna que deba saber quien visita el sitio: una oferta, un evento, un mantenimiento previsto o un cambio de horario.

### Cuándo no usarlo
No lo uses para algo que corresponda a una sola página o a una persona: inclúyelo en la página o responde con una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/) o un [aviso emergente](https://nandovejer.github.io/luz/es/docs/components/toast/).

- No muestres dos banners a la vez ni dejes uno durante meses: si una franja nunca cambia, la gente deja de leerla.
- No lo uses para pedir consentimiento para las cookies: usa el banner de [consentimiento de cookies](https://nandovejer.github.io/luz/es/docs/site/consent/).
- No incluyas un formulario ni más de un enlace.

Sustituye las barras de anuncios que cada sitio crea con su propio CSS. No elimina nada de LUZ.
