# Alerta

Informa al lector sobre la página o una tarea: comunica información, un éxito, un aviso o un error.

### Problemas conocidos
Ninguno conocido.

### Copiar el marcado
Warning alert markup
```html
<div class="luz-alert luz-alert--warning">
  <div class="luz-alert__icon" aria-hidden="true">!</div>
  <div>
    <div class="luz-alert__title">Warning</div>
    <div class="luz-alert__body">Storage is almost full. Delete old builds to free space.</div>
  </div>
</div>
```

### Variantes y opciones
Una clase modificadora define el estado. Indica también el estado en el título: el color es solo una pista adicional.

- `.luz-alert--info`: Información útil
- `.luz-alert--success`: Una tarea que ha terminado correctamente
- `.luz-alert--warning`: Algo que puede salir mal pronto
- `.luz-alert--error`: Algo que ha salido mal y requiere actuar

### Cómo funciona
Un bloque con un icono, un título y un cuerpo, al que da estilo `components/alert.css`. No necesita JavaScript.

- El icono es decorativo (`aria-hidden="true"`): el título ya indica el estado.
- El borde inicial y el título usan el color del estado; el cuerpo mantiene el color de texto secundario.

### Sin JavaScript
No cambia nada: la alerta es HTML y CSS estáticos.

### Teclado y ARIA
Una alerta no es interactiva ni recibe el foco.

- Una alerta que ya está en la página cuando se carga no necesita role.
- Una alerta que aparece tras una acción debe anunciarse: insértala en un contenedor que ya esté en la página con `role="status"`, o con `role="alert"` si es un error que requiere atención inmediata.

### Cuándo usarlo
Usa una alerta para comunicar al lector un estado importante de esta página.

- Información que necesita antes de actuar: «Este proyecto está archivado».
- El resultado de una tarea: éxito, aviso o error.

### Cuándo no usarlo
No uses una alerta para un mensaje que deba detener al lector ni para uno que pueda pasar por alto sin consecuencias.

- Para una decisión que el lector debe tomar antes de continuar, usa un [diálogo modal](https://nandovejer.github.io/luz/es/docs/components/modal/).
- Para una confirmación breve que no requiere actuar, usa un [aviso emergente](https://nandovejer.github.io/luz/es/docs/components/toast/).
- Para un error en un campo, ponlo junto al campo ([campos de formulario](https://nandovejer.github.io/luz/es/docs/components/form/)).
- Si hay más de dos alertas a la vez, combínalas; de lo contrario, el lector dejará de leerlas.
