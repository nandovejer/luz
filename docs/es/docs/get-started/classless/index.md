# Estilos sin clases

El aspecto de un botón, un campo de texto, un selector y una tabla, y el espacio entre párrafos, encabezados y listas, en el elemento sin clases y dentro de un elemento que marques, para el marcado al que no puedes añadir clases.

### Qué es

Un archivo adicional, `classless.css`, que da a un `button`, `input`, `textarea`, `select` y `table` sin clases el aspecto del componente LUZ y añade espacio entre los bloques de texto largo, dentro de un elemento con `data-luz-classless`. Está pensado para marcado que no controlas: un archivo Markdown, un CMS o un formulario de una biblioteca.

No está en `luz.css` y no hace nada hasta que lo cargas y marcas una zona. Una página que no lo carga se queda exactamente como estaba.

### Cómo cargarlo

Desde una CDN, con un `<link>` para cada archivo, en este orden:

Loading classless.css from a CDN
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/classless.min.css">
```

Con un empaquetador, importa los puntos de entrada CSS de los paquetes. Un `href` no puede indicar un paquete: estas rutas solo sirven para `import`.

Importing classless.css
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/core/classless.css";
```

Después, marca la zona:

Marking the zone
```html
<!-- the whole page -->
<body data-luz-classless>

<!-- or only the rendered content -->
<article data-luz-classless>…</article>
```

- Declara el orden de capas, como hacen todos los archivos, y escribe en `luz.elements`. Una clase `.luz-*` está en `luz.components` y prevalece por orden.
- Pon el atributo en `<body>` o en un elemento dentro de él. Los elementos que estiliza son sus *descendientes*.
- Tamaño: unos 1,7 kB min+gzip, con un presupuesto propio (3 kB).

### En qué se convierte cada elemento

Elemento sin clases y el componente que reproduce

- `button`, `input` de tipo `button` y `reset`: `.luz-btn .luz-btn--secondary`: Tamaños y otras variantes: añade la clase
- `button type="submit"`, `input type="submit"`: `.luz-btn .luz-btn--primary`: Para el navegador, un botón sin `type` envía el formulario, pero aquí no: indica `type="submit"`
- `input` de tipo text, email, password, search, tel, url, number, date, time, datetime-local, month y week; `textarea`: `.luz-input`, `.luz-input--textarea`: La etiqueta, el texto de ayuda y el error de `.luz-field`
- `select`: El cuadro cerrado de `.luz-select`: La lista abierta con estilos, donde el navegador admite `appearance: base-select`: es decir, `.luz-select`
- `table`, con su título, `th` y `td`: `.luz-table`: Desplazamiento y apilado: necesitan un contenedor y `data-label`

No se les aplica estilo a propósito: los controles `checkbox`, `radio`, `range`, `color`, `file` y `hidden` tienen su propio control nativo, y la `table` nunca recibe `display: block` ni una caja de desplazamiento, porque algunos lectores de pantalla perderían su semántica de tabla.

### Espacio entre bloques

El restablecimiento de LUZ elimina todos los márgenes, así que un artículo Markdown quedaría apelmazado. Dentro de la zona, cada párrafo, lista, cita, figura, bloque preformateado, tabla, regla, `details`, `fieldset`, `form` o dirección empieza un paso (`--luz-space-md`) por debajo del bloque anterior.

Un encabezado empieza más abajo (`--luz-space-xl`) y el bloque que viene después queda más cerca (`--luz-space-sm`), así cada encabezado queda unido a lo que presenta.

- El primer elemento hijo de su contenedor no tiene margen superior, así que la zona no se separa de su contenedor.
- No se modifican `div`, `span` ni los elementos en línea: su disposición es cosa tuya. Para crear una columna de bloques, usa [`.o-stack`](https://nandovejer.github.io/luz/es/docs/components/layout/).
- Un botón que va después de un campo mantiene el mismo espacio para no tocarlo. Los botones uno al lado del otro permanecen juntos.
- Es un margen con especificidad cero: prevalece cualquier clase tuya, y un componente LUZ que defina su propio margen lo conserva.
- Para un artículo, [`.luz-prose`](https://nandovejer.github.io/luz/es/docs/components/prose/) de core aplica los mismos tres espacios entre los bloques de un contenedor y añade la longitud de línea y la sangría de las listas. Funcionan juntos: pon ambos en el elemento que contiene el texto y el modo sin clases añade el aspecto de sus tablas y controles.

### Cómo no interfiere

- **Especificidad cero.** Todos los selectores están dentro de `:where()`, así que prevalece cualquier clase tuya, en cualquier capa.
- **Respeta las clases de LUZ.** Un elemento cuya clase contiene `luz-` pertenece a su componente: un `.luz-copy-btn` dentro de la zona conserva su aspecto.
- **Una copia fiel.** Las declaraciones del botón, el campo, el selector y la tabla son las de los componentes. Una prueba compara cada elemento sin clases con su componente, propiedad por propiedad, y falla si algo cambia. El espacio entre bloques no es una copia: ningún componente lo define.
- **Todo lo demás funciona igual:** los tres modos de color, el anillo de foco, el texto de derecha a izquierda y los colores forzados funcionan como en el componente.

### Límites

- **El modo de color debe estar en otro elemento.** El selector de fecha y el desplegable toman la combinación de colores de un `data-theme` en un antecesor de la zona, igual que los componentes: pon `data-theme` en `<html>`, no en la zona.
- **Comprobado por scripts, no a mano.** La prueba de equivalencia pasa en Chromium, Firefox 155 y WebKit 26.6, en Linux. Safari no admite colores forzados, así que ese caso solo se comprueba en Chromium y Firefox.
- **No es un componente.** No tiene página en la galería de componentes ni estados propios. Si puedes añadir una clase, usa el componente: tiene variantes, tamaños y documentación.
