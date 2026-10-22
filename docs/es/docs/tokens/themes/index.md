# Crea tu propio tema

LUZ incluye un aspecto en tres modos de color. Tu propio tema es un archivo de tokens semánticos: parte de la plantilla, compruébalo y cárgalo.

### Qué es un tema

Un **modo de color** indica si la página es clara u oscura: `light`, `dark` o `high-contrast`. Un **tema** define una identidad completa: colores y, opcionalmente, fuentes, radios y sombras. Cada tema tiene los tres modos.

- LUZ incluye **un aspecto**, Vejer, en los tres modos. Es el predeterminado: si no hay ningún atributo, se usa su modo claro.
- Tu tema solo sobrescribe **tokens semánticos**. Nunca cambia un token primitivo ni afecta al CSS de un componente.
- Asígnale un nombre con `data-theme` y elige su modo con `data-mode`.
- Sobrescribir tokens y crear un tema es lo mismo: un tema es un conjunto de sobrescrituras con nombre y un modo para cada aspecto.

### Créalo paso a paso

1. **Copia la plantilla.** Está en `@luz-ds/core/themes/_template.css`. Todos sus valores son propios de LUZ, así que supera la comprobación de contraste antes de que cambies nada.
2. **Cámbiale el nombre.** Sustituye las tres apariciones de `my-brand` por el nombre de tu tema: usa letras minúsculas, dígitos y guiones.
3. **Cambia lo que necesites.** Empieza por los colores de marca y las superficies. Mantén completos los tres bloques: un token que falte en el bloque oscuro toma el valor del claro.
4. **Compruébalo.** Ejecuta el comando de [Compruébalo](https://nandovejer.github.io/luz/es/docs/tokens/themes/#check) hasta que lo supere.
5. **Cárgalo** después de `luz-tokens.css` y `luz.css`, y define el atributo.
6. **Inclúyelo** en `data-luz-themes` para que el selector de modo recuerde la elección del visitante.

Loading a theme
```html
<link rel="stylesheet" href="luz-tokens.css">
<link rel="stylesheet" href="luz.css">
<link rel="stylesheet" href="my-brand.css">

<html lang="en" data-theme="my-brand" data-luz-themes="my-brand">
<!-- or, in its dark mode -->
<html lang="en" data-theme="my-brand" data-mode="dark" data-luz-themes="my-brand">
```

Un tema pequeño puede incluir solo los tokens distintos en el primer bloque: lo que omitas toma el valor de LUZ. Completa también los bloques oscuro y de alto contraste si ofreces esos modos.

A minimal theme
```css
[data-theme="my-brand"] {
  --luz-brand-primary: #0057ff;
  --luz-brand-hover: #0043c2;
  --luz-brand-active: #003399;
  --luz-brand-fill: #0057ff;
  --luz-focus-ring: #0057ff;
  --luz-surface-page: #f8faff;
}
```

### Tokens que define un tema

La plantilla los enumera todos en cada uno de sus tres bloques. Son los mismos tokens que aparecen en [la página de color](https://nandovejer.github.io/luz/es/docs/tokens/color/), junto con la función de cada uno; aquí se agrupan por categoría.

**Opcionales y fuera de los tres bloques:** `--luz-font-body`, `--luz-font-heading` y `--luz-font-serif` para las fuentes; `--luz-radius-sm` y `-md` para las esquinas; y `--luz-shadow-sm`, `-md` y `-lg`. Defínelos en el primer bloque.

**No forman parte de un tema:** los tamaños (`--luz-type-base`, `--luz-type-ratio` y `--luz-space-unit`) se definen en `:root`, no en un tema. Un tema cambia los colores de cada modo; los tamaños se eligen para toda la página. Consulta [Tipografía](https://nandovejer.github.io/luz/es/docs/tokens/typography/) y [Espaciado](https://nandovejer.github.io/luz/es/docs/tokens/spacing/).

### Compruébalo

The command
```text
npx @luz-ds/tokens check-contrast my-brand.css
```

- Lee el tema como lo haría el navegador: el primer bloque es el modo claro y cada bloque `data-mode` se aplica sobre él.
- Los mínimos para los tres modos son 4,5:1 para el texto y 3:1 para el texto deshabilitado, los bordes, los bordes de campos y los anillos de foco. Devuelve el código de salida `1` si falla algún par.
- También puedes pegar el tema en [la comprobación del contraste](https://nandovejer.github.io/luz/es/docs/tokens/contrast/) de la página.
- **LUZ solo garantiza lo que incluye.** Tu tema es tan accesible como indica esta comprobación, ni más ni menos.

### Capas, modos y ámbito

- **Capas.** Incluye el tema en `@layer luz.themes` para que quede por debajo de tu CSS, o déjalo fuera de una capa para que prevalezca sobre todo LUZ. En ambos casos prevalece sobre `luz.tokens`. [La página de capas](https://nandovejer.github.io/luz/es/docs/get-started/layers/) explica el orden.
- **Una zona.** `data-theme` funciona en cualquier elemento: el tema se aplica a ese elemento y a su contenido. Un selector de fecha u hora y un selector toman el esquema de color de un antecesor con `data-theme`, así que en esos casos pon el atributo en `<html>`.
- **Colores forzados.** Quien fuerza los colores ve los del sistema, no tu tema. No tienes que hacer nada: los componentes se encargan.
- **Impresión.** La capa `luz.print` establece los colores del papel, sea cual sea el tema.
- **Preferencia del sistema operativo.** Si no hay una elección guardada ni un atributo, la página es clara. Para seguir `prefers-color-scheme`, [define `data-theme` mediante un script breve](https://nandovejer.github.io/luz/es/docs/tokens/modes/#system): se explica en la página de modos de color.

### Límites

- Un solo tema a la vez por elemento. Combina un tema y un modo, no dos temas.
- El selector de modo solo reconoce los nombres de `data-luz-themes`: un nombre que no esté en la lista funciona como atributo, pero no se recuerda.
- No se usa `light-dark()`: no será Baseline Widely available antes del 2026-11-13.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
