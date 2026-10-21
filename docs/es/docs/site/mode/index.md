# Modo de color automático

Añade la opción Automático al selector de modo de color, para que la página siga los ajustes del sistema o la hora del día hasta que el lector elija un modo.

### Problemas conocidos
Qué puedes esperar:

- Con `by="clock"`, Automático es oscuro de 20:30 a 07:30, aunque el dispositivo esté configurado en modo claro. No se leen los ajustes del sistema.
- Si se combinan `prefers-contrast: more` y el modo oscuro, Automático activa el modo de alto contraste, que es claro.
- En el estado Automático, el botón de ciclo muestra «Automático», no el modo aplicado por esta opción.
- Sin [el script de la cabecera](https://nandovejer.github.io/luz/es/docs/site/mode/#boot), un sistema oscuro puede mostrar primero el modo equivocado.
- Debes traducir Automático y la leyenda. Core se encarga de los nombres de `data-luz-themes`.
- No se ha probado con un lector de pantalla.

### Copiar el marcado
El [selector de modo de color](https://nandovejer.github.io/luz/es/docs/components/mode-switcher/) de core, con una cuarta opción de radio, `auto`, marcada dentro de `<luz-mode>`. `site.min.js` carga el archivo del elemento, `mode.min.js`; si la página no lo incluye, debe cargarlo por su cuenta.

Pon los iconos en las etiquetas, no en `data-mode-icon` del botón de ciclo: con `luz.js`, el botón copia el icono de la etiqueta marcada y core no tiene un icono Automático para `data-mode-icon`.

Auto color mode markup
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>

<luz-mode remember by="clock">
  <fieldset class="luz-mode-switcher luz-mode-switcher--cycle">
    <legend class="luz-mode-switcher__label">Color mode</legend>
    <label class="luz-mode-btn"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="auto" checked><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 7a5 5 0 0 0 0 10ZM23 14A5 5 0 0 1 17 8a5 5 0 1 0 6 6Z"/><path stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M11 3h0M5 6h0M2 12h0M5 18h0M11 21h0"/></svg>Auto</label>
    <label class="luz-mode-btn" data-theme="light"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="light"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="1.5 4.8"/></svg>Light</label>
    <label class="luz-mode-btn" data-theme="dark"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="dark"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/></svg>Dark</label>
    <label class="luz-mode-btn" data-theme="high-contrast"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="high-contrast"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M12 3a9 9 0 0 1 0 18Z"/></svg>High contrast</label>
  </fieldset>
</luz-mode>
```

#### Script para la cabecera

Este script, para `by="system"`, evita que aparezca brevemente el modo equivocado: establece `data-theme` antes del primer renderizado. Se recomienda, pero no es obligatorio.

Usa primero el modo guardado en `luz-theme`, después `prefers-contrast` y, por último, `prefers-color-scheme`.

Con una CSP que no permita `'unsafe-inline'`, sírvelo como archivo clásico en `<head>` o autorízalo mediante su hash `'sha256-…'`.

Script for the head
```html
<script>
  (function () {
    var m;
    try { m = localStorage.getItem("luz-theme"); } catch (e) {}
    if (["light", "dark", "high-contrast"].indexOf(m) < 0)
      m = matchMedia("(prefers-contrast: more)").matches ? "high-contrast"
        : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = m;
  })();
</script>
```

### Variantes y opciones
No hay variantes. Estos son los atributos de `<luz-mode>`:

- `remember`: Booleano. Guarda la elección con la clave de core `luz-theme`. Automático la elimina. Sin este atributo, al recargar se inicia en Automático
- `by`: Qué sigue Automático: `system` (por defecto) o `clock`
- `for`: El `id` del elemento que recibe los atributos. Por defecto, `<html>`
- `light-attr`: El atributo que contiene la fase del día; por defecto, `data-light`. Nunca uses `data-theme` ni un atributo `data-luz-*`: no se comprueban y pertenecen al modo y a core

### Cómo funciona
CSS de `@luz-ds/site` para la caja del elemento y de `@luz-ds/site/mode`, que define `<luz-mode>`. `site.min.js` lo carga cuando el navegador está inactivo en las páginas con `<luz-mode>`.

Las opciones de radio y sus etiquetas son de core: el elemento no escribe ningún texto.

- **Automático según el sistema:** `prefers-contrast: more` activa `high-contrast`; si no, `prefers-color-scheme: dark` activa `dark`; en los demás casos, `light`. Sigue los cambios mientras la página está abierta.
- **Automático según la hora:** `prefers-contrast: more` sigue teniendo prioridad. En los demás casos decide la fase del día: `dark` en las fases oscuras y `light` en las demás; se escribe en `data-light`. Se comprueba cada minuto y cuando la pestaña vuelve a mostrarse.
- **Un modo elegido por el lector:** se establece en `data-theme`. Con `by="clock"`, se fija la fase: `afternoon` para Claro y `night` para los demás modos.
- **Almacenamiento:** solo con `remember`, bajo `luz-theme` de core; se ignoran los valores que no sean un modo.
- **Con luz.js:** el script de core ignora Automático y su botón de ciclo recorre las cuatro opciones.

Las fases del día según el reloj del visitante. La noche continúa después de medianoche.

- `night`: 22:30: 05:00: dark
- `dawn`: 05:00: 07:30: dark
- `morning`: 07:30: 12:00: light
- `afternoon`: 12:00: 17:30: light
- `sunset`: 17:30: 20:30: light
- `dusk`: 20:30: 22:30: dark

#### Propiedades, métodos y evento

- `el.mode`: La opción: `auto`, `light`, `dark` o `high-contrast`. Al establecerla, se marca la opción de radio
- `el.light`: La fase actual del día o `null` si no se usa `by="clock"`
- `preview(x)`: Muestra otra hora del día: `x` es el nombre de una fase o una hora entre 0 y 24. Con Automático, `data-theme` la sigue; con un modo elegido, solo cambia la fase de luz. `preview(null)` vuelve atrás, a la hora fijada si la hay. Si no se usa `by="clock"`, devuelve `false`.
- `pin(x)`: Fija otra hora del día: Automático en `x` (el nombre de una fase o una hora entre 0 y 24) en vez de la hora actual. Con `remember`, se guarda en `luz-light` como minutos del día y se elimina el modo guardado; elegir un modo o usar `pin(null)` quita la hora fijada. Si no se usa `by="clock"`, devuelve `false`.
- `el.pinned`: La hora fijada o `null`
- `luz-mode:change`: Se propaga desde el elemento cada vez que hay un cambio. Su `detail`: `mode` (la opción), `theme` (el `data-theme` aplicado), `light` (la fase o `null`), `remembered` (`true` solo con `remember` y un modo guardado), `simulated` (`true` mientras hay una vista previa activa) y `pinned` (la hora fijada o `null`)

#### Dos fases de luz en un modo

Con `by="clock"`, el resto depende de tu CSS: establece solo los tokens semánticos que cambian, como harías en [un tema propio](https://nandovejer.github.io/luz/es/docs/tokens/themes/). Mide cada par con la [comprobación de contraste](https://nandovejer.github.io/luz/es/docs/tokens/contrast/).

A day look and a night look
```css
[data-theme="light"][data-light="morning"] {
  --luz-surface-page: #fdf3dc;
  --luz-surface-muted: #fdf3dc;
  --luz-surface: #fffaf0;
}

[data-theme="dark"][data-light="night"] {
  --luz-surface-page: #0f1520;
  --luz-surface-muted: #0f1520;
  --luz-surface: #172030;
}
```

### Sin JavaScript
Se muestran los cuatro botones de opción, incluso en la variante cíclica, y los tokens de core cambian el modo al seleccionado. Automático es claro.

No se siguen ni el sistema ni el reloj, y no se guarda nada.

### Teclado y ARIA
- **Opciones de radio:** Tab llega al grupo y las flechas permiten elegir Automático, Claro, Oscuro o Alto contraste. Con `luz.js`, Enter o Espacio en el botón de ciclo pasa a la siguiente opción.
- La leyenda y las etiquetas son tuyas. El elemento no añade botones, roles ni ARIA: el grupo lo forman el fieldset y sus opciones de radio.

### Cuándo usarlo
Úsalo cuando no quieras que el lector tenga que elegir: la página seguirá su dispositivo o la hora del día hasta que elija.

- `by="system"` para un sitio que se ve mejor en el modo claro u oscuro que tenga el dispositivo de la persona que lo lee.
- Usa `by="clock"` si el sitio tiene un aspecto distinto según la hora del día, como una web de un local o del tiempo.

### Cuándo no usarlo
No lo uses si el sitio tiene un único aspecto en un solo modo: para un selector sin la opción Automático, usa el de core.

- No uses `by="clock"` para prometer que coincide con el amanecer real: las horas son fijas.
