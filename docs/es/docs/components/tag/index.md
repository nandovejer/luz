# Etiqueta e insignia

Etiqueta un elemento con un estado o categoría breves (etiqueta), o muestra una cantidad (insignia).

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Status tag markup
```html
<span class="luz-tag luz-tag--green luz-tag--dot">Running</span>
```

Count badge markup
```html
<a href="/inbox/">Inbox <span class="luz-badge luz-badge--primary">3</span><span class="u-sr-only"> unread</span></a>
```

### Variantes y opciones
Una etiqueta usa un color y, si quieres, un punto. Una insignia usa un color.

- `.luz-tag--gray`: Neutro: categoría sin estado
- `.luz-tag--blue`: Colores de información
- `.luz-tag--green`: Colores de éxito
- `.luz-tag--yellow`: Colores de advertencia
- `.luz-tag--red`: Colores de peligro
- `.luz-tag--teal`, `.luz-tag--purple`: Colores adicionales para categorías, sin significado de estado
- `.luz-tag--dot`: Punto pequeño antes del texto, otra señal además del color
- `.luz-badge--primary`: Fondo de marca
- `.luz-badge--gray`: Fondo neutro
- `.luz-badge--danger`: Fondo de peligro

### Cómo funciona
Elementos `<span>` en línea, con estilos de `components/tag.css`. Sin JavaScript.

- Una etiqueta mide al menos 24 px de alto, usa texto extrapequeño y va sobre un tinte de su color.
- Una insignia es una cantidad pequeña y redondeada en tipografía monoespaciada, de al menos 20 px de ancho.

### Sin JavaScript
No cambia nada: las etiquetas y las insignias son HTML y CSS.

### Teclado y ARIA
Las etiquetas y las insignias no son interactivas ni reciben el foco.

- El significado está en el texto; el color no aporta nada que necesite un lector de pantalla.
- Una cantidad necesita contexto: coloca la insignia dentro del enlace o encabezado que cuenta y añade la unidad como texto oculto visualmente si no aparece en pantalla («3 sin leer»).

### Cuándo usarlo
Usa una etiqueta para asignar a un elemento un estado o una categoría breves, y una insignia para mostrar una cantidad junto a un enlace o encabezado.

### Cuándo no usarlo
No uses una etiqueta para una acción: no se puede pulsar.

- Para una acción, usa un [botón](https://nandovejer.github.io/luz/es/docs/components/button/).
- Para un mensaje, usa una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/).
- No des significado de estado al turquesa o al morado: son para categorías.
