# Referencia de clases

Todas las etiquetas y clases de los componentes de site, el elemento al que se aplican y su función, en un solo lugar.

Busca una etiqueta o una clase por nombre. La página de cada componente incluye su marcado y las recomendaciones de uso.

La estructura de página que antes proporcionaba site, desde la carcasa hasta el pie, está en core ([maquetación](https://nandovejer.github.io/luz/es/docs/components/layout/), [enlace para saltar al contenido](https://nandovejer.github.io/luz/es/docs/components/skip-link/), [imagen](https://nandovejer.github.io/luz/es/docs/components/image/), [franja](https://nandovejer.github.io/luz/es/docs/components/band/)) y en los paquetes para cada tipo de sitio ([landing](https://nandovejer.github.io/luz/es/docs/landing/), [CMS](https://nandovejer.github.io/luz/es/docs/cms/)).

### Búsqueda

- <luz-search>: <luz-search>: El elemento que define `search.min.js`. Contiene el enlace alternativo, el botón y el diálogo; el enlace y el botón comparten un espacio para que nada se mueva cuando el botón sustituye al enlace.
- .luz-search__fallback: <a>: El enlace a un índice de todas las páginas, visible hasta que funciona la búsqueda. Es un control elevado, con la lupa antes del texto.
- .luz-search__fallback-label: <span>: El texto del enlace, que también es su nombre. Se recorta, pero no se elimina, junto a un botón compacto a 768 píxeles o menos.
- .luz-search__trigger: <button>: El botón de búsqueda, con forma de campo: etiqueta y, después, el atajo de teclado. Está oculto en el marcado y en su lugar; el script lo muestra.
- .luz-search__trigger--compact: <button>: Modificador. A 768 píxeles o menos solo se ve la lupa, y también aparece el enlace junto a ella; el texto sigue formando parte de sus nombres.
- .luz-search__trigger-icon: <svg>: La lupa, con el color del texto, en el botón y en el enlace.
- .luz-search__trigger-label: <span>: La etiqueta visible, que también es el nombre del botón.
- .luz-search__trigger-key: <kbd aria-hidden="true">: La indicación del atajo «Ctrl K». Oculta en pantallas táctiles y para las tecnologías de asistencia, que leen `aria-keyshortcuts`.
- .luz-search: <dialog>: Con `.luz-modal`: el diálogo de búsqueda, una columna con resultados desplazables; a pantalla completa a 768 píxeles o menos.
- .luz-search__body: <search>: El campo, el estado y los resultados.
- .luz-search__head: <div>: El título y el botón de cierre en una fila que se ajusta.
- .luz-search__title: <h2>: El nombre del diálogo; su etiqueta da nombre al campo.
- .luz-search__field: <div>: El campo, con una lupa `svg` decorativa al principio.
- .luz-search__status: <p>: El número de resultados, `role="status"`, en tamaño pequeño y con el color atenuado.
- .luz-search__close: <button>: El botón de cierre, de 44 píxeles de alto, dentro de un `form method="dialog"`.
- .luz-search__results: <div>: Los grupos de resultados: cada uno con un encabezado y una lista de enlaces.
- .luz-search__foot: <p>: La última línea, con el enlace a la página del índice.

### Selector de idioma

- <luz-lang-switch>: etiqueta a: El bloque: contiene el botón y la lista, sin clase ni rol propios. Define `--luz-lang-switch-top`, la distancia desde arriba a la que se abre la lista (por defecto, la de `--luz-bar-h` de core).
- .luz-lang-switch__button: <button>: Abre la lista con `popovertarget`. Muestra el idioma actual; su nombre empieza por la etiqueta, que está oculta.
- .luz-lang-switch__icon: <svg>: El globo, decorativo y con el color del texto.
- .luz-lang-switch__name: <span>: El nombre del idioma actual en el botón. Se recorta por debajo de 360 píxeles y solo se ve el globo, pero sigue formando parte del nombre del botón.
- .luz-lang-switch__menu: <nav>: El popover con la lista, fijado debajo de la cabecera al final de la fila.
- .luz-lang-switch__title: <p>: El nombre visible de la lista, que etiqueta la navegación.
- .luz-lang-switch__list: <ul>: Los idiomas, uno por fila y sin viñetas.
- .luz-lang-switch__link: <a>: Un idioma que se nombra a sí mismo, con `lang` y `hreflang`; en negrita y subrayado con `aria-current`.

### Submenú

- <luz-submenu>: alrededor de un <details>: Una etiqueta sin clase: un elemento de los enlaces de la cabecera que contiene otros enlaces. `<summary>` es el botón y el `<ul>` siguiente contiene los enlaces. Sin scripts.

### Banner y consentimiento de cookies

- <luz-banner>: alrededor de un <section>: Una etiqueta sin clase: una franja sobre la cabecera con un anuncio breve y un enlace, cuyo texto se alinea con la columna de la cabecera. Sin scripts ni botón de cierre.
- tone="warning": <luz-banner>: Los colores de aviso, para algo que impide a quien visita la página hacer lo que venía a hacer; las palabras también lo indican.
- .luz-consent: <section hidden>: El banner de cookies, dentro de un `<luz-consent>` anterior a la cabecera, que se muestra como una franja fija en la parte inferior de la ventana. Está oculto en el marcado: `consent.min.js` lo muestra si no hay ninguna respuesta guardada.
- .luz-consent__title: <h2>: El encabezado del banner, en sans; da nombre a la región.
- .luz-consent__choices: <details>: Las categorías de cookies opcionales, como casillas de verificación en un formulario, debajo de Aceptar y Rechazar.
