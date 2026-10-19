# Enlace para saltar al contenido

Permite a quienes usan el teclado saltarse la cabecera e ir al contenido principal.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Skip link markup
```html
<body>
  <a class="luz-skip-link" href="#main-content">Skip to main content</a>
  <header class="o-sticky">…</header>
  <main id="main-content" tabindex="-1">…</main>
</body>
```

### Variantes y opciones
No hay variantes: una clase en un enlace.

- `.luz-skip-link`: Fuera de pantalla hasta que recibe el foco; entonces queda fijo en la esquina superior inicial, con el fondo de marca, por encima de todo, incluso de una barra adhesiva. No se imprime.

### Cómo funciona
Un enlace normal al `id` de `<main>`, al principio de `<body>` y antes de un aviso de cookies, otro aviso o la cabecera. Solo CSS.

- Se desliza a la vista al recibir el foco, durante `--luz-duration-fast`; con movimiento reducido, aparece de inmediato.
- El navegador hace el salto. `tabindex="-1"` en `<main>` permite que reciba el foco, así que la siguiente pulsación de Tab empieza dentro en todos los navegadores.
- Debajo de una barra adhesiva ([.o-sticky](https://nandovejer.github.io/luz/es/docs/components/layout/#objects-page)), el relleno de desplazamiento de la página mantiene el principio de `<main>` por debajo de la barra tras el salto.

### Sin JavaScript
No cambia nada: el enlace para saltar al contenido es un enlace y CSS.

### Teclado y ARIA
Pulsa Tab una vez desde el principio de la página para mostrar el enlace; Enter lo sigue hasta el contenido principal.

- Debe ser el primer elemento enfocable de la página, antes de un aviso de cookies o de otro aviso.
- Sin ARIA: su texto es su nombre.

### Cuándo usarlo
Añade un enlace para saltar al contenido en cada página que tenga una cabecera, un banner o navegación antes del contenido principal.

### Cuándo no usarlo
No te fíes solo de él: la página sigue necesitando puntos de referencia y un orden lógico de encabezados.

- No añadas una lista de enlaces para saltar a cada sección: basta con uno que lleve al contenido principal.
