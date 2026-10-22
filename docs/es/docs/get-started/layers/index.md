# Capas de cascada

Cómo se integra LUZ en tu cascada: una capa llamada luz, el orden que debes declarar y cómo sobrescribir sus estilos sin !important.

### Declara primero el orden

Todo el CSS de LUZ está dentro de una capa de cascada, `luz`. Colócala entre tu restablecimiento y tus propios estilos, y declara ese orden antes de cargar ninguna hoja de estilos.

Layer order
```css
@layer reset, luz, app;
```

- El orden de las capas depende de la primera aparición de sus nombres. Una declaración como esta, antes que todo lo demás, lo fija.
- En HTML, ponla en un `<style>` antes de los elementos `<link>`. En una hoja de estilos, ponla en la primera línea, antes de cualquier `@import` de LUZ.
- Una capa posterior prevalece sobre una anterior. Así que `app` prevalece sobre `luz`, y `luz` sobre `reset`.
- No tienes que usar estos nombres. Usa las capas que quieras: `luz` es el único nombre que añade LUZ.

Las capas y los nombres con punto, como `luz.components`, funcionan en todos los navegadores actuales y están disponibles desde marzo de 2022 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)).

### Qué contiene luz

Core y los demás paquetes ponen sus reglas en capas propias dentro de `luz`. Se muestran aquí de la primera a la última: una capa más abajo en la tabla prevalece sobre las de arriba.

- `luz.tokens`: tokens: Las propiedades personalizadas `--luz-*`
- `luz.themes`: core: Tus propios aspectos (solo propiedades personalizadas; [crea uno](https://nandovejer.github.io/luz/es/docs/tokens/themes/)). LUZ no incluye ninguno: su aspecto predeterminado está en `luz.tokens`
- `luz.settings`: core: Ajustes de z-index, maquetación y texto de los campos
- `luz.generic`: core: El restablecimiento
- `luz.elements`: core: Elementos HTML sin clases, con especificidad 0
- `luz.objects`: core: Objetos de maquetación: `.o-*`
- `luz.components`: core: Los componentes: `.luz-*`
- `luz.utilities`: core: Ayudas de una sola función: `.u-*`. Prevalecen sobre los componentes por orden, no mediante `!important`
- `luz.site`: site: Los cinco componentes de site: `<luz-search>`, `<luz-consent>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>` y sus clases `.luz-<tag>__*`
- `luz.landing`: landing: Los patrones de una landing page: `.luz-landing-*`. Va después de site para que pueda ampliarlo
- `luz.cms`: cms: Los patrones de un blog, un periódico o cualquier CMS: `.luz-cms-*`. Va después de site; landing y cms no comparten clases, así que su orden no cambia nada
- `luz.app`: app: La cabecera y el panel de una aplicación web: `.luz-app-*`. Va después de cms; landing, cms y app no comparten clases, así que su orden no cambia nada
- `luz.docs`: docs: Las partes de una página de documentación: `.luz-docs-*`. Va después de app; no comparte clases con otros paquetes, así que su posición no mueve ninguna otra capa
- `luz.print`: core: Lo que cambia en papel, dentro de `@media print`: [Estilos de impresión](https://nandovejer.github.io/luz/es/docs/get-started/print/). Va al final para prevalecer sobre los estilos de pantalla de todos los paquetes

Cada archivo que publica LUZ repite primero el orden de esta lista, así que es el mismo sea cual sea el archivo que cargue primero la página. Estos nombres son públicos: cambiar uno es un cambio incompatible.

### El CSS sin capa prevalece

Los estilos que no están en ninguna capa prevalecen sobre todas las capas, sea cual sea el orden en el código fuente. Así que una regla normal tuya prevalece sobre `luz` y también sobre tu propia capa `app`.

- Si tu CSS no usa capas, nada cambia: ya prevalece sobre LUZ sin necesidad de `!important`.
- Si usas capas, mantén tus reglas dentro de una: una regla sin capa que olvides incluir sobrescribirá tus propias capas.
- El orden de capas no ayuda con las reglas que están fuera de ellas. Pon la sobrescritura en `app` o sin capa, y ten claro cuál has elegido.

### Sobrescribir LUZ

Tres formas de sobrescribir estilos, empezando por la más sencilla. Todas prevalecen sobre LUZ porque `app` va después de `luz`.

Overriding LUZ from your own layer
```css
@layer reset, luz, app;

@layer app {
  /* A token: every component that reads it follows */
  :root {
    --luz-brand-fill: #0b5a8c;
  }

  /* A component: your rule, in your layer */
  .luz-btn {
    min-height: 3rem;
  }

  /* A site component */
  luz-banner {
    font-size: 1rem;
  }
}
```

- **Prioriza los tokens.** Un token modifica todos los componentes que lo usan, en el modo en el que se define. Comprueba los colores que establezcas con [la comprobación de contraste](https://nandovejer.github.io/luz/es/docs/tokens/contrast/).
- **No necesitas `!important` ni selectores más largos**: el orden de las capas prevalece primero, y la especificidad solo cuenta dentro de una misma capa.
- Mantén las sobrescrituras de color en el modo correcto: `:root` en `app` también prevalece sobre el modo oscuro de LUZ. Define el token para cada modo, por ejemplo en `[data-theme="dark"]`.

### Por qué hay una sola capa contenedora

Antes, las capas de LUZ eran seis nombres de nivel superior: `settings`, `generic`, `elements`, `objects`, `components` y `utilities`. Son breves y comunes, y otras herramientas usan algunos de esos nombres.

Una página que cargaba una de ellas junto con LUZ mezclaba sus capas `components` o `utilities` con las de LUZ, y el orden entre ellas dependía del azar.

- Dentro de `luz`, los nombres de capa de LUZ nunca coinciden con los tuyos.
- Un solo nombre ordena todo LUZ: colocas `luz` una vez y no tienes que saber qué contiene.
- Funciona con un `<link>` o desde una CDN, donde no se puede añadir una capa desde fuera.

Aun así, puedes poner una capa tuya entre dos capas de LUZ si las nombras en la primera declaración: `@layer luz.components, mine, luz.utilities;`.

### Cargar con @import

Con un empaquetador que resuelva nombres de paquetes, o con rutas a los archivos, cárgalos tal cual. No añadas `layer(luz)` al import: los archivos ya declaran sus capas dentro de `luz` y envolverlos anidaría los nombres como `luz.luz.components`.

Importing LUZ
```css
@layer reset, luz, app;

@import url("@luz-ds/tokens/css");
@import url("@luz-ds/core/css");
@import url("@luz-ds/site/css");
@import url("@luz-ds/landing/css"); /* only for a landing page */
@import url("@luz-ds/cms/css");     /* only for a blog or a newspaper */
@import url("@luz-ds/app/css");     /* only for a web application */
@import url("@luz-ds/docs/css");    /* only for a documentation site */
```

Tu hoja de estilos importa un archivo después de la declaración, así que el orden queda fijado antes de que se cargue LUZ.
