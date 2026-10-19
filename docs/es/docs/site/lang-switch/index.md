# Selector de idioma

Permite acceder desde un botón de la cabecera a la misma página en otro idioma.

### Problemas conocidos
La lista se abre en una posición fija bajo la cabecera, no bajo su botón: para colocarla junto al botón hace falta el posicionamiento mediante anclas CSS, que aún no está disponible en todos los navegadores. Por debajo de 360 px de ancho, el botón solo muestra el globo para que la cabecera quepa en una fila; el nombre del idioma sigue siendo su nombre accesible, así que quien lo ve tiene que reconocer el globo.

Todavía no se ha probado con un lector de pantalla.

### Copiar el marcado
Un enlace por idioma, a la misma página en ese idioma, en la cabecera de cada página traducida. En cada página, marca el idioma actual con `aria-current="page"` y escribe la etiqueta en el idioma de la página.

Language switch markup
```html
<luz-lang-switch>
  <button class="luz-lang-switch__button" type="button" popovertarget="lang-menu">
    <span class="u-sr-only">Language: </span><span class="luz-lang-switch__name">English</span>
  </button>
  <nav class="luz-lang-switch__menu" id="lang-menu" popover aria-labelledby="lang-title">
    <p class="luz-lang-switch__title" id="lang-title">Language</p>
    <ul class="luz-lang-switch__list">
      <li><a class="luz-lang-switch__link" href="/" hreflang="en" lang="en" aria-current="page">English</a></li>
      <li><a class="luz-lang-switch__link" href="/es/" hreflang="es" lang="es">Español</a></li>
      <li><a class="luz-lang-switch__link" href="/ar/" hreflang="ar" lang="ar">العربية</a></li>
    </ul>
  </nav>
</luz-lang-switch>
```

### Variantes y opciones
No hay variantes. Una propiedad personalizada coloca la lista.

- `<luz-lang-switch>`: El bloque contiene el botón y la lista. Es una etiqueta que ningún script define y que no tiene clase ni rol propios
- `.luz-lang-switch__button`: Un botón de 44 px con el nombre del idioma actual; se rellena cuando la lista está abierta
- `.luz-lang-switch__icon`: Un globo opcional antes del nombre, dibujado en el color del texto. Es decorativo: `aria-hidden="true"`
- `.luz-lang-switch__name`: El nombre del idioma actual. Por debajo de 360 px queda recortado y solo se ve el globo; el nombre sigue formando parte del nombre del botón
- `.luz-lang-switch__menu`: El popover: fijo bajo la cabecera, al final de la fila (en el borde izquierdo en texto de derecha a izquierda)
- `.luz-lang-switch__title`: El nombre visible de la lista
- `.luz-lang-switch__list`: La lista de idiomas, sin viñetas
- `.luz-lang-switch__link`: Una fila de 44 px por idioma. Con `aria-current`: en negrita y subrayada
- `--luz-lang-switch-top`: Distancia desde la parte superior de la pantalla a la que se abre la lista. Por defecto es `--luz-bar-h`, la altura de una barra de una fila con controles de 44 px; establécela en la etiqueta si tu cabecera es más alta.

### Cómo funciona
Cambiar de idioma implica ir a otra página, así que el selector es una lista de enlaces. El botón la abre con el `popovertarget` nativo y `@luz-ds/site` solo le da estilo: no hay ningún script.

`<luz-lang-switch>` es una etiqueta que ningún script define; solo da un nombre al bloque en el marcado y en CSS, y no añade ningún rol: el significado lo aportan el botón y `nav`.

- Cada idioma se nombra en ese mismo idioma, con `lang` para que lo pronuncie un lector de pantalla y `hreflang` para indicar el idioma del enlace.
- La lista es un popover en la capa superior, fijo bajo la cabecera al final de la línea; se refleja en texto de derecha a izquierda.
- La propia página declara su idioma y dirección: `<html lang="ar" dir="rtl">`. Añade un `<link rel="alternate" hreflang="…">` por idioma en el `<head>` para que los buscadores encuentren las demás versiones.
- Core cambia el texto en árabe a la sans serif del sistema y elimina el espaciado entre letras: la serif no tiene caracteres árabes y el espaciado rompe las ligaduras de la escritura.

### Sin JavaScript
Nada cambia: el botón abre la lista con la API de popover y los enlaces siguen siendo enlaces. En navegadores sin la API de popover, el botón se oculta y los enlaces se muestran en una fila.

### Teclado y ARIA
Pulsa Tab hasta el botón y Enter o Espacio para abrir la lista; Tab recorre los idiomas y Enter sigue el enlace seleccionado. Escape o un clic fuera cierra la lista.

- El navegador indica a las tecnologías de asistencia si la lista está abierta mediante `popovertarget`.
- El nombre del botón es «Idioma: English»: primero qué es y luego el texto visible (WCAG 2.5.3). Por debajo de 360 px solo se ve el globo, pero el nombre no cambia.
- El idioma actual es un enlace con `aria-current="page"`.

### Cuándo usarlo
Úsalo en sitios cuyas páginas estén disponibles en dos o más idiomas, en el mismo lugar de la cabecera de cada página traducida.

### Cuándo no usarlo
No lo añadas a páginas disponibles en un solo idioma, aunque el resto del sitio esté traducido.

- No elijas el idioma por el lector según los ajustes del navegador o su ubicación: deja que lo elija y enlaza cada página con sus otras versiones.
- No lo uses para traducir la página en el sitio mediante un script: cada idioma tiene su propia página y dirección.

No sustituye nada de LUZ. Hace innecesario usar un `<select>` con un script que cambie la dirección.
