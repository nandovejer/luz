# Avatar

Identifica a una persona o un equipo con sus iniciales o una foto, en tres tamaños.

### Problemas conocidos
Si no se carga una foto, el navegador muestra su texto `alt` dentro del cuadro, en mayúsculas como las iniciales del avatar; un nombre largo puede desbordarlo. El nombre sigue disponible para el lector de pantalla.

### Copiar el marcado
Avatar markup
```html
<span class="luz-avatar luz-avatar--md" role="img" aria-label="Carlos Díaz">CD</span>
```

Junto al nombre de la persona, el avatar lo repite: ocúltalo en su lugar.

Avatar next to a name markup
```html
<span class="luz-avatar luz-avatar--sm" aria-hidden="true">CD</span> Carlos Díaz
```

Con una foto: la imagen ocupa el cuadro y se recorta en forma de cuadrado.

Avatar with a photo markup
```html
<span class="luz-avatar luz-avatar--md"><img src="/img/ana.jpg" width="36" height="36" alt="Ana Belén"></span>

<span class="luz-avatar luz-avatar--lg"><img src="/img/ana.jpg" width="48" height="48" alt=""></span> Ana Belén
```

### Variantes y opciones
Elige un modificador de tamaño.

Sin un modificador, el avatar no tiene un tamaño propio. El contenido son las iniciales o un elemento `<img>`.

- `.luz-avatar--sm`: 24 × 24 px, texto extrapequeño
- `.luz-avatar--md`: 36 × 36 px, texto pequeño
- `.luz-avatar--lg`: 48 × 48 px, texto base
- Con un elemento `<img>` dentro: Una foto: ocupa el cuadro, se recorta en forma de cuadrado y adopta las esquinas del avatar

### Cómo funciona
Un cuadro en línea que centra el texto, al que da estilo `components/avatar.css`. No necesita JavaScript.

- Las iniciales se muestran en mayúsculas con la fuente mono (`text-transform: uppercase`).
- Los colores son el tono suave de marca y el color de texto de marca en todos los modos.
- Una foto es un elemento `<img>` que ocupa el `100%` del cuadro, con `object-fit: cover` y las esquinas del avatar (`border-radius: inherit`). El cuadro no recorta el contenido (no usa `overflow: hidden`), por lo que las iniciales que superan un cuadro pequeño con texto al 200 % siguen siendo legibles.

### Sin JavaScript
No cambia nada: el avatar solo usa HTML y CSS.

### Teclado y ARIA
Un avatar no es interactivo ni recibe el foco.

- Las iniciales por sí solas son una imagen: usa `role="img"` y un `aria-label` con el nombre completo para que el lector de pantalla no deletree las iniciales.
- Una foto por sí sola se identifica mediante su `alt`, con el nombre de la persona: no necesita role ni `aria-label`. Si la foto es lo único que hay dentro de un enlace o botón, el `alt` identifica el control e indica también la acción: `alt="Ana Belén, your account"`.
- Junto al nombre, el avatar es decorativo: añade `aria-hidden="true"` a las iniciales y `alt=""` a la foto.
- Dentro de un enlace o botón con texto, el texto identifica el control; oculta el avatar.

### Cuándo usarlo
Usa un avatar para identificar a una persona o una cuenta cuando hay poco espacio, por ejemplo, en una lista de miembros o junto a quien escribe un comentario.

### Cuándo no usarlo
No uses un avatar como única forma de distinguir a las personas.

- Dos personas pueden tener las mismas iniciales: muestra el nombre en texto junto al avatar.
- Para indicar un estado o una categoría, usa una [etiqueta](https://nandovejer.github.io/luz/es/docs/components/tag/).
- Para mostrar el retrato de un ponente o un producto a mayor tamaño, usa una tarjeta con el marco de imagen: consulta [Ponentes](https://nandovejer.github.io/luz/es/docs/landing/templates/#speakers) en las plantillas de la página de inicio. Un avatar mide de 24 a 48 px.
