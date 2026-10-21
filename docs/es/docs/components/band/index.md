# Franja

Aplica un tono a un bloque de la página de lado a lado, mientras su contenido conserva el ancho de columna.

### Problemas conocidos
La franja tiene tres problemas, todos relacionados con la forma en que se dibuja el tono.

- **Se recorta la información sobre herramientas que sobresale por arriba.** La franja recorta cualquier elemento que sobresalga por arriba o por abajo. Una información sobre herramientas CSS de un control situado al principio de la franja se recorta con texto al 200 % o más. Empieza la franja con un encabezado y no pongas información sobre herramientas en el primer control. Los menús desplegables y otros popovers no se recortan.
- **Botones de contorno y fantasma.** Su color al pasar el puntero es el mismo tono de la franja, así que no se aprecia ningún cambio. La etiqueta y el contorno siguen identificándolos. Usa un botón principal y uno de contorno para ofrecer una alternativa.
- **Colores forzados.** Se elimina el tono, de modo que la franja queda compuesta por el encabezado, el texto y los botones entre dos líneas finas del color de texto del sistema.

### Copiar el marcado
Band markup
```html
<main id="main-content" class="o-container o-stack">
  <!-- other sections -->
  <section class="o-stack luz-band" aria-labelledby="last-seats-title">
    <h2 id="last-seats-title">Registration closes on 30 April</h2>
    <p>The hall holds 400 people, and the Two days ticket sold out last year.</p>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="/register/">Register now</a>
    </div>
  </section>
</main>
```

### Variantes y opciones
No hay variantes: una clase que puedes aplicar a cualquier bloque. El diseño interior depende de ti: `.o-stack` distribuye el espacio entre sus elementos.

- `.luz-band`: El bloque usa el tono `--luz-brand-subtle` de lado a lado de la página, con 48 px (`--luz-space-2xl`) por encima y por debajo del contenido. El contenido conserva el ancho de columna de la página

### Cómo funciona
CSS de `@luz-ds/core`. No necesita JavaScript.

- La franja se mantiene dentro de la columna de la página, por lo que el texto conserva el borde inicial de la columna. El tono se dibuja con un `box-shadow` que se extiende más allá del bloque y se recorta por arriba y por abajo con `clip-path`. La sombra no añade ancho desplazable; `100vw` sí lo haría cuando la página tiene una barra de desplazamiento. En un `.o-shell`, el tono termina en `.o-main`.
- Cualquier bloque puede ser una franja: un `<section>` con su encabezado o un `<div>` normal.
- Colócala en la propia página, dentro de la columna principal. Dentro de una tarjeta o un elemento con fondo propio, el tono se dibuja sobre esa superficie y se sale del elemento si este es más ancho que la ventana.

### Sin JavaScript
No cambia nada: la franja está hecha con CSS.

### Teclado y ARIA
La franja no es interactiva ni añade ningún role.

- Un `<section>` identificado con `aria-labelledby` se convierte en un punto de referencia de tipo región; una franja `<div>` es solo un bloque.
- El tono no transmite significado ni es lo que agrupa la franja: lo hacen la sección y su encabezado. La agrupación se conserva sin el tono (en colores forzados o al imprimir).
- Los controles de la franja conservan su propio anillo de foco. Los 48 px de espacio por arriba y por abajo dejan sitio para él con texto al 200 % y a 320 px de ancho.

### Cuándo usarlo
Usa una franja para una llamada a la acción cerca del final de una página larga o para marcar una pausa en medio de ella.

### Cuándo no usarlo
No pongas una franja en cada sección: si todo destaca, nada destaca.

- Como máximo, una franja por cada altura de pantalla; dos seguidas se perciben como un nuevo fondo, no como una llamada a la acción.
- No uses el tono para comunicar algo (un aviso o un estado): no transmite significado y los colores forzados lo eliminan. Usa una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/).
- No pongas una franja dentro de una tarjeta, sobre un área `--luz-surface` ni alrededor de toda la página. En modo oscuro, el botón principal sobre un tono colocado encima de `--luz-surface` baja a 2,7:1, por debajo del 3:1 que necesita el borde de un control.
- No pongas un `.luz-btn--secondary` en la franja: su relleno tiene el mismo color que el tono y parece texto normal.
