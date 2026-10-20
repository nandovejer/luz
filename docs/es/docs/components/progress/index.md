# Progreso

Muestra cuánto ha avanzado una tarea que lleva tiempo, mediante el elemento progress nativo.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Progress bar with a visible label markup
```html
<label for="upload">Uploading report.pdf</label>
<progress class="luz-progress" id="upload" value="25" max="100">25%</progress>
```

### Variantes y opciones
Una clase. El estado se establece con atributos nativos.

- `value` y `max`: Cuánto se ha completado; `max` vale 1 si no lo indicas
- no hay `value`: Indeterminado: la tarea está en curso, pero se desconoce cuánto durará

### Cómo funciona
El elemento nativo `<progress>`, con estilos de `components/progress.css`: una barra de 8 px, del ancho completo, con el color de marca como relleno y un borde de 1 px del color del borde del campo, para que se vea toda su longitud en cualquier superficie.

- El navegador expone el rol y el valor a las tecnologías de asistencia.
- En los navegadores Chromium y WebKit, el relleno se desliza hasta el nuevo valor; con el movimiento reducido, salta directamente.
- Con colores forzados, la barra conserva un borde y muestra el relleno con el color de resaltado del sistema.

### Sin JavaScript
La barra muestra el valor del marcado. Para cambiarlo necesitas tu propio script, que establece `value`.

### Teclado y ARIA
Una barra de progreso no es interactiva y no recibe el foco.

- Asígnale un nombre con un elemento `<label>` o con `aria-label` cuando no se muestre ninguna etiqueta.
- Los lectores de pantalla no anuncian cada cambio. Anuncia el inicio y el final en una región dinámica cortés (`role="status"`).

### Cuándo usarlo
Usa una barra de progreso para tareas que duren más de unos segundos, como una carga o una compilación.

### Cuándo no usarlo
No uses una barra de progreso para un valor que no represente una tarea.

- Para una medida dentro de un intervalo conocido, como el espacio de almacenamiento usado, usa un [medidor](https://nandovejer.github.io/luz/es/docs/components/meter/).
- No la uses como decoración.
