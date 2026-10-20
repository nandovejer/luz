# Consentimiento para cookies

Pregunta una vez al visitante si el sitio puede usar cookies opcionales, muestra Aceptar y Rechazar uno junto al otro y recuerda la respuesta.

### Problemas conocidos
Sin JavaScript, el aviso no se muestra: no hay nada que responder, porque tampoco se ejecutan los scripts propios del sitio. Si el servidor establece cookies opcionales por su cuenta, sin un script, debe pedir el consentimiento de otra forma.

- La respuesta se guarda en el almacenamiento local del navegador, así que el servidor no puede leerla; si borras los datos del sitio, volverá a preguntarte.
- En una ventana de menos de 30 rem (480 px) de alto, el aviso no queda fijo: se muestra en el flujo, al principio de la página, donde está su marcado, así que la página baja cuando aparece.
- El estado guardado se oculta cuando el foco sale del aviso hacia la página, pero no al hacer clic en una zona vacía. Usa el botón Cerrar.
- No se ha probado con un lector de pantalla.

### Copiar el marcado
Justo después del [enlace para saltar al contenido](https://nandovejer.github.io/luz/es/docs/components/skip-link/), antes de un [aviso](https://nandovejer.github.io/luz/es/docs/site/banner/) y de la cabecera de la página (una cabecera de [landing](https://nandovejer.github.io/luz/es/docs/landing/header/) o de [CMS](https://nandovejer.github.io/luz/es/docs/cms/header/)): aparece en la parte inferior de la ventana, pero es lo primero en el orden de lectura y de Tab. Hay una casilla por cada categoría de cookies opcionales; su `value` es el nombre de la categoría.

`site.min.js` carga el archivo propio del aviso, `consent.min.js`, cuando el navegador está inactivo; una página sin `site.min.js` carga ese archivo por su cuenta.

Cookie consent markup
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>

<a class="luz-skip-link" href="#main">Skip to main content</a>
<luz-consent>
  <section class="luz-consent" data-luz-consent aria-labelledby="consent-title" hidden>
    <div data-luz-consent-ask>
      <h2 class="luz-consent__title" id="consent-title">Cookies on Bodega Albar</h2>
      <p>We use cookies that this site needs to work. We would also like to measure how you
        use it, to improve it. <a href="/cookies/">Read the cookie policy</a>.</p>
      <form class="o-actions">
        <button class="luz-btn luz-btn--primary" type="submit" value="all">Accept optional cookies</button>
        <button class="luz-btn luz-btn--primary" type="submit" value="none">Reject optional cookies</button>
      </form>
      <details class="luz-consent__choices">
        <summary>Choose which cookies to allow</summary>
        <form class="o-stack">
          <fieldset class="luz-fieldset">
            <legend>Optional cookies</legend>
            <div class="luz-check-group">
              <label class="luz-check-item"><input type="checkbox" value="analytics"> Measuring visits</label>
              <label class="luz-check-item"><input type="checkbox" value="marketing"> Adverts on other sites</label>
            </div>
          </fieldset>
          <div class="o-actions">
            <button class="luz-btn luz-btn--secondary" type="submit">Save my choices</button>
          </div>
        </form>
      </details>
    </div>
    <div data-luz-consent-done tabindex="-1" hidden>
      <p>Your choice is saved. You can change it at any time on the
        <a href="/cookies/">cookie policy</a> page.</p>
      <button class="luz-btn luz-btn--secondary" type="button" data-luz-consent-close>Close</button>
    </div>
  </section>
</luz-consent>
<header>…</header>

<!-- On the cookie policy page -->
<button class="luz-btn luz-btn--outline" type="button" data-luz-consent-open hidden>Change cookie settings</button>
```

Tus scripts leen la respuesta y esperan a que haya una nueva. Carga un script opcional solo para una categoría que la persona visitante haya aceptado:

Script that reads the answer
```js
import { getConsent } from "@luz-ds/site/consent";

const granted = (answer) => answer?.granted.includes("analytics");

if (granted(getConsent())) startMeasuring();
document.addEventListener("luz:consent", (event) => {
  if (granted(event.detail)) startMeasuring();
  // Withdrawn: the simplest correct answer is to reload the page
  else location.reload();
});
```

### Variantes y opciones
No hay variantes. Los puntos de extensión son atributos `data-luz-consent-*`.

- `.luz-consent`: El aviso: una franja fija en la parte inferior de la ventana, de ancho completo y como máximo de media altura, con desplazamiento interno y el texto en la columna de la cabecera, en sans serif. En ventanas de menos de 30 rem de alto, se muestra en el flujo. Mantén `hidden`: el script lo muestra
- `.luz-consent__title`: Su encabezado, en sans serif; da nombre a la región del aviso mediante `aria-labelledby`
- `.luz-consent__choices`: El `<details>` con las categorías, debajo de los dos botones
- `<luz-consent>`: El elemento personalizado que define el módulo. Al conectarse, enlaza el aviso que contiene
- `data-luz-consent`: En `<section>`: el aviso. `data-luz-consent-days` es opcional y define cuánto dura una respuesta (180 días por defecto, 395 como máximo); `data-luz-consent-key` define la clave de almacenamiento (debe empezar por `luz-`)
- `data-luz-consent-ask`, `data-luz-consent-done`: La pregunta y el mensaje de confirmación que la sustituye. El mensaje tiene `tabindex="-1"`: recibe el foco
- `data-luz-consent-close`: En un botón dentro del mensaje de confirmación: oculta el aviso y devuelve el foco al botón que lo abrió, al primer botón `data-luz-consent-open` o a `<main>`. El mensaje también se oculta cuando el foco sale hacia la página
- `value="all"`, `value="none"`: En los botones de envío: Aceptar permite todas las categorías y Rechazar, ninguna. Un botón de envío con otro valor o sin valor permite las categorías marcadas en su formulario
- `data-luz-consent-open`: En cualquier botón con `hidden`: se reserva su espacio, el script lo muestra y permite volver a abrir el aviso con la respuesta guardada marcada
- `--luz-consent-h`: El script lo establece en `:root` mientras se muestra el aviso: su altura. La página, `.o-main` y `.luz-sidebar` reservan ese espacio al final y desplazan lo que Tab alcanza para que quede por encima del aviso

### Cómo funciona
CSS de `@luz-ds/site`, dos formularios nativos y un archivo propio, `@luz-ds/site/consent` (`dist/consent.min.js`, menos de 1 kB comprimido), que define `<luz-consent>`. `site.min.js` lo carga cuando el navegador está inactivo y solo en páginas con `<luz-consent>`, así que las demás páginas no lo cargan.

Si añades un aviso después de cargar la página, debes importar el archivo a mano; aunque haya dos copias en una página, el elemento solo se define una vez.

- **Cuándo pregunta:** cuando no hay una respuesta guardada, cuando ha caducado o cuando el aviso ofrece una categoría que no se incluyó al guardar la respuesta. Entonces aparece como una franja en la parte inferior de la ventana, sin desplazar la página: no atrapa ni recibe el foco. La página le reserva espacio al final y desplaza lo que Tab alcanza para que quede por encima del aviso; así puedes leerla y usarla antes de responder.
- **La respuesta:** Aceptar permite todas las categorías; Rechazar, ninguna; Guardar mis opciones, las marcadas. Al pulsar Enter en una casilla se guardan las marcadas, nunca todas. Escape no es una respuesta: no ocurre nada. El mensaje de confirmación sustituye a la pregunta, recibe el foco y se lee. Desaparece al pulsar su botón Cerrar o cuando el foco sale del aviso hacia la página; el foco se queda donde haya ido.
- **Dónde se guarda:** en el `localStorage` del navegador, bajo `luz-consent`, como JSON: `{"version":1,"expires":…,"asked":["analytics","marketing"],"granted":["analytics"]}`, con `expires` en milisegundos desde 1970. No se guarda en una cookie: esta se enviaría al servidor con cada solicitud y no debería hacer falta una cookie para preguntar por ellas. No se guardan datos personales ni sale nada del navegador. Un valor mal formado cuenta como si no hubiera respuesta. Si el almacenamiento está bloqueado, la respuesta sirve para esa página y la siguiente vuelve a preguntar.
- **Tus scripts:** `getConsent()` devuelve la respuesta guardada, `{ asked, granted, expires }`, o `null`. Cada respuesta nueva envía el evento `luz:consent` a `document`, con el mismo objeto en `detail`. Los nombres de categoría empiezan por una letra minúscula y pueden contener letras minúsculas, números o guiones; hasta 32 caracteres.
- **Cambiar la respuesta:** es tan fácil como darla. Un botón con `data-luz-consent-open` en la página de la política de cookies vuelve a mostrar el aviso. Pon un único aviso en cada página: todos esos botones lo abren.
- El script no escribe ningún texto: todas las palabras están en tu marcado, en el idioma de la página.

### Sin JavaScript
El aviso y el botón para volver a mostrarlo permanecen ocultos mediante el atributo `hidden`. Sin un script no se ejecutan los scripts propios del sitio, así que no hay nada que preguntar y los botones que no funcionarían no se muestran.

Incluye un enlace a la política de cookies en el pie de página de todas las páginas, para que siempre se pueda consultar.

### Teclado y ARIA
- **Orden:** el enlace para saltar al contenido sigue siendo el primero, para que quienes vuelvan puedan ir directamente al contenido. El aviso va después, antes de la cabecera, aunque se muestre abajo: enlace a la política, Aceptar, Rechazar y, por último, el botón que abre las categorías.
- **Teclas:** Enter o Espacio en un botón; Espacio marca una casilla. Escape no hace nada: no oculta el aviso.
- **Punto de referencia:** un `<section>` con el nombre de su encabezado es una región, que aparece entre los puntos de referencia antes que el punto de referencia de la cabecera. No es un diálogo: no bloquea la página, así que no necesita `role="dialog"`.
- **Foco:** ninguno al cargar la página. Tras responder, el foco pasa al mensaje de confirmación; después de pulsar el botón para volver a mostrarlo, pasa al aviso. Cerrar lo devuelve a ese botón, al primero de ellos o a `<main>`, nunca al principio de la página.

### Cuándo usarlo
Úsalo si tu sitio instala cookies o guarda en el navegador datos que no necesita para funcionar, como los de medición de visitas o publicidad: la legislación de la UE y el Reino Unido exige el consentimiento del visitante antes de hacerlo.

### Cuándo no usarlo
No lo uses si el sitio solo instala las cookies necesarias para funcionar (de sesión, del carrito o para guardar el idioma o el modo de color): no requieren consentimiento. Explícalo en la política de cookies y no muestres ningún aviso.

- No lo uses como una barrera que oculte o bloquee la página hasta que el visitante responda.
- No lo uses para anunciar noticias u ofertas: para eso tienes el [banner](https://nandovejer.github.io/luz/es/docs/site/banner/).

Sustituye a un script de consentimiento de terceros. No reemplaza nada de LUZ.
