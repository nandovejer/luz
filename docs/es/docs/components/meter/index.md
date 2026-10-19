# Medidor

Representa un valor dentro de un intervalo conocido con una barra junto a la cifra, mediante el elemento meter nativo.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Una barra en la celda de su cifra, dentro de una tabla. La cifra es texto, así que la barra es una representación visual y se oculta a las tecnologías de asistencia:

Meter in a table cell markup
```html
<td class="luz-table__numeric" data-label="Parcels">1,204<meter class="luz-meter" value="1204" min="0" max="1500" aria-hidden="true">1,204 of 1,500</meter></td>
```

Una barra independiente, con un nombre visible y la cifra dentro:

Meter with a visible label markup
```html
<label for="storage">Storage used, 6 of 10 GB</label>
<meter class="luz-meter" id="storage" value="6" min="0" max="10">6 of 10 GB</meter>
```

### Variantes y opciones
Una clase. La barra se configura con atributos nativos.

- `value`, `min` y `max`: El valor y su intervalo: `min` es 0 y `max` es 1 si no los indicas. Los valores que quedan fuera del intervalo se ajustan a este
- `aria-hidden="true"`: Para una barra junto a su cifra: se lee la cifra, pero no la representación visual
- `low`, `high`, `optimum`: No los establezcas: solo cambiarían el color que elige el navegador, y todos los estados se muestran con el color de marca

### Cómo funciona
El elemento nativo `<meter>`, con estilos de `components/meter.css`: una barra de 8 px, del ancho completo de su contenedor y de al menos 8rem de largo, con el color de marca como relleno y un borde de 1 px del color del borde del campo, para que se vea toda su longitud en cualquier superficie.

- El navegador dibuja el relleno como el valor `value` entre `min` y `max`.
- Todos los estados usan el mismo color. La cifra y la escala indican qué significa el valor, no un color verde o rojo: los colores de estado conservan sus significados (alertas, etiquetas).
- Usa el mismo `max` en todas las filas de una tabla; de lo contrario, las barras engañan.
- En el modo de colores forzados, la barra conserva el borde y muestra el relleno con el color de resaltado del sistema.
- El texto dentro del elemento es la alternativa para los navegadores que no lo dibujan. Incluye también la cifra.

### Sin JavaScript
La barra muestra el valor del marcado. Para cambiarlo necesitas tu propio script, que establece `value`.

### Teclado y ARIA
Un medidor no es interactivo y no recibe el foco.

- Junto a su cifra, en la misma celda o línea, oculta la barra con `aria-hidden="true"`: la cifra es el texto y la tabla es el gráfico accesible. Quien la consulta oye la cifra una sola vez.
- Coloca la barra en la celda de su cifra, no en una columna propia: una columna de barras se leería como una columna de celdas vacías. Si quieres una columna para la barra, cada celda debe incluir su propio texto visible, como «80 %», bajo un encabezado que explique qué representa.
- Un medidor que no esté oculto necesita un nombre: un `<label for>` o `aria-labelledby`. Entonces se lee como «valor, mínimo, máximo», por lo que repite una cifra que ya aparece: ocúltalo salvo que esté aislado.
- La barra es una representación visual de la cifra en la misma celda: la tecnología de asistencia lee la cifra.

### Cuándo usarlo
Usa un medidor para representar un valor dentro de un intervalo conocido, junto a su cifra y en unas pocas filas o unas cuantas decenas de filas que compartan escala: una parte de un total o un recuento respecto a una cuota.

### Cuándo no usarlo
No uses un medidor para una tarea en curso: usa [la barra de progreso](https://nandovejer.github.io/luz/es/docs/components/progress/).

- Para mostrar una tendencia a lo largo del tiempo, usa una biblioteca de gráficos y conserva la [tabla](https://nandovejer.github.io/luz/es/docs/components/table/) como alternativa textual. LUZ no dibuja gráficos de líneas, áreas ni sectores.
- Si la cifra exacta importa más que la forma, omite la barra: la cifra ya está ahí.
- No uses el color de la barra para indicar si algo va bien o mal: siempre es el color de marca.
