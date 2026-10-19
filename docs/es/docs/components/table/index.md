# Tabla

Compara registros con varios atributos, en filas y columnas que se leen bien a 320 px.

### Problemas conocidos
La ordenación en el navegador (`data-luz-sort`) solo se ha comprobado en el árbol de accesibilidad de Chromium; aún no se ha probado con NVDA, JAWS, VoiceOver, TalkBack ni Orca. La columna ordenada se indica con `aria-sort` en su cabecera y cada ordenación se anuncia en un mensaje de estado; al recorrer las cabeceras con Tab se anuncia el nombre de la columna, y el estado de ordenación se lee en la celda de cabecera y en el mensaje de estado.

- Solo se ordenan las filas cargadas en la página; la ordenación no se conserva al recargar y la barra de direcciones no cambia. No se admiten tablas con varias filas de cabecera ni cabeceras con `colspan`; al convertir una cabecera ordenable en botón se descarta cualquier contenido que no sea su texto o un enlace.
- Ordenar unos miles de filas las mueve todas en una sola tarea: ordénalas en el servidor. El orden del texto depende de la configuración regional del navegador para el idioma de la tabla.

### Copiar el marcado
Table markup
```html
<div class="luz-table-wrap" role="region" aria-label="Invoices" tabindex="0">
  <table class="luz-table">
    <caption>Invoices</caption>
    <thead>
      <tr><th scope="col">Number</th><th scope="col">Date</th><th scope="col">Amount (€)</th></tr>
    </thead>
    <tbody>
      <tr><td data-label="Number">INV-0042</td><td data-label="Date">1 Oct 2026</td><td data-label="Amount (€)">120.00</td></tr>
    </tbody>
  </table>
</div>
```

### Variantes y opciones
- `.luz-table`: Ancho completo, fila de cabecera sobre la superficie intensa, una línea entre filas y resaltado de la fila bajo el puntero
- `.luz-table-wrap`: Desplaza la tabla horizontalmente cuando es más ancha que su contenedor
- `.luz-table--sticky-col`: Mantiene visible la primera columna mientras la tabla se desplaza horizontalmente
- `.luz-table--compact`: Menos espacio encima y debajo de cada fila (unos 33 px para una línea de texto, no 49 px) y menos espacio entre columnas; el tamaño del texto no cambia
- `.luz-table__numeric` en un `<th>` y su `<td>`: Alinea una columna de números al final de la celda, con cifras del mismo ancho
- `data-luz-sort` en un `<th scope="col">`: La columna se puede ordenar en el navegador: su texto se convierte en un botón
- `data-sort-value` en un `<td>`: El criterio de ordenación de la celda cuando no coincide con su texto: un número con formato (`1,204`), una fecha mostrada como «13 Oct» o un precio con su moneda
- `aria-sort` en el `<th>` ordenado: `ascending` o `descending`, solo en una cabecera: un triángulo indica la dirección
- `data-label` en cada `<td>`: El nombre de la columna que se muestra antes del valor cuando las filas pasan a ser tarjetas

Los números y los datos densos tienen cada uno su propia clase. Aplica la clase numérica a la cabecera y a todas las celdas de la columna.

#### Ordenación en el navegador

Marca cada cabecera ordenable con `data-luz-sort`. El script convierte su texto en un botón; sin él, la tabla sigue funcionando.

Sortable table markup
```html
<table class="luz-table" id="routes">
  <caption>Parcels per route</caption>
  <thead>
    <tr>
      <!-- With a link: it sorts on the server without JavaScript -->
      <th scope="col" data-luz-sort><a href="?sort=route#routes">Route</a></th>
      <!-- Plain text: the script makes it a button -->
      <th scope="col" class="luz-table__numeric" data-luz-sort>Parcels</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Route">Sevilla to Madrid</td>
      <td class="luz-table__numeric" data-label="Parcels" data-sort-value="1204">1,204</td>
    </tr>
  </tbody>
</table>
```

- **La ordenación se basa en el texto de la celda,** salvo que tenga `data-sort-value`. Dos números simples (`12`, `0.5`, `-3`) se ordenan como números; todo lo demás, como texto, según el idioma de la tabla, con `Room 2` antes que `Room 10`.
- **Un número con separador de miles, unidad o moneda necesita `data-sort-value`** con el número sin formato (`1204` para `1,204`); de lo contrario, se ordena como texto y «1,204» queda antes de «999». Las fechas deben ser ISO (`2026-10-13`), sea cual sea el formato mostrado.
- **Los valores iguales conservan su orden.** La primera pulsación ordena de forma ascendente, la siguiente de forma descendente, y así sucesivamente; para recuperar el orden inicial, recarga la página.
- **La cabecera solo indica la columna.** No pongas la dirección en su texto ni en el pie: el triángulo, `aria-sort` y la línea de estado la indican y se actualizan con la ordenación.

### Cómo funciona
Una `<table>` nativa con `<caption>`, `<thead>` y `<th scope>`, con estilos de `components/table.css`. Sin JavaScript.

- El contenedor es un contenedor de consulta: por debajo de 480 px de ancho propio, cada fila se convierte en una tarjeta de parejas de etiqueta y valor, y se reduce el relleno de las celdas. Se adapta al ancho del contenedor, no al de la ventana, así que una tabla estrecha en una página ancha también se apila.
- Las etiquetas proceden de `data-label`; las celdas que no lo tienen muestran solo el valor.
- Las celdas que contienen más de un elemento necesitan un `<div>` que los envuelva para mantener unido el valor.
- `.luz-table__numeric` establece `text-align: end` y `font-variant-numeric: tabular-nums`, para alinear las cifras de una columna sea cual sea el idioma. En el diseño de tarjetas apiladas, el valor ya queda al final de la fila.
- `.luz-table--compact` solo cambia el relleno de las celdas: el tamaño del texto se mantiene, así que la tabla es más densa, pero igual de legible.
- **Ordenación en el servidor**, para resultados paginados o filtrados y para todas las tablas sin JavaScript: cada cabecera es un enlace a la misma página, ordenada por esa columna, y solo el `<th scope="col">` de la columna ordenada lleva `aria-sort="ascending"` o `"descending"`. Indica también la dirección en el texto visible del enlace, por ejemplo, «Importe (€), ascendente»; haz que el texto del enlace empiece con las palabras de la propia cabecera; termina su `href` con el `id` de la tabla (`?sort=amount&dir=desc#invoices`) para que el siguiente Tab llegue a la tabla después de recargar la página; e indica la ordenación en el pie («Facturas, ordenadas por importe, ascendente»).
- **Ordenación en el navegador**, para una tabla que contiene todas sus filas: añade `data-luz-sort` a las cabeceras. `luz.js` carga `table-sort.js` cuando hace falta, solo en páginas con una cabecera así, y el texto de cada cabecera (o el contenido de su enlace) pasa a un `<button type="button">`. Al pulsarlo, ordena todos los `<tbody>` en su sitio, escribe `aria-sort` solo en esa cabecera e indica «Ordenado por Parcelas, ascendente» en un `<output>` que se anuncia con cortesía y no se ve. El foco permanece en el botón. Una tabla ordenada en el navegador no lleva la dirección en el pie ni las cabeceras, porque dejaría de ser correcta tras la primera pulsación.
- El triángulo que aparece tras la cabecera ordenada se dibuja con CSS a partir de `aria-sort` (es una forma, no texto), así que también aparece en las cabeceras ordenadas en el servidor. Hacia arriba indica orden ascendente; hacia abajo, descendente.
- Por debajo de 480 px, una fila de cabecera con un enlace o un botón permanece visible: sus cabeceras se muestran en una fila sobre las tarjetas y se ajustan para que se puedan ver y usar los controles. Una fila de cabecera con texto simple se oculta, como antes, porque cada tarjeta lleva sus etiquetas.
- Las tarjetas cambian la propiedad `display` de los elementos de la tabla, lo que puede ocultarla a algunos lectores de pantalla. La hoja de estilos recomienda `role="table"`, `"row"` y `"cell"` en las tablas que se apilan.

### Sin JavaScript
No cambia nada: el desplazamiento, la columna fija y las tarjetas son todo CSS. Una cabecera con enlace se ordena en el servidor; una cabecera de texto simple sigue siendo una cabecera.

Las filas nunca se ocultan y, si no se carga el script, la tabla permanece completa.

#### Cargar la ordenación por separado

El módulo no importa nada ni tiene efecto hasta que lo llamas. Pásale la función `t` de las cadenas de core para escribir la línea de estado en el idioma de la tabla; sin ella, la tabla se sigue ordenando, pero la línea de estado queda vacía.

Table sort code
```js
import { initTableSort } from "@luz-ds/core/table-sort";
import { t } from "@luz-ds/core/i18n";

initTableSort(document, t);
```

### Teclado y ARIA
El contenedor recibe el foco (`tabindex="0"`) para que se pueda desplazar con las teclas de flecha.

- Asigna al contenedor `role="region"` y un `aria-label` para que ese punto de parada del foco tenga un nombre.
- Usa `scope="col"` en las cabeceras de columna y `scope="row"` en la celda de cabecera que identifica su fila.
- Una cabecera ordenable es un botón: Tab llega a ella, Enter o Espacio ordena y el foco permanece en ella mientras se mueven las filas. Los enlaces que sustituye el script conservan el foco que tenían.
- `aria-sort` se aplica al único `<th scope="col">` ordenado. Cada ordenación se anuncia mediante la línea de estado (`<output>`, role `status`), en el idioma de la tabla; las cadenas son `sortedAsc` y `sortedDesc` de las cadenas de core (consulta los [módulos de JavaScript](https://nandovejer.github.io/luz/es/docs/get-started/javascript/); `data-luz-label-sorted-asc` y `data-luz-label-sorted-desc` las sobrescriben).
- El nombre de la columna es solo el texto de la cabecera: no añadas un carácter de flecha ni «ascendente» al marcado.

### Cuándo usarlo
Usa una tabla para comparar registros con los mismos atributos: servicios y su estado, facturas e importes.

### Cuándo no usarlo
No uses una tabla para maquetar.

- Para un atributo por elemento, usa una lista.
- Para unos pocos elementos con la misma importancia, usa [tarjetas](https://nandovejer.github.io/luz/es/docs/components/card/).
- Para una cuadrícula de datos (filtros, selección de filas, edición de celdas o miles de filas), usa una biblioteca diseñada para eso. La tabla de LUZ muestra y ordena filas; no las gestiona. En resultados paginados, ordena en el servidor.
- Para mostrar una tendencia temporal, usa una biblioteca de gráficos y conserva la tabla como alternativa textual. Una barra por fila es un [medidor](https://nandovejer.github.io/luz/es/docs/components/meter/) en la celda de su cifra.
