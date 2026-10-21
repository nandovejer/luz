# Cómo leer LUZ

Qué indican los nombres del CSS, el marcado y los tokens de LUZ, y en cuáles puedes confiar.

### Nombres de clase

El principio de un nombre de clase indica qué es y de qué paquete procede.

Qué significa cada prefijo de clase

- `.luz-`: Un componente o una parte de uno: core: `.luz-btn`
- `.o-`: Un objeto de maquetación: organiza elementos y no tiene aspecto propio: core: `.o-stack`
- `.u-`: Una utilidad: una sola función, sin un componente alrededor: core: `.u-sr-only`
- `.luz-landing-`: Una parte de una landing page: landing: `.luz-landing-hero`
- `.luz-cms-`: Una parte de un blog, un periódico o cualquier CMS: cms: `.luz-cms-header`
- `.luz-app-`: Una parte de una aplicación web: app: `.luz-app-header`
- `.luz-docs-`: Una parte de una página de documentación: docs: `.luz-docs-pager`
- `.is-`: Un estado que un script refleja en un elemento. Puedes leerlo, pero no apliques estilos desde fuera: no forma parte de aquello en lo que puedes confiar: core: `.is-active`

Dentro de un componente, dos separadores indican cómo encajan sus partes. Un guion bajo doble nombra una parte del componente: `.luz-card__title` es el título de una tarjeta.

Un guion doble nombra una variante: `.luz-btn--primary` es el botón principal.

Lee este marcado de izquierda a derecha, una clase cada vez.

A card with a primary button
```html
<div class="o-stack">
  <article class="luz-card">
    <h3 class="luz-card__title">Team plan</h3>
    <button class="luz-btn luz-btn--primary" type="button">Choose plan</button>
  </article>
</div>
```

- `o-stack` es un objeto de maquetación: dispone sus elementos hijos en una columna.
- `luz-card` es un componente, una tarjeta.
- `luz-card__title` es una parte de la tarjeta: su título.
- `luz-btn` es otro componente, un botón, y `luz-btn--primary` es su variante principal.

### Nombres de tokens

Un token es una propiedad personalizada de CSS que empieza por `--luz-`. La palabra siguiente indica qué tipo de valor contiene.

Un token de cada tipo

- `--luz-blue-60`: Primitivo: Un color sin asignación: una familia y un nivel. No tiene una función y nunca cambia con el modo
- `--luz-brand-primary`: Token semántico: Una función: el color de los enlaces y las acciones. Tiene un valor para cada modo
- `--luz-space-md`: Paso de escala: Un paso de la escala de espaciado
- `--luz-text-lg`: Paso de escala: Un paso de la escala tipográfica
- `--luz-type-base`: Control: El valor a partir del cual se calcula una escala entera. Cámbialo para cambiar el tamaño de todos sus pasos
- `--luz-z-modal`: Ajuste: Un valor que core usa para distribuir la página: orden de apilado, movimiento y puntos de ruptura

- Los componentes de LUZ usan tokens semánticos y pasos de escala. Nunca usan un primitivo ni un control.
- Puedes definir cualquier token en tu propio CSS. [Hazlo tuyo](https://nandovejer.github.io/luz/es/docs/get-started/make-it-yours/) explica cómo.

Cada familia tiene su página: [color](https://nandovejer.github.io/luz/es/docs/tokens/color/), [tipografía](https://nandovejer.github.io/luz/es/docs/tokens/typography/), [espaciado y tamaño](https://nandovejer.github.io/luz/es/docs/tokens/spacing/), [radio](https://nandovejer.github.io/luz/es/docs/tokens/radius/), [sombras](https://nandovejer.github.io/luz/es/docs/tokens/shadows/), [movimiento](https://nandovejer.github.io/luz/es/docs/tokens/motion/) y [maquetación y puntos de ruptura](https://nandovejer.github.io/luz/es/docs/tokens/layout/).

### Atributos

Las clases sirven para los estilos. Los atributos que empiezan por `data-` permiten que un script y tu marcado se comuniquen.

- `data-theme` en `<html>` elige el modo de color (`light`, `dark` o `high-contrast`) o el nombre de un aspecto propio.
- `data-mode` en `<html>` elige el modo de color dentro de un aspecto propio: `data-theme="my-brand"` con `data-mode="dark"`.
- `data-luz-*` son los puntos de integración de los scripts de LUZ, como `data-luz-js`, que el script establece en `<html>` cuando se ejecuta. Los scripts se conectan a estos atributos, nunca a una clase.
- `data-luz-classless` activa los [estilos sin clases](https://nandovejer.github.io/luz/es/docs/get-started/classless/) para el marcado que contiene.
- `data-luz-label-*` sobrescribe un texto que escribe un script.

Estos son ejemplos, no la lista completa: la página de cada componente indica los atributos que usa.

### Elementos que empiezan por luz

Una etiqueta que empieza por `luz-` es un elemento personalizado. Los de LUZ usan DOM ligero, así que tu CSS puede acceder a su interior, y sus partes son clases: `.luz-<tag>__<part>`.

- **Con script:** `<luz-search>`, `<luz-consent>`, `<luz-mode>` y `<luz-timeline>` necesitan su script para funcionar.
- **Solo CSS:** `<luz-lang-switch>`, `<luz-submenu>` y `<luz-banner>` no necesitan ningún script. Son etiquetas a las que puedes aplicar estilos con o sin script.

En [Cómo se organiza LUZ](https://nandovejer.github.io/luz/es/docs/get-started/structure/) se indica qué paquete contiene cada elemento.

### Capas, en un párrafo

Todo el CSS de LUZ está en una capa de cascada llamada `luz`, que contiene capas con nombre, y cualquier CSS tuyo que no esté en una capa prevalece sobre todo sin necesidad de `!important`. [Capas de cascada](https://nandovejer.github.io/luz/es/docs/get-started/layers/) las enumera en orden y explica cómo sobrescribir una.

### En qué puedes confiar

No todos los nombres son una promesa. Estas cuatro partes de LUZ son API pública: cualquier cambio se anuncia.

- **Tokens**: todas las propiedades personalizadas `--luz-` de `tokens.css`, pero no las que un componente declara para sí mismo.
- **Clases**: clases `.luz-`, `.o-` y `.u-` del marcado que muestra la documentación, con sus partes y variantes. No las clases `.is-`.
- **Atributos**: `data-theme`, `data-mode`, `data-luz-*` y `data-luz-label-*`. No los atributos que usan los propios scripts del sitio de documentación.
- **Paquetes**: el mapa `exports` de cada paquete y las rutas de los archivos que publica.

En la beta, cualquier cosa puede cambiar y el changeset de la versión explica cómo migrar. Consulta [Qué es API pública, en VERSIONING.md en GitHub](https://github.com/nandovejer/luz/blob/main/VERSIONING.md) para ver la tabla completa.

### Cómo leer el nombre de un archivo

El nombre de un archivo indica su contenido. Cada archivo CSS también tiene una versión `.min` con las mismas reglas minimizadas: `luz.css` y `luz.min.css`.

Archivos de la carpeta dist de cada paquete

- `luz-tokens.css`: `@luz-ds/tokens`: Siempre, salvo que uses tu propia fuente. Incluye los tokens y las reglas `@font-face` de ET Book
- `tokens.css`: `@luz-ds/tokens`: En lugar de `luz-tokens.css`, si usas tu propia fuente: los mismos tokens, sin `@font-face`
- `luz.css`: `@luz-ds/core`: Para cargar de una vez el restablecimiento, los elementos sin clases, los objetos de maquetación, los componentes y las utilidades
- `base.css`: `@luz-ds/core`: Si solo quieres unos pocos componentes: carga el restablecimiento y los elementos sin clases y, después, un archivo por componente
- `components/<name>.css`: `@luz-ds/core`: Después de `base.css`, para cada componente que uses
- `classless.css`: `@luz-ds/core`: Para el marcado al que no puedes añadir clases, dentro de `data-luz-classless`. Es un archivo independiente, no está en `luz.css`
- `themes/_template.css`: `@luz-ds/core`: Nunca lo uses tal cual: cópialo como punto de partida para crear tu propio aspecto
- `site.css`: `@luz-ds/site`: Cuando la página use un elemento de site, como `<luz-search>`

Para elegir las líneas de tu compilación, [elige tu fragmento](https://nandovejer.github.io/luz/es/docs/get-started/snippet/).
