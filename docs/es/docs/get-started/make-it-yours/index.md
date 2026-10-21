# Hazlo tuyo

Cambia los colores, las fuentes, los tamaños, las esquinas y las sombras de LUZ con tokens, y ajusta un componente con tu propio CSS.

LUZ está hecha para que la modifiques desde fuera. No editas sus archivos: escribes tu propio CSS y lo cargas después; lo importante es que tu CSS prevalezca.

### Cambia un token, no un componente

Los componentes de LUZ usan tokens: propiedades personalizadas que empiezan por `--luz-`. Para cambiar el aspecto de LUZ, vuelve a definir el token en tu propio CSS.

Todos los componentes que lo usan se adaptan.

The token override
```css
:root {
  --luz-radius-md: 2px;
}
```

- Define el token en `:root`, en CSS que no esté dentro de un `@layer`.
- El CSS que está fuera de cualquier capa prevalece sobre todas las capas de LUZ, esté donde esté en el archivo. No necesitas `!important` ni un selector más largo.
- Si usas tus propias capas, declara primero su orden. [Capas de cascada](https://nandovejer.github.io/luz/es/docs/get-started/layers/) indica el orden y las tres formas de sobrescribir LUZ.
- Los nombres de los tokens están en [las páginas de Tokens](https://nandovejer.github.io/luz/es/docs/tokens/). Si LUZ no usa un token que definas, no hará nada.

### Colores y modos

LUZ incluye un aspecto en tres modos: claro, oscuro y de alto contraste. Los colores son tokens semánticos, como `--luz-brand-fill` y `--luz-surface-page`, y cada uno tiene un valor para cada modo.

Para cambiarlos, [crea tu propio tema](https://nandovejer.github.io/luz/es/docs/tokens/themes/): incluye una plantilla, los pasos y dónde cargarlo. Después, ejecuta [la comprobación de contraste](https://nandovejer.github.io/luz/es/docs/tokens/contrast/) con tus colores para medir las combinaciones que LUZ se compromete a mantener legibles.

### Fuentes

Dos tokens indican qué fuente se usa y dónde. Otros tres contienen las pilas de fuentes.

- `--luz-font-body`: texto corrido. La fuente serif predeterminada es ET Book.
- `--luz-font-heading`: encabezados. La fuente predeterminada es serif.
- `--luz-font-sans`, `--luz-font-serif` y `--luz-font-mono`: las tres pilas. Los controles, las etiquetas y las tablas usan la sans, y el código, la mono.

The font override
```css
@font-face {
  font-family: "My Serif";
  src: url("/fonts/my-serif.woff2") format("woff2");
  font-display: swap;
}

:root {
  --luz-font-serif: "My Serif", georgia, serif;
}
```

- Añade tu propio `@font-face` en tu CSS, como se muestra arriba. Si defines `--luz-font-serif`, cambiarán el cuerpo y los encabezados, porque ambos la usan de forma predeterminada.
- Para dejar de usar ET Book, carga `tokens.css` en vez de `luz-tokens.css`: `@luz-ds/tokens/tokens.css` desde un empaquetador o `dist/tokens.min.css` desde una CDN. Incluye los mismos tokens y no tiene `@font-face`.
- En un elemento con `lang="ar"`, el cuerpo y los encabezados ya usan la fuente sans: ET Book no tiene letras árabes. Una regla tuya, fuera de las capas de LUZ, sigue prevaleciendo.
- La fuente que aportes tiene su propia licencia. Léela antes de publicar el archivo.

[Tipografía](https://nandovejer.github.io/luz/es/docs/tokens/typography/) enumera los usos de las fuentes y la escala tipográfica.

### Tamaños de texto y espaciado

Tres tokens, llamados controles, determinan el tamaño de toda la escala tipográfica y de toda la escala de espaciado. Cada paso de texto, de `--luz-text-xs` a `--luz-text-4xl`, y cada paso de espaciado, de `--luz-space-3xs` a `--luz-space-4xl`, se calcula a partir de ellos, así que basta una línea para cambiar la página.

Los tres controles de tamaño

- `--luz-type-base`: 1rem: El tamaño de `--luz-text-base`. Todos los demás pasos se calculan a partir de él.
- `--luz-type-ratio`: 1.25: El múltiplo entre dos pasos por encima del valor base y el divisor por debajo.
- `--luz-space-unit`: 0.25rem: La cuadrícula de la escala de espaciado: cada paso es un múltiplo suyo.

The size knobs
```css
:root {
  --luz-type-base: 1.125rem;
  --luz-type-ratio: 1.2;
  --luz-space-unit: 0.1875rem;
}
```

#### Reglas para los controles

- **Escribe las longitudes en rem.** rem sigue el tamaño de fuente que la persona ha elegido en los ajustes del navegador. Un valor en px fija el tamaño e ignora ese ajuste. El espaciado también se expresa en rem, así que crece con el texto.
- **Defínelos en `:root`.** Los pasos se calculan una sola vez en `:root` y se transmiten como valores ya calculados. Un control en `body` o en una sección no cambia nada. Los tamaños se eligen para toda la página.

A knob that does nothing
```css
/* This changes nothing: the steps are already worked out on :root */
body {
  --luz-type-base: 1.5rem;
}
```

#### Los intervalos con los que se prueba LUZ

- `--luz-type-base`: de 0.875rem a 1.25rem.
- `--luz-type-ratio`: de 1.125 a 1.5.
- `--luz-space-unit`: de 0.1875rem a 0.3125rem, que equivalen a 3px y 5px con una raíz de 16px.

Fuera de estos intervalos sigue funcionando, pero nadie ha revisado el resultado. La comprobación de contraste mide los colores, no los tamaños.

#### Qué no cambia

- El texto pequeño mantiene un mínimo. `--luz-text-xs` nunca baja de 0.75rem y `--luz-text-sm` nunca baja de 0.875rem, sea cual sea el valor base.
- En una pantalla táctil y con 768px o menos, el texto de los formularios nunca baja de 1rem.
- Las alturas de los controles, de `--luz-control-sm` a `--luz-control-xl` (28, 36, 44 y 56px), no son ajustables. Una unidad menor nunca reduce el tamaño de un objetivo.
- El texto corrido usa `--luz-text-body`, que equivale a 1.0625 veces el valor base, así que también cambia con él.

#### Según el ancho o al imprimir

Los controles están en `:root`, así que puedes cambiarlos con una consulta de medios.

Knobs in media queries
```css
@media (min-width: 80em) {
  :root {
    --luz-type-base: 1.125rem;
  }
}

@media print {
  :root {
    --luz-type-base: 0.9375rem;
  }
}
```

#### Pruébalos

Estos son los nueve tamaños tipográficos de cinco combinaciones de los controles. Los pasos van de `--luz-text-xs` a `--luz-text-4xl`, en px.

Tamaños de texto con una raíz de 16px

- Valor predeterminado: 12: 14: 15: 16: 20: 25: 31: 39: 49
- Texto más grande `--luz-type-base: 1.125rem`: 12: 14: 16: 18: 23: 29: 36: 45: 56
- Pasos más próximos `--luz-type-ratio: 1.2`: 12: 14: 15: 16: 19: 23: 28: 34: 41
- Base más pequeña `--luz-type-base: 0.875rem`: 12: 14: 14: 14: 18: 23: 29: 36: 45
- Grande y amplio `--luz-type-base: 1.25rem; --luz-type-ratio: 1.333`: 12: 15: 18: 20: 27: 36: 48: 64: 85

- La tabla usa un tamaño de fuente raíz de 16px, el valor predeterminado del navegador. Si el navegador de quien lee está configurado en 20px, todos los tamaños serán 1,25 veces mayores. Por eso los controles usan rem.
- Con una base de 0.875rem se mantienen los mínimos: `--luz-text-sm`, `--luz-text-md` y `--luz-text-base` equivalen a 14px.
- Cada paso se redondea a 1/16 rem, un píxel entero con una raíz de 16px. Los navegadores sin `round()` usan la secuencia sin redondear: con los valores predeterminados, los tres pasos mayores se desvían como máximo 0.25px.

[Tipografía](https://nandovejer.github.io/luz/es/docs/tokens/typography/) y [Espaciado y tamaños](https://nandovejer.github.io/luz/es/docs/tokens/spacing/) enumeran cada paso con su fórmula.

### Esquinas

`--luz-radius-md` es el máximo: ningún rectángulo tiene esquinas más redondeadas. Se usa en botones, tarjetas, alertas, menús y diálogos.

Hay otros tres pasos para los demás casos.

- `--luz-radius-none` (0px): esquina cuadrada, para una caja que se une a otra.
- `--luz-radius-sm` (2px): marcas pequeñas, como el código en línea y una casilla.
- `--luz-radius-full` (9999px): una píldora o un círculo, para formas que son redondas por naturaleza. No es una esquina para una caja.

Square corners
```css
:root {
  --luz-radius-sm: 0;
  --luz-radius-md: 0;
}
```

[Radio](https://nandovejer.github.io/luz/es/docs/tokens/radius/) indica qué paso usa cada componente.

### Sombras

Tres tokens determinan cuánto parece flotar una superficie: `--luz-shadow-sm` para una tarjeta, `--luz-shadow-md` para tooltips y avisos emergentes, y `--luz-shadow-lg` para diálogos y el cajón.

LUZ las vuelve a dibujar en modo oscuro y, en alto contraste, las sustituye por contornos. Una regla en `:root` fuera de cualquier capa prevalece en todos los modos, así que sirve un solo valor.

Si quieres sombras más marcadas en modo oscuro, defínelas también para ese modo.

Shadows for light and dark
```css
:root {
  --luz-shadow-md: 0 2px 6px rgba(0, 0, 0, 0.12);
}

[data-theme="dark"] {
  --luz-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
}
```

Nunca dejes que una sombra sea el único borde de una superficie: desaparece con los colores forzados. [Sombras](https://nandovejer.github.io/luz/es/docs/tokens/shadows/) incluye los valores, y [Modos de color](https://nandovejer.github.io/luz/es/docs/tokens/modes/) explica cómo se elige uno de los tres.

### Ajustar un componente

Primero, cambia un token: todos los componentes que lo usan se adaptan en todos los modos. Si un componente necesita una regla propia, escríbela en CSS fuera de cualquier capa.

Prevalece sobre todas las capas de LUZ, así que el selector puede ser corto.

A rule for one component
```css
.luz-btn {
  min-height: 3rem;
}
```

Si tu CSS está en capas, declara primero el orden y pon la regla en tu capa. `app` va después de `luz`, así que prevalece.

Your own layers
```css
@layer reset, luz, app;

@layer app {
  .luz-btn {
    min-height: 3rem;
  }
}
```

Tres cosas que debes evitar.

- **`!important`.** Nunca hace falta: el CSS sin capa y el orden de las capas determinan qué prevalece.
- **Usar un color de estado para otra cosa.** Los colores de éxito, advertencia, peligro e información conservan su significado; no los uses como decoración.
- **Quitar el anillo de foco.** `outline: none` impide que quien usa el teclado vea dónde está. Cambia su color con `--luz-focus-ring` y comprueba el resultado con [la comprobación de contraste](https://nandovejer.github.io/luz/es/docs/tokens/contrast/).

[Capas de cascada](https://nandovejer.github.io/luz/es/docs/get-started/layers/) muestra el orden completo de las capas de LUZ.

### Iconos

LUZ dibuja 22 iconos propios en [la página Cuadrícula de iconos](https://nandovejer.github.io/luz/es/docs/components/icon-grid/), que también incluye el marcado. Si necesitas cientos, usa un conjunto.

Sea cual sea el conjunto que uses, el patrón es el mismo:

1. Usa un `<svg>` en línea que use `currentColor`. Así hereda el color del texto y el modo, y funciona con colores forzados.
2. Márcalo como decorativo con `aria-hidden="true"` y `focusable="false"`. El nombre procede del texto visible que hay junto a él o de un elemento span `.u-sr-only` dentro del botón.
3. Define su tamaño en em, por ejemplo, `1.25em`, para que siga el tamaño del texto y los controles de tamaño. No existe un token de tamaño de icono a propósito. Dentro de `.luz-btn`, los iconos ya miden 16px.
4. Dibuja muchas veces un mismo icono desde un único sprite `<symbol>` del mismo documento, nunca desde `<use href="https://…">`, que los navegadores bloquean entre orígenes.
5. Un icono nunca debe transmitir significado por sí solo: un icono de estado debe ir acompañado de palabras. No uses los logotipos de marca de un conjunto como estado o acción. Son marcas registradas, aunque el conjunto tenga licencia MIT.

An icon beside a label
```html
<button class="luz-btn luz-btn--secondary" type="button">
  <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" aria-hidden="true" focusable="false">
    <use href="#icon-download"></use>
  </svg>
  Download
</button>
```

#### Conjuntos con licencia MIT

Estos cinco usan únicamente la licencia MIT, la misma que LUZ. Las licencias se consultaron el 2026-10-15.

Conjuntos de iconos con licencia MIT

- [Feather](https://github.com/feathericons/feather): MIT: [Archivo de licencia de Feather](https://github.com/feathericons/feather/blob/HEAD/LICENSE): Cuadrícula de 24px y trazo de 2px, como los iconos propios de LUZ. Antes de elegirlo, comprueba cuándo se actualizó el repositorio por última vez.
- [Heroicons](https://github.com/tailwindlabs/heroicons): MIT: [Archivo de licencia de Heroicons](https://github.com/tailwindlabs/heroicons/blob/HEAD/LICENSE): Iconos de contorno de 24px e iconos rellenos de 24, 20 y 16px.
- [Tabler Icons](https://github.com/tabler/tabler-icons): MIT: [Archivo de licencia de Tabler Icons](https://github.com/tabler/tabler-icons/blob/HEAD/LICENSE): Un conjunto muy amplio. El grosor del trazo se puede cambiar; el valor predeterminado es 2px.
- [Phosphor](https://github.com/phosphor-icons/core): MIT: [Archivo de licencia de Phosphor](https://github.com/phosphor-icons/core/blob/HEAD/LICENSE): Seis grosores. Elige uno para que los iconos tengan un aspecto uniforme.
- [Bootstrap Icons](https://github.com/twbs/icons): MIT: [Archivo de licencia de Bootstrap Icons](https://github.com/twbs/icons/blob/HEAD/LICENSE): Cuadrícula de 16px.

Iconoir, Ionicons, Radix Icons y Fluent UI System Icons también usan únicamente la licencia MIT, a fecha de 2026-10-15. No aparecen en esta lista para que sea breve.

LUZ no incluye estos conjuntos ni los prueba. La licencia MIT exige conservar el aviso de copyright: copia junto a los iconos el aviso del conjunto que uses y comprueba el archivo de licencia de la versión elegida.

#### Conjuntos no recomendados por LUZ

Son populares, pero ninguno tiene solo licencia MIT. Se indica el motivo para que nadie los añada por error.

Conjuntos de iconos que no tienen solo licencia MIT

- Lucide: ISC: ISC es una licencia distinta de MIT.
- Remix Icon: Su propia licencia, Remix Icon License v1.0: No es MIT. El repositorio y el paquete npm indican licencias distintas, así que no está claro qué licencia tiene el conjunto.
- Material Symbols y Material Design Icons: Apache-2.0: Apache-2.0 no es MIT.
- Font Awesome Free: Iconos CC BY 4.0, fuentes OFL 1.1, código MIT: Los iconos tienen una licencia Creative Commons y las fuentes, una licencia OFL.
- Simple Icons: CC0-1.0: CC0 no es MIT.
- Octicons: MIT, con una excepción: El archivo de licencia es MIT, pero el README indica que los logotipos de GitHub siguen las directrices de marca de GitHub. El conjunto contiene archivos que no tienen licencia MIT.

### Qué no debes cambiar

Todo lo anterior se puede cambiar sin problema. Estos elementos no, y cada uno tiene un motivo.

- **Las escalas de color.** Los componentes usan tokens semánticos. Cámbialos en [un tema propio](https://nandovejer.github.io/luz/es/docs/tokens/themes/), no en la paleta sobre la que se construyen.
- **Los colores de estado.** `--luz-color-success`, `--luz-color-warning`, `--luz-color-danger` y `--luz-color-info` significan lo que indican sus nombres. No los uses para otra cosa.
- **El anillo de foco.** Puedes cambiar su color, pero no quitarlo.
- **Los objetivos de 44px.** Las alturas de los controles, de `--luz-control-sm` a `--luz-control-xl`, no son ajustables.
- **Los archivos de `dist/`.** Se generan y se sustituyen en cada versión. Tus cambios deben ir en tu propio CSS.
