# Modos de color y temas

Cambia entre claro, oscuro y alto contraste con un solo atributo, o crea tu propio aspecto.

El mismo marcado, un solo atributo. Define `data-theme` en `<html>` o en cualquier elemento para limitar el modo a ese elemento.

### Modos y temas

Un modo de color cambia la claridad u oscuridad de la página; un tema cambia toda su identidad. LUZ incluye un aspecto en tres modos. Tu propio tema se aplica sobre él.

- Los tokens incluyen los tres modos: `data-theme="light"`, `"dark"` y `"high-contrast"`. Claro es el modo predeterminado, sea cual sea la configuración del dispositivo: [síguela con un script](https://nandovejer.github.io/luz/es/docs/tokens/modes/#system).
- El aspecto predeterminado es Vejer, inspirado en Vejer de la Frontera. Es el valor de los tokens, no un archivo que se carga: ET Book para el texto corrido y los encabezados, superficies blancas y de arenisca, texto negro hierro, enlaces y acciones azul cielo, y todos los enlaces subrayados.
- LUZ no incluye ningún archivo de tema. [Crea el tuyo](https://nandovejer.github.io/luz/es/docs/tokens/themes/): copia la plantilla, cambia lo que necesites y compruébalo.

Mode examples
```html
<html data-theme="dark">
<html data-theme="high-contrast">
<html data-theme="my-brand" data-mode="dark">
```

Todos los modos se evalúan con los mismos mínimos: 4,5:1 para el texto y 3:1 para el texto deshabilitado, los bordes y los anillos de foco. Puedes aplicar la misma comprobación a tu tema con `npx @luz-ds/tokens check-contrast` o en el navegador con [la comprobación del contraste](https://nandovejer.github.io/luz/es/docs/tokens/contrast/).

### Seguir el sistema o el reloj

Una página es clara salvo que se indique lo contrario: LUZ no lee por sí solo ninguna configuración del dispositivo del visitante. Para empezar en modo oscuro cuando el dispositivo lo esté, define el atributo mediante un script en el head.

Following the system color mode
```html
<script>
  (function () {
    var mode;
    try { mode = localStorage.getItem("luz-theme"); } catch (e) {}
    if (["light", "dark", "high-contrast"].indexOf(mode) < 0) {
      mode = matchMedia("(prefers-contrast: more)").matches ? "high-contrast"
        : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = mode;
  })();
</script>
```

- Ponlo en `<head>`. Se ejecuta antes del primer renderizado, así que la página no muestra un destello claro. Usa `<script type="module">` para sacarlo de la ruta crítica: la página se renderiza primero en claro y después cambia.
- Con una CSP sin `'unsafe-inline'`, sírvelo como archivo clásico en `<head>` o autorízalo mediante su hash `'sha256-…'`.
- Tiene prioridad el modo que elija quien lee. El selector de modo de color lo guarda con la clave `luz-theme`, y el script la consulta primero. La configuración del sistema nunca se guarda, así que la página la sigue hasta que la persona elige un modo.
- Sin JavaScript, la página permanece en modo claro y los botones de opción del selector siguen cambiando el modo durante la sesión.
- Lee la configuración una vez, al cargar la página. Para seguir un cambio mientras la página está abierta, escucha el evento `change` de `matchMedia()` y llama a `applyTheme(mode, { persist: false })` desde `@luz-ds/core/theme`, solo mientras `getStoredTheme()` sea `null`.
- Establece los tres modos. Para definir un tema propio, usa `data-theme` y `data-mode`, como se explica en [la página de temas](https://nandovejer.github.io/luz/es/docs/tokens/themes/).

El script establece el modo una sola vez. Para seguir el sistema mientras la página está abierta y ofrecer la opción Automático junto a los tres modos, envuelve el selector en [`<luz-mode>`](https://nandovejer.github.io/luz/es/docs/site/mode/), de `@luz-ds/site`.

- Automático sigue el sistema: `prefers-contrast: more` activa el alto contraste; si no, `prefers-color-scheme: dark` activa el modo oscuro; en los demás casos, el claro.
- Con `by="clock"`, Automático sigue la hora del día y escribe la fase en `data-light`: consulta [cómo funciona](https://nandovejer.github.io/luz/es/docs/site/mode/#how).
- El modo que elija quien lee tiene prioridad sobre ambos. Sin JavaScript, Automático usa el modo claro.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
