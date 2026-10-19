# Aviso emergente

Confirma un resultado pequeño, como «Borrador guardado», sin interrumpir la lectura.

### Problemas conocidos
LUZ solo proporciona el aspecto visual. Tú debes crear la región dinámica, la ubicación, el tiempo que se muestra y el comportamiento del botón de cierre, además de garantizar su accesibilidad.

### Copiar el marcado
Mantén una región dinámica vacía en la página e introduce en ella el aviso cuando se produzca el resultado.

Toast in its live region markup
```html
<div role="status">
  <div class="luz-toast">
    <div class="luz-toast__content">
      <div class="luz-toast__kind">Saved</div>
      <div class="luz-toast__msg">Draft saved.</div>
    </div>
    <button class="luz-toast__close" type="button" aria-label="Dismiss notification">×</button>
  </div>
</div>
```

### Variantes y opciones
No hay modificadores.

- `.luz-toast`: Una caja elevada sobre la superficie intensa, de hasta 320 px de ancho y nunca más ancha que su contenedor
- `.luz-toast__kind`: Una etiqueta pequeña en fuente mono encima del mensaje
- `.luz-toast__msg`: El mensaje
- `.luz-toast__close`: El botón ×, de al menos 28 px

### Cómo funciona
Un bloque con estilo de `components/toast.css`. LUZ no incluye ningún script para avisos emergentes.

- Colócalo con tu propio CSS, por ejemplo, fijado en la parte inferior de la pantalla, por encima de la página con `--luz-z-toast`.
- Si se oculta automáticamente, déjalo en pantalla al menos 5 segundos y mantenlo mientras tenga el foco o el puntero esté encima.
- Tu script debe eliminar el aviso al pulsar el botón de cierre.

### Sin JavaScript
Un aviso emergente solo aparece como respuesta a algo que ha hecho tu script, así que no existe sin JavaScript. Muestra el mismo resultado en la página, por ejemplo, en una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/) después de enviar un formulario.

### Teclado y ARIA
Mostrar un aviso emergente no desplaza el foco.

- Insértalo en una región dinámica educada (`role="status"`) que ya esté en la página, para que lo anuncien los lectores de pantalla.
- Se puede llegar al botón de cierre con Tab y su nombre es «Descartar notificación».

### Cuándo usarlo
Usa un aviso emergente para confirmar un resultado pequeño que no requiera respuesta: «Borrador guardado», «Enlace copiado».

### Cuándo no usarlo
No uses un aviso emergente para nada que la persona deba atender o no deba perderse: desaparece.

- Para un error, usa una [alerta](https://nandovejer.github.io/luz/es/docs/components/alert/) junto a lo que ha fallado.
- Para tomar una decisión, usa un [diálogo modal](https://nandovejer.github.io/luz/es/docs/components/modal/).
- No incluyas enlaces ni botones, salvo el botón de cierre.
