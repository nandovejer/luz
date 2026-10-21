# Acordeón

Muestra y oculta secciones de contenido con los elementos nativos details y summary, de una en una si asignas un nombre al grupo.

### Problemas conocidos
Hay dos cosas que debes saber antes de confiar en un grupo con nombre.

**Grupo exclusivo.** El atributo `name` funciona en Chrome y Edge 120, Safari 17.2 y Firefox 130, todos desde septiembre de 2024 o anteriores, por lo que aún no tiene disponibilidad amplia en Baseline. En un navegador más antiguo, cada panel se abre por separado: no se pierde nada.

**Lectores de pantalla.** LUZ no ha probado cómo anuncian NVDA, JAWS, VoiceOver, TalkBack y Orca un grupo exclusivo, ni ha comprobado datos de compatibilidad. La agrupación de un conjunto exclusivo no se comunica a la tecnología de asistencia: su correspondencia de accesibilidad en HTML sigue siendo una cuestión abierta (consulta la [explicación de Open UI](https://open-ui.org/components/accordion.explainer)).

### Copiar el marcado
Accordion markup
```html
<div class="luz-accordion">
  <details name="faq" open>
    <summary>What is a design token?</summary>
    <p>A named value that components read.</p>
  </details>
  <details name="faq">
    <summary>Does it need JavaScript?</summary>
    <p>No.</p>
  </details>
</div>
```

### Variantes y opciones
Un único `<details>` no necesita clase: la capa de elementos le da estilo. La clase solo sirve para unir varios en una pila.

- `.luz-accordion`: Une los elementos `<details>` que contiene en un solo bloque: un borde entre ellos y esquinas redondeadas solo en el bloque
- `name="…"`: Agrupa los elementos details con el mismo nombre: solo puede haber uno abierto a la vez. No tienen que estar juntos
- `open`: Hace que un panel empiece abierto. En un grupo con nombre, solo permanece abierto el primer elemento con `open` en el código fuente

### Cómo funciona
Elementos nativos `<details>` y `<summary>`, con estilos de `elements/interactive.css` y sin clases. `components/accordion.css` solo añade el bloque unido.

No necesita JavaScript.

- summary es la etiqueta del panel; el resto de details es su contenido.
- El contenido cerrado no se muestra ni forma parte del orden de lectura hasta que se abre el panel.

### Sin JavaScript
No cambia nada: el navegador se encarga de abrir, cerrar y agrupar. El acordeón funciona por completo sin scripts.

### Teclado y ARIA
Con Tab se llega a cada summary en orden. Enter o Espacio lo abre o lo cierra.

No hay atajos con las teclas de flecha para moverse entre paneles.

- No añadas ningún role: `<details>` ya tiene su propia semántica y no admite roles ARIA.
- No pongas enlaces ni botones dentro de summary: ese elemento ya es el control.

### Cuándo usarlo
Usa un acordeón para agrupar bajo títulos breves contenido que la mayoría de lectores puede omitir.

- Preguntas frecuentes y listas de referencia largas.
- Detalles opcionales bajo una respuesta breve.

### Cuándo no usarlo
No ocultes información que necesitan todos los lectores ni lo uses para desplazarte por el sitio.

- Para las secciones principales de un sitio, usa una [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/). Para contenido entre el que se puede alternar, usa [pestañas](https://nandovejer.github.io/luz/es/docs/components/tabs/).
- No pongas un error, un aviso ni un paso obligatorio dentro de un panel cerrado.
- Si solo hay una o dos respuestas breves, muéstralas como texto normal.
