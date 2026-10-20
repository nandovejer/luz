# Línea de tiempo

Muestra eventos fechados en orden, una tarjeta cada vez sobre una línea de fechas o todos a la vez en una línea vertical; sin JavaScript, es una lista.

### Problemas conocidos
Hay tres cosas pendientes y ninguna se ha probado con un lector de pantalla.

- Los botones Anterior y Siguiente solo se llaman «Anterior» y «Siguiente». El nombre no indica a qué fecha llevan.
- No se ha probado si un lector de pantalla anuncia la tarjeta que aparece al cambiar de elemento.
- La línea de tiempo no se ha probado con ningún lector de pantalla: no se afirma ningún resultado para NVDA, JAWS, VoiceOver, TalkBack ni Orca.

### Copiar el marcado
Una lista ordenada dentro de `<luz-timeline>`. Asigna al elemento `role="group"` y un nombre con `aria-label` para que también se lea sin JavaScript.

Timeline markup
```html
<luz-timeline role="group" aria-label="Releases of the app">
  <ol class="luz-timeline">
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025-03">March 2025</time>
      <p class="luz-timeline__title">First beta</p>
      <p class="luz-timeline__text">Ten teams try the app.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025-06">June 2025</time>
      <p class="luz-timeline__title">Public launch</p>
      <p class="luz-timeline__text">Sign-up opens to everyone.</p>
    </li>
  </ol>
</luz-timeline>
```

Con reproducción automática, cada cuatro segundos:

Timeline with autoplay markup
```html
<luz-timeline role="group" aria-label="Milestones" autoplay interval="4000">
  <ol class="luz-timeline">
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2023">2023</time>
      <p class="luz-timeline__title">The idea</p>
      <p class="luz-timeline__text">Two people sketch the first screens.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2024">2024</time>
      <p class="luz-timeline__title">The team</p>
      <p class="luz-timeline__text">Five people work on it full time.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025">2025</time>
      <p class="luz-timeline__title">The first customers</p>
      <p class="luz-timeline__text">Fifty schools use it every week.</p>
    </li>
  </ol>
</luz-timeline>
```

Diseño vertical:

Vertical timeline markup
```html
<luz-timeline role="group" layout="vertical" aria-label="Versions of the library">
  <ol class="luz-timeline">
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2024-02">February 2024</time>
      <h3 class="luz-timeline__title">Version 0.1</h3>
      <p class="luz-timeline__text">Buttons, forms and tables.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2024-09">September 2024</time>
      <h3 class="luz-timeline__title">Version 0.2</h3>
      <p class="luz-timeline__text">Dark mode and a print stylesheet.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025-05">May 2025</time>
      <h3 class="luz-timeline__title">Version 0.3</h3>
      <p class="luz-timeline__text">Right-to-left layouts.</p>
    </li>
  </ol>
</luz-timeline>
```

Si añades una línea de tiempo a la página después de que se haya cargado, importa el módulo una vez. Define el elemento; no hay que llamar a ningún `init`:

Timeline script code
```js
import "@luz-ds/core/timeline";
```

### Variantes y opciones
Las opciones son atributos de `<luz-timeline>`. Cada elemento tiene una fecha, un título y un texto.

- `aria-label`: El nombre de la línea de tiempo. Escríbelo con `role="group"`: un nombre en un elemento sin rol no se lee. Si omites el rol, el script lo añade.
- `layout="vertical"`: Todos los elementos permanecen visibles en una línea. El elemento del centro de la pantalla está activo y los anteriores ya han pasado.
- `autoplay`: Activa el avance automático con botones visibles de Pausa y Reproducir. Solo en horizontal; desactivado si no lo indicas.
- `interval`: Milisegundos entre elementos con `autoplay`. El valor predeterminado es 5000; cualquier valor inferior a 2000 sube a 2000.
- `data-luz-label-previous`, `-next`, `-pause`, `-play`: Los nombres de los botones, si LUZ no incluye el idioma de la página o quieres usar otras palabras.
- `--luz-timeline-paper`: El color de fondo de la línea de tiempo, que se usa para la elevación del carril y los puntos vacíos. El valor predeterminado es `--luz-surface-page`; en una tarjeta, asígnalo al elemento con la superficie de la tarjeta: `style="--luz-timeline-paper: var(--luz-surface)"`.
- `.luz-timeline__date`: Un `<time>`. Su texto es la etiqueta del botón de fecha en el carril, así que debe ser distinto en cada elemento. Si no lo incluyes, el botón muestra el número del elemento.
- `.luz-timeline__title`: Un `<p>` o un encabezado del nivel que necesite tu página: la clase no cambia.
- `.luz-timeline__text`: Una o dos frases; se permite un enlace.
- `data-luz-state`: El script lo escribe en los elementos de una línea de tiempo vertical: `active` o `past`. No lo asignes tú.

### Cómo funciona
Un elemento personalizado alrededor de una lista ordenada nativa, con los estilos de `components/timeline.css` y un script, `timeline.js`. `luz.js` solo carga el script en páginas que contienen `<luz-timeline>`.

El elemento busca dentro de sí el primer `.luz-timeline`; si no lo encuentra, no hace nada.

- **Horizontal.** El script crea, solo con métodos del DOM, los botones Anterior y Siguiente a los lados de la tarjeta y un carril de fechas debajo: un botón por elemento, con el texto de su fecha. Las tarjetas comparten una celda de cuadrícula, así que la banda tiene la altura de la tarjeta más larga y no salta al cambiar de elemento. Las tarjetas que no están activas son `inert` y están ocultas. En la tarjeta activa, la fecha se oculta visualmente porque el carril ya la muestra.
- **Cambiar de elemento.** Pulsa una fecha, usa Anterior o Siguiente, las teclas de flecha, Inicio y Fin en el carril, o desliza más de 40 px en horizontal con un dedo o el ratón. Hacia el inicio de la línea está el elemento siguiente. Al llegar a cualquiera de los extremos, vuelve al otro lado. Si el deslizamiento termina sobre un enlace, no se pulsa.
- **El carril.** La fecha activa se desplaza hasta el centro con desplazamiento suave, salvo que la persona haya pedido reducir el movimiento. Al moverse con el teclado, el foco permanece en la nueva fecha activa; también lo hace si el cambio oculta la tarjeta que tenía el foco.
- **Vertical.** El script marca como `data-luz-state="active"` el elemento que cruza el centro de la pantalla y como `past` los anteriores. La línea detrás de un elemento pasado adopta el color de marca y el punto activo se rellena y aumenta de tamaño. También funciona con el movimiento reducido, sin transición.
- **Reproducción automática.** Con `autoplay`, el elemento cambia en bucle cada `interval` milisegundos. El botón Pausa bajo el carril lo detiene; entonces pasa a llamarse Reproducir y lo vuelve a iniciar. La línea de tiempo también espera sin cambiar el botón mientras el puntero está encima (reanuda tras 4 segundos o al apartarlo), mientras el foco del teclado esté dentro, mientras menos de la mitad esté en pantalla y mientras la pestaña esté oculta. Con movimiento reducido, nunca se inicia y el botón no se muestra.
- **Texto.** «Anterior», «Siguiente», «Pausa» y «Reproducir» aparecen en el idioma de la página que incluye LUZ (inglés o español), según el `lang` más cercano, o el tuyo mediante `registerLocale()` y `data-luz-label-*`. Se incluyen con el script, así que `@luz-ds/core/timeline` funciona por sí solo. Si la página carga `luz.js`, también reciben cualquier idioma que añadas con `registerLocale()`. Consulta los [módulos de JavaScript](https://nandovejer.github.io/luz/es/docs/get-started/javascript/).

### Sin JavaScript
Una lista ordenada con todos los elementos visibles: una línea en el lado inicial en línea, con un punto en cada elemento; después, la fecha, el título y el texto. La lista tiene el mismo aspecto antes de que el script defina el elemento, así que no hay saltos cuando lo hace.

La reproducción automática, el carril, Anterior y Siguiente, el gesto de deslizamiento y la marca activa del diseño vertical necesitan JavaScript.

### Teclado y ARIA
Tab recorre, en este orden: Anterior, los enlaces de la tarjeta activa, Siguiente, la fecha activa del carril y el botón Pausa o Reproducir. Las demás fechas quedan fuera del orden de Tab; las teclas de flecha permiten moverse entre ellas.

- **Izquierda y Derecha** en el carril van a la fecha anterior o siguiente, y el foco las acompaña. En texto de derecha a izquierda, se intercambian. Al pasar cualquiera de los extremos, se vuelve al otro lado.
- **Inicio y Fin** van a la primera y la última fecha.
- **Enter o Espacio** pulsa una fecha, Anterior, Siguiente o Pausa: son botones nativos.
- El elemento tiene `role="group"` y tu `aria-label`. La fecha activa tiene `aria-current="true"`; solo esa fecha se puede recorrer con Tab (usa un `tabindex` itinerante).
- Las tarjetas forman una sola región dinámica. Tiene `aria-live="polite"` cuando la persona cambia el elemento y `off` durante la reproducción automática, para que no se anuncie una tarjeta que cambia sola.
- El nombre del botón Pausa o Reproducir indica su acción. Los botones de flecha se llaman «Anterior» y «Siguiente»: consulta los problemas conocidos.
- Las tarjetas que no están activas son `inert`: no reciben el foco ni se leen. Si el foco estaba en la tarjeta que desaparece, pasa a la nueva fecha activa.
- Cada tarjeta tiene `aria-posinset` y `aria-setsize`, para que el lector de pantalla pueda decir «2 de 4» cuando solo se muestra una tarjeta.

### Cuándo usarlo
Usa una línea de tiempo para una serie breve de eventos fechados cuyo orden sea importante: lanzamientos, hitos o la historia de una empresa.

- Horizontal, cuando cada evento necesita una tarjeta y la persona los recorre uno a uno.
- Vertical, cuando se deben ver todos los eventos al desplazarse.
- De 4 a 10 elementos. A partir de ahí, el carril necesita mucho desplazamiento.

### Cuándo no usarlo
No uses una línea de tiempo para pasos que haya que seguir en orden ni para eventos sin fecha.

- Para un proceso, usa una lista numerada.
- Para comparar eventos según varios atributos, usa una [tabla](https://nandovejer.github.io/luz/es/docs/components/table/).
- Si se deben ver todos los elementos a la vez, usa el diseño vertical: el horizontal muestra una sola tarjeta.
- No actives la reproducción automática en contenido que no se deba pasar por alto. Nadie tiene que esperar a la tarjeta siguiente.
