# Estilos de impresión

Qué cambia LUZ al imprimir y cómo conservarlo o modificarlo, con una sola capa y sin archivos adicionales si cargas luz.css.

### Qué cambia al imprimir

Una página impresa con LUZ tiene texto negro sobre fondo blanco, sin las partes que solo funcionan en pantalla. Es un bloque CSS en su propia capa, `luz.print`, que se carga con `luz.css`.

- **Colores.** Las superficies son blancas y el texto negro, sea cual sea el modo de color de la página. Los tokens vuelven a definirse para impresión y todos los componentes se adaptan, sin reglas propias. Los colores de estado y del código pasan a ser negros: cada uno tiene además un icono, un título o un grosor que lo distingue.
- **Ocultos.** La navegación (`nav`), la barra lateral, la fila de pestañas, los botones de copia, el selector del modo de color, el reproductor, los avisos emergentes y los tooltips. Site también oculta el enlace para saltar al contenido y la búsqueda.
- **Enlaces.** La dirección de un enlace externo se imprime entre corchetes después del texto. No ocurre así con un enlace que parece un botón.
- **Saltos.** No hay saltos de página dentro de una figura, un bloque de código, una tabla, una fila de tabla, una cita, una imagen, una tarjeta o una alerta. Los encabezados permanecen junto al texto que viene después.
- **Tablas.** La fila de encabezado se repite en cada página de una tabla que ocupa varias páginas. Una tabla ancha no queda recortada.
- **Código.** Las líneas largas se parten porque el papel no permite desplazarse.
- **Pestañas.** Se imprimen todos los paneles, uno tras otro, no solo el que está abierto.
- **Movimiento.** Sin transiciones, animaciones ni sombras.

### Cómo cargarlo

- `luz.css` ya lo incluye. No tienes que añadir ni quitar nada: el bloque está dentro del archivo.
- Si cargas `base.css` y cada componente por separado, no se incluyen los estilos de impresión. Añade `@luz-ds/core/print.css` (`dist/print.css`) si los quieres. Declara el orden de capas, como hacen todos los archivos.
- Las páginas de Site también incluyen sus propias reglas de impresión, en `luz.site`.
- En pantalla no cambia nada: todo el bloque está dentro de `@media print`.

### Conservar o cambiar algo

Tu CSS prevalece sobre `luz.print`, igual que sobre el resto de LUZ: una regla en tu capa `app` o sin capa. Ponla dentro de `@media print`.

Changing the print styles
```css
@layer reset, luz, app;

@layer app {
  @media print {
    /* Print the breadcrumb of this site */
    .site-breadcrumb {
      display: block;
    }

    /* Keep the page margins your own */
    @page {
      margin: 2cm;
    }
  }
}
```

- LUZ no define el margen `@page` ni el tamaño del papel: eso lo decides tú.
- Con `luz.css` no hay ningún interruptor para desactivarlos: deshaz las reglas que no quieras en tu propia capa, como se indica arriba. Para no usar ninguna, carga `base.css` y los componentes por separado, y no cargues `print.css`.

### Qué no se ha comprobado

- **Simulado, no impreso.** La prueba muestra una página de documentación con el medio de impresión y lee los estilos en Chromium, Firefox y WebKit. Nadie ha revisado una hoja impresa ni un PDF generado por un navegador.
- **La dirección de un enlace se dibuja con CSS.** Aparece en papel y en el texto de un PDF, pero no en la página, así que un lector de pantalla no la lee.
- **Fondos.** Los navegadores omiten los colores e imágenes de fondo al imprimir, salvo que quien lee active «gráficos de fondo». LUZ usa texto, bordes y grosor, no fondos rellenos, para distinguir los elementos.
- **Tablas largas y saltos.** Una tabla más alta que la página se parte de todos modos: el navegador ignora «no separar» si no puede mantenerla entera. Safari no respeta `break-after: avoid`, así que un encabezado puede quedar solo al pie de página.
