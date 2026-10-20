# Búsqueda

Permite encontrar por su nombre una página, sección o elemento HTML del sitio, mediante un botón de la cabecera.

### Problemas conocidos
La búsqueda todavía no se ha probado con un lector de pantalla. Ctrl+K abre esta búsqueda en lugar del cuadro de búsqueda web del navegador; usa la barra de direcciones para buscar en la web.

Con `site.js`, si pulsas Ctrl+K antes de que se haya cargado el script de búsqueda, este se carga y luego abre el diálogo; la espera puede ser algo más larga con una conexión lenta. Con un zoom del 400 %, se desplaza todo el diálogo, así que el campo puede quedar fuera de la vista mientras lees los resultados.

### Copiar el marcado
Un `<luz-search>` contiene el enlace a tu índice, el botón que lo sustituye y el diálogo. Colócalo donde vaya la búsqueda, normalmente al final de la cabecera: el enlace y el botón comparten el mismo espacio, así que nada se desplaza cuando el botón toma el relevo, y el diálogo cerrado no ocupa espacio.

Todos los textos son tuyos: escríbelos en el idioma de la página.

Search markup
```html
<luz-search>
  <a class="luz-search__fallback" href="/a-z/" data-luz-search-fallback>
    <svg class="luz-search__trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
    <span class="luz-search__fallback-label">A–Z index</span>
  </a>
  <button class="luz-search__trigger luz-search__trigger--compact" type="button" data-luz-search-open
          aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" hidden>
    <svg class="luz-search__trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
    <span class="luz-search__trigger-label">Search docs…</span>
    <kbd class="luz-search__trigger-key" aria-hidden="true">Ctrl K</kbd>
  </button>
  <dialog class="luz-modal luz-search" aria-labelledby="search-title"
          data-luz-search-src="/search-index.json"
          data-luz-label-results="{n} results"
          data-luz-label-result="1 result"
          data-luz-label-capped="{shown} of {n} results. Type more to narrow."
          data-luz-label-none="No results for “{query}”. Check the spelling or try a shorter word."
          data-luz-label-loading="Loading the search index…"
          data-luz-label-error="Search is not available right now.">
    <search class="luz-search__body">
      <div class="luz-search__head">
        <h2 class="luz-search__title" id="search-title"><label for="search-q">Search the documentation</label></h2>
        <form method="dialog"><button class="luz-btn luz-btn--ghost luz-search__close" aria-label="Close search">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button></form>
      </div>
      <div class="luz-search__field">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input class="luz-input" id="search-q" type="text" maxlength="100" autocomplete="off"
               spellcheck="false" enterkeyhint="go" autofocus aria-describedby="search-hint">
      </div>
      <p class="luz-field__helper" id="search-hint">Results update as you type. Arrow keys move through them.</p>
      <p class="luz-search__status" role="status"></p>
      <div class="luz-search__results" data-luz-search-results>
        <div hidden><h3>Pages</h3><ul data-luz-search-list="pages"></ul></div>
        <div hidden><h3>Sections</h3><ul data-luz-search-list="sections"></ul></div>
        <div hidden><h3>HTML elements</h3><ul data-luz-search-list="elements"></ul></div>
      </div>
      <p class="luz-search__foot">Can’t find it? <a href="/a-z/">Browse the A–Z index</a></p>
    </search>
  </dialog>
</luz-search>

<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>
```

### Variantes y opciones
Todas las opciones se indican en el marcado: son clases o atributos.

- `.luz-search__trigger--compact`: a 768 px o menos, el activador solo muestra la lupa, en un espacio de 44 por 44 px, igual que el enlace contiguo; sus nombres se mantienen, aunque recortados, no se eliminan. Añade a ambos un `<svg class="luz-search__trigger-icon">`.
- Se puede usar más de un activador: todos los `[data-luz-search-open]` de la página abren el diálogo, estén dentro del elemento o no (este sitio tiene uno en la cabecera y otro en la portada de la documentación). Los que estén fuera permanecen ocultos hasta que funcione la búsqueda y no ocupan espacio: colócalos donde su aparición no desplace nada, por ejemplo, al final de una sección.
- Un elemento con `data-luz-search-show="idle"` dentro de `[data-luz-search-results]` se muestra mientras el campo está vacío, por ejemplo, con una lista breve de páginas populares; uno con `data-luz-search-show="none"` se muestra cuando no hay coincidencias.
- Omite `[data-luz-search-list]` para no incluir ese grupo.
- Los textos que escribe el script son los atributos `data-luz-label-*` del diálogo: `results`, `result`, `capped`, `none`, `loading` y `error`, con `{n}`, `{shown}` y `{query}`. `data-luz-label-idle` es el texto que muestra el estado mientras el campo está vacío, por ejemplo, «Escribe para buscar en la documentación». Si falta una etiqueta, no se escribe nada.

### Cómo funciona
Carga `site.min.js` como módulo. No carga nada en páginas sin `<luz-search>`.

En una página que sí lo tenga, carga el archivo de búsqueda, `search.min.js`, cuando el lector pasa el puntero por primera vez, mueve el foco al elemento o pulsa `Ctrl` + `K`, o cuando el navegador está inactivo, lo que ocurra antes. Ese archivo define `<luz-search>`, un elemento personalizado en el DOM ligero (sin Shadow DOM), y cada instancia de la página se conecta por sí misma.

- El botón ocupa el mismo espacio que el enlace, así que nada se desplaza. Si el enlace tiene el foco del teclado o el puntero está pulsado en ese momento, el cambio espera a que el lector salga del enlace, lo siga o suelte el puntero: el foco nunca se mueve.
- El botón abre el `<dialog>` nativo con `showModal()`: el navegador mantiene el foco dentro, lo cierra con Escape y devuelve el foco a su origen.
- La primera vez que se abre el diálogo, el script lee el índice.
- Si no se puede cargar `search.min.js`, la página conserva el comportamiento sin JavaScript: el enlace funciona y el botón permanece oculto.
- Si un router o framework añade un `<luz-search>` después de cargar la página, `site.min.js` no lo detecta: importa `@luz-ds/site/search` (o `search.min.js`) a mano y se conectará al elemento cuando este se inserte. Aunque haya dos copias del archivo en una página, el elemento solo se define una vez.

El índice es un archivo JSON de la versión 1. Cada lista contiene `[text, url, meta, lang]`; `meta` (que se muestra atenuado después del texto) y `lang` son opcionales, y las URL son relativas al archivo:

Search index format
```json
{
  "version": 1,
  "pages": [["Button", "components/button/", "Components"]],
  "sections": [["When to use", "components/button/#when", "Button › Design"]],
  "elements": [["<table> element, Tables", "html/tables/#el-table"]]
}
```

Un resultado coincide cuando el texto y los metadatos contienen todas las palabras escritas, sin distinguir mayúsculas, minúsculas ni acentos; los que empiezan por esas palabras aparecen primero. Cada grupo muestra un máximo de 8 resultados y la línea de estado indica cuántos hay.

Qué acepta el componente para que un índice generado por un CMS no pueda dañar la página:

- El JSON solo puede proceder del mismo origen de la página, por http o https; si hay una redirección, la solicitud falla. Tu Content-Security-Policy necesita `connect-src 'self'`; para usar un índice de otro sitio, aloja una copia en el tuyo. El navegador lo almacena en caché como cualquier archivo.
- Los enlaces solo pueden ser URL `http:` y `https:`; se omite cualquier otro elemento. El texto se escribe como texto, nunca como HTML.
- Límites: 1 000 000 de caracteres JSON, 10 000 resultados, 300 caracteres por texto, 8 palabras por búsqueda y 100 caracteres en el campo. Se ignoran los campos desconocidos. Si el índice no es de la versión 1, se muestra el mensaje de error.

### Sin JavaScript
El botón permanece oculto, no recibe el foco ni se lee; en su lugar se muestra el enlace. Crea una página que enumere todas las páginas por nombre, como un índice alfabético. El diálogo nunca se abre.

### Teclado y ARIA
Todo funciona con el teclado mediante un atajo.

- `Ctrl` + `K` o `⌘` + `K` abre la búsqueda desde cualquier lugar de la página, excepto mientras escribes en un área de texto o una región editable, o mientras haya otro diálogo abierto. Si lo pulsas de nuevo, selecciona el texto del campo. Si lo pulsas antes de que se cargue `search.min.js`, lo carga y luego abre el diálogo; en una página sin `<luz-search>`, el navegador conserva el atajo.
- La flecha abajo pasa del campo al primer resultado; las flechas arriba y abajo recorren los resultados, incluso entre grupos; Inicio y Fin van al primero y al último. La flecha arriba en el primer resultado vuelve al campo.
- Enter en el campo abre el primer resultado; en un resultado, sigue el enlace. Si escribes mientras tienes un resultado enfocado, vuelves al campo.
- Escape o el botón de cierre (un icono × llamado *Cerrar búsqueda* mediante su `aria-label`) cierra el diálogo, sea cual sea el contenido del campo, y devuelve el foco a su posición anterior. Por eso el campo es `type="text"`: en uno `type="search"`, Chrome y Safari usan la primera pulsación de Escape para borrar el texto. Si un resultado lleva a la misma página, el diálogo se cierra y el foco pasa al encabezado de esa sección. Si al abrirlo nada tenía el foco (Ctrl+K en una página recién cargada o un clic en un navegador que no enfoca botones), el script lo pasa al botón que abrió el diálogo o al propio botón de búsqueda tras Ctrl+K, para que la siguiente pulsación de Tab continúe desde la cabecera.
- El encabezado da nombre al diálogo y etiqueta el campo. El recuento se anuncia cuando el lector deja de escribir (`role="status"`). Los resultados son enlaces en listas bajo encabezados, no un combobox.

### Cuándo usarlo
Usa la búsqueda en sitios con más de unas pocas páginas, donde el lector pueda buscar un componente, un ajuste o el título de un artículo por su nombre.

### Cuándo no usarlo
No uses la búsqueda en lugar de la navegación: mantén el menú y una página de índice.

- La búsqueda requiere escribir y conocer el nombre, que quizá el lector desconozca.
- Solo encuentra coincidencias en títulos y encabezados: no puede buscar dentro de textos largos ni en varios sitios.
