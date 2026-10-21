# Tarjeta

Agrupa unos pocos datos sobre un elemento en una superficie con borde.

### Problemas conocidos
En una tarjeta con enlace, no se puede seleccionar con el ratón el texto del cuerpo, incluido el precio: el enlace del título cubre toda la tarjeta, así que al arrastrar se sigue o se mueve el enlace. La búsqueda en la página, la selección con el teclado y los lectores de pantalla permiten acceder al texto con normalidad.

### Copiar el marcado
Card markup
```html
<article class="luz-card">
  <h3 class="luz-card__title">Database</h3>
  <p class="luz-card__body">48 active connections.</p>
</article>
```

### Variantes y opciones
Una tarjeta, cuatro clases y un modificador. Un enlace en el título convierte toda la tarjeta en un enlace; cualquier otro enlace o botón queda por encima de él.

- `.luz-card`: La superficie: borde, esquinas redondeadas y relleno
- `.luz-card__title`: Tamaño base, seminegrita y color de texto principal
- `.luz-card__body`: Tamaño mediano y color de texto secundario
- `.luz-card__price`: El precio: tamaño base, seminegrita, color de texto principal y cifras del mismo ancho. El precio anterior va dentro de `<s>`
- `.luz-card--featured`: La tarjeta que destaca en el grupo: tiene un borde de 2 px del color de marca y la misma altura que las demás. Indica también el motivo con palabras, por ejemplo, con una etiqueta como «La más elegida»
- `<a>` dentro de `.luz-card__title`: Tarjeta con enlace: el enlace cubre la tarjeta, el título pasa a sans, el borde se oscurece y aparece una sombra al pasar el puntero; un anillo de foco rodea la tarjeta

Combina una tarjeta con los objetos de maquetación y otros componentes sin añadir clases: crea una tarjeta con enlace, coloca un avatar o un icono junto al texto con `.o-media`, añade una imagen encima y una fila de acciones con `.o-row`.

- **Tarjeta con enlace:** coloca `<a>` dentro del encabezado, rodeando su texto. Se permite añadir un segundo enlace o un botón, que quedará por encima del enlace del título: consulta la tarjeta de producto más abajo.
- **Avatar o icono:** `.o-media` lo coloca junto a `.o-media__body`, que contiene el título y el cuerpo. Junto a un nombre, oculta el avatar con `aria-hidden="true"`: repite el nombre.
- **Imagen encima:** coloca el [marco de imagen](https://nandovejer.github.io/luz/es/docs/components/image/) (`.luz-image`) dentro del relleno, con `.u-mb-sm` debajo. El texto alt describe la imagen; si solo repite el título, déjalo vacío (`alt=""`).
- **Acciones:** usa `.o-row` con botones pequeños (`.luz-btn--sm`) o etiquetas (`.luz-tag`) al final de la tarjeta. En una tarjeta con enlace, pon como máximo una acción en forma de botón después del título.

#### Tarjeta de producto

Una tarjeta de tienda incluye una imagen, un título con enlace, un precio y una acción. La acción es un botón dentro de un formulario, así que funciona sin JavaScript; está por encima del enlace del título y recibe sus propios clics.

Product card markup
```html
<article>
  <h4 id="red-wines">Red wines</h4>
  <ul class="o-grid o-grid--auto" aria-labelledby="red-wines">
    <li class="luz-card">
      <div class="luz-image luz-image--4x3 u-mb-sm">
        <picture>…<img src="malbec.jpg" alt="" width="640" height="480" loading="lazy" decoding="async"></picture>
      </div>
      <h5 class="luz-card__title"><a href="/wines/malbec-2021/">Malbec 2021</a></h5>
      <p class="luz-card__body">Bodega Albar · 75 cl</p>
      <p class="luz-card__price"><data value="12.50">12,50 €</data></p>
      <form action="/cart/add" method="post">
        <input type="hidden" name="product" value="malbec-2021">
        <button class="luz-btn luz-btn--primary luz-btn--block" type="submit">Add to cart<span class="u-sr-only"> Malbec 2021</span></button>
      </form>
    </li>
  </ul>
  <output class="u-sr-only" id="cart-status"></output>
</article>
```

- **El botón ocupa todo el ancho de la tarjeta** con `.luz-btn--block`: es fácil pulsarlo con el pulgar y su etiqueta ocupa varias líneas sin salir de la tarjeta, sea cual sea el tamaño del texto.
- **Una acción y un enlace.** El nombre es el enlace; el botón es la acción. Si una tarjeta necesita una segunda acción (añadir a una lista de deseos o comparar), ya no sirve una tarjeta: dirige al lector a la página del producto.
- **El nombre del botón es único.** Primero va el texto visible y luego el nombre del producto en `.u-sr-only`, que repite exactamente el texto del enlace (mantén el espacio delante). Una lista de doce botones llamados «Añadir a la cesta» no dice nada a quien consulta los botones de la página o los dicta por voz.
- **El encabezado identifica la lista:** `aria-labelledby` apunta al `<h4>` que hay encima y las tarjetas usan el siguiente nivel. Core no da estilo a las listas: elimina las viñetas y la sangría con una regla propia (`list-style: none; margin: 0; padding: 0`).
- **El precio anterior va en `<s>`;** oculta visualmente las palabras «Ahora» y «Antes» para que el orden quede claro en el lector de pantalla; la línea que lo tacha no depende del color.
- **Confirma cuando un script añade el artículo:** incluye desde el principio un `<output>` vacío (tiene el role `status`) en la página y escribe «Malbec 2021 añadido a la cesta» en él; el foco se mantiene en el botón. A menudo no se anuncia una región de estado que se crea a la vez que su texto. Sin scripts, se envía el formulario y la página de la cesta confirma la acción.
- **Agotado:** sustituye el formulario por `<span class="luz-tag">Sold out</span>`; no desactives el botón.
- Core no incluye un marco de imagen: usa un elemento `<img>` y define tus propias reglas de tamaño.

#### Tarjeta destacada

En un grupo de planes u ofertas, `.luz-card--featured` destaca la opción que conviene mirar primero. La clase no comunica nada al lector de pantalla, así que la tarjeta incluye una etiqueta de texto que explica el motivo.

Featured card markup
```html
<article class="luz-card luz-card--featured">
  <h4 class="luz-card__title">Two days</h4>
  <p class="luz-card__price"><data value="149">149 €</data></p>
  <p class="luz-card__body">Both days, lunch and the recordings.
    <span class="luz-tag luz-tag--blue">Most chosen</span></p>
  <a class="luz-btn luz-btn--primary luz-btn--block" href="/register/?ticket=two-days">Choose Two days</a>
</article>
```

- **Una sola tarjeta destacada por grupo.** Si todo destaca, nada destaca.
- **El texto es imprescindible.** El borde de 2 px es una pista adicional para quienes pueden verlo y, en colores forzados, la única pista visual; una etiqueta como «La más elegida» o «La mejor relación calidad-precio» llega a todo el mundo. Ponla en el cuerpo o junto al título.
- **Conserva la misma altura que las demás tarjetas:** el píxel adicional del borde se resta del relleno.

### Cómo funciona
Un contenedor al que da estilo `components/card.css`. No necesita JavaScript.

- Usa el elemento que corresponda: `<article>` para un elemento autónomo, `<div>` para un grupo de datos y `<li>` dentro de una lista de tarjetas.
- Aplica la clase del título al nivel de encabezado que corresponda a la estructura de la página.
- Las esquinas se redondean con `--luz-radius-md`, como en una figura o un desplegable.
- El último título o cuerpo no tiene espacio debajo: el relleno es el último espacio de la tarjeta.
- En una tarjeta con enlace, el `::after` del enlace se extiende por toda la tarjeta (`position: absolute; inset: 0`), de modo que al hacer clic en cualquier punto se abre el enlace. La tarjeta usa `position: relative` para contenerlo. Cualquier otro enlace o control dentro de ella (`a`, `button`, `input`, `select`, `textarea`, `summary`) usa `position: relative` con `z-index: 1` para quedar por encima de esa capa y recibir sus propios clics; el enlace del título es el único que nunca se eleva. La etiqueta de un botón ocupa varias líneas dentro de una tarjeta (`white-space: normal`), así que una etiqueta larga o un texto ampliado no se sale. Al pasar el puntero, el borde cambia a `--luz-input-border` y aparece una pequeña sombra; al recibir el foco del teclado, un anillo rodea la tarjeta. El título de una tarjeta con enlace usa una fuente sans, como la navegación o una lista de enlaces; una tarjeta sin enlace conserva la tipografía de los encabezados. Ambos casos se detectan con `:has()`; una tarjeta sin enlace no cambia al pasar el puntero.
- `.luz-card--featured` establece `border-width: 2px` con `--luz-brand-primary` y resta el píxel adicional del relleno, por lo que la tarjeta conserva la altura de las demás. En una tarjeta con enlace, el borde cambia a `--luz-brand-hover` al pasar el puntero y el anillo de foco del teclado queda a 4 px del borde, para que no parezca más grueso.
- Para maquetar tarjetas, usa los [objetos de cuadrícula](https://nandovejer.github.io/luz/es/docs/components/layout/), como la [cuadrícula dividida](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-actions) para colocar dos tarjetas en paralelo.

### Sin JavaScript
No cambia nada: una tarjeta, tenga enlace o no, usa HTML y CSS.

### Teclado y ARIA
Una tarjeta no es interactiva ni recibe el foco.

- En una tarjeta sin enlace, los enlaces y botones interiores conservan su propio comportamiento.
- En una tarjeta con enlace, los enlaces y botones quedan por encima del enlace del título para que el puntero pueda alcanzarlos. Cada elemento tiene su propia posición en el orden de tabulación y su propio anillo; asígnales un nombre único en la página (consulta Tarjeta de producto).
- Una tarjeta con enlace tiene una posición de tabulación para el enlace del título y otra para cada enlace o botón adicional. Enter abre el enlace del título; Enter o Espacio activa un botón. El anillo aparece alrededor del enlace del título y de toda la tarjeta; un botón solo muestra su propio anillo.
- El lector de pantalla identifica el enlace con el título y, después, lee el cuerpo como texto. No añadas `role`, `tabindex` ni `aria-label` a la tarjeta.
- Pon el enlace en el texto del título, nunca alrededor de la tarjeta: un enlace que la rodea usa todas sus palabras como nombre.

### Cuándo usarlo
Usa una tarjeta para agrupar unos pocos datos que se entienden como una unidad, a menudo en una cuadrícula de elementos similares.

- Usa una tarjeta destacada (`.luz-card--featured`) para la opción recomendada de un grupo de planes u ofertas.

### Cuándo no usarlo
No uses una tarjeta para encerrar contenido que no sea un elemento independiente.

- Para mostrar filas de registros con los mismos atributos, usa una [tabla](https://nandovejer.github.io/luz/es/docs/components/table/).
- Para mostrar un mensaje sobre la página, usa una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/).
- Para mostrar una lista de enlaces con una línea de descripción cada uno, usa una lista normal (`<ul>`): una tarjeta por enlace solo añade bordes.
- Si una tarjeta tiene más de una acción además del enlace del título, ya es un formulario o una página: usa la página del elemento, no una tarjeta.
- No pongas una tarjeta dentro de otra.
- No destaques varias tarjetas de un grupo ni uses solo el borde como pista: explica también el motivo con palabras.
