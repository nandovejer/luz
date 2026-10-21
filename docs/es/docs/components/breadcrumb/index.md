# Migas de pan

Muestra dónde se encuentra la página en el sitio mediante una ruta de enlaces a sus páginas superiores.

### Problemas conocidos
Ninguno conocido.

### Copiar el marcado
Breadcrumb markup
```html
<nav aria-label="Breadcrumb">
  <ol class="luz-breadcrumb">
    <li><a class="luz-breadcrumb__item" href="/">Home</a></li>
    <li><a class="luz-breadcrumb__item" href="/settings/">Settings</a></li>
    <li><span class="luz-breadcrumb__item" aria-current="page">Billing</span></li>
  </ol>
</nav>
```

### Variantes y opciones
No hay modificadores. CSS dibuja el separador entre dos elementos: no tienes que añadir nada para mostrarlo.

- `.luz-breadcrumb`: La lista ordenada: una fila de elementos que ocupa más líneas si el espacio es estrecho. Cada `<li>` después del primero empieza con una barra
- `.luz-breadcrumb__item`: Un enlace a una página superior o la página actual como texto
- `aria-current="page"`: Indica la página actual con el color de texto principal y un grosor medio

### Cómo funciona
El [patrón de migas de pan de APG](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): un punto de referencia `<nav>` que contiene una lista ordenada de enlaces, con estilos de `components/breadcrumb.css`. No necesita JavaScript.

- La lista es ordenada porque el orden transmite significado: los lectores de pantalla anuncian que es una lista y cuántos elementos tiene.
- La página actual es el último elemento, un `<span>` con `aria-current="page"`, no un enlace a sí misma.
- El separador es un borde dibujado con `::before` y contenido vacío, así que la tecnología de asistencia no tiene nada que leer.

### Sin JavaScript
No cambia nada: las migas de pan son una lista de enlaces y CSS. Sin CSS, se leen como una lista numerada.

### Teclado y ARIA
Con Tab se llega a cada enlace superior en orden; Enter lo abre. La página actual no forma parte del orden de tabulación.

- Identifica `<nav>` como «Migas de pan» con `aria-label`, para distinguirlo de la navegación principal.
- `aria-current="page"` indica a los lectores de pantalla qué elemento corresponde a la página actual.

### Cuándo usarlo
Usa migas de pan cuando las páginas estén a tres o más niveles de profundidad, para que el lector sepa dónde está y pueda subir un nivel.

### Cuándo no usarlo
No uses migas de pan en un sitio poco profundo ni como única navegación.

- Para las secciones principales del sitio, usa una [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/) o una navegación en la cabecera.
- Para indicar los pasos de un proceso, muestra el número del paso en el encabezado de la página.
