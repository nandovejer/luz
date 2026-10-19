# Dato destacado

Muestra una cifra en grande, con una etiqueta breve debajo.

### Problemas conocidos
No se conocen problemas.

### Copiar el marcado
Stat markup
```html
<ul class="o-grid o-grid--3">
  <li>
    <div class="luz-landing-stat">
      <p class="luz-landing-stat__value">4,000+</p>
      <p class="luz-landing-stat__label">teams on the platform</p>
    </div>
  </li>
  <!-- one li for each stat; a card is a li.luz-card -->
</ul>
```

### Variantes y opciones
Sin modificadores: dos partes, independientes o dentro de una tarjeta.

- `.luz-landing-stat`: El bloque: el valor sobre la etiqueta, separados por un espacio pequeño (`--luz-space-2xs`), sin relleno ni superficie.
- `.luz-landing-stat__value`: La cifra: tipografía de encabezado, tamaño 3xl y trazo fino, con cifras del mismo ancho; se ajusta en columnas estrechas.
- `.luz-landing-stat__label`: Lo que cuenta la cifra: tamaño sm y color de texto secundario.

### Cómo funciona
CSS de `@luz-ds/landing`. No usa JavaScript y `@luz-ds/site` es opcional.

- El dato destacado no organiza otros elementos: coloca varios en una lista con cuadrícula de core, `ul.o-grid.o-grid--3`. En una [tarjeta](https://nandovejer.github.io/luz/es/docs/components/card/) usa el relleno y la superficie de esta.

### Sin JavaScript
No cambia nada: el dato destacado es HTML y CSS, y la cifra no cuenta hacia arriba.

### Teclado y ARIA
El dato destacado no tiene una interacción ni un rol propios.

- El valor va antes que la etiqueta en el código fuente, así se lee en ese orden. Pon los datos en un `<ul>` debajo del encabezado de la sección.

### Cuándo usarlo
Usa un dato destacado para respaldar una afirmación con una cifra: cuántas personas usan el producto o lo rápido que es. Entre dos y cuatro cifras juntas se leen de un vistazo.

### Cuándo no usarlo
No uses un dato destacado para una cifra que necesite una frase para entenderse.

- Para comparar filas y columnas, usa una [tabla](https://nandovejer.github.io/luz/es/docs/components/table/).
