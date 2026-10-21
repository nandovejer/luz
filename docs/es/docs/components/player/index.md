# Reproductor multimedia

Reproduce un vídeo, un sonido o un archivo MIDI en la página, con los mismos controles para los tres.

### Problemas conocidos
Los subtítulos, las transcripciones y la audiodescripción dependen del contenido multimedia que proporciones. Los colores de los subtítulos son una sugerencia: prevalecen los ajustes propios de quien lee, y puede que el navegador los dibuje a su manera, por ejemplo en su propio reproductor a pantalla completa.

Un archivo MIDI no tiene reproductor sin JavaScript: ofrece un enlace de descarga en el texto alternativo.

### Copiar el marcado
Un reproductor de audio. El de vídeo añade un `.luz-player-media-wrap` alrededor de `<video>`, además de un botón de silencio y un control deslizante de volumen: cópialo del ejemplo anterior.

Audio player markup
```html
<div class="luz-player" data-type="audio" role="group" aria-label="Episode 12 player">
  <audio class="luz-player-audio" preload="none" controls>
    <source src="episode-12.mp3" type="audio/mpeg">
  </audio>
  <div class="luz-player-controls luz-player-controls--audio">
    <button class="luz-player-btn luz-player-playpause" type="button" aria-label="Play">
      <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6,3 20,12 6,21"/></svg>
      <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:none"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>
    </button>
    <div class="luz-player-progress-row luz-player-progress-row--audio">
      <span class="luz-player-time luz-player-current">0:00</span>
      <input class="luz-player-seekbar" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek audio">
      <span class="luz-player-time luz-player-duration">0:00</span>
    </div>
  </div>
</div>
```

Subtítulos: un elemento `<track>` por archivo dentro de `<video>` y un control en `.luz-player-btns`. Usa un botón para una pista y un selector para varias; el script rellena el selector.

Captions markup
```html
<video class="luz-player-video" preload="metadata" controls playsinline>
  <source src="interview.mp4" type="video/mp4">
  <track kind="captions" srclang="en" label="English" src="interview-en.vtt" default>
  <track kind="subtitles" srclang="es" label="Español" src="interview-es.vtt">
</video>

<!-- One track: a button that turns it on and off -->
<button class="luz-player-btn luz-player-captions" type="button" aria-pressed="false" aria-label="Captions">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 11h12M6 15h7"/></svg>
</button>

<!-- Several tracks: a select, filled by the script -->
<select class="luz-input luz-player-tracks" aria-label="Captions"></select>
```

Player script code
```js
import { initPlayers } from "@luz-ds/core/player";
initPlayers();
```

### Variantes y opciones
- `data-type="video"`: Un `<video class="luz-player-video">`; al pulsar en la imagen, se reproduce o se pausa
- `data-type="audio"`: Un `<audio class="luz-player-audio">` con una fila compacta de controles (`.luz-player-controls--audio`)
- `data-type="midi"` y `data-src`: Un archivo MIDI reproducido con Web Audio mediante `midi.js`, que solo se carga cuando hace falta
- `.luz-player-mute`, `.luz-player-volbar`: Un botón de silencio y un control deslizante de volumen
- `.luz-player-fullscreen`, `.luz-player-pip`: Botones opcionales de pantalla completa e imagen en imagen para vídeo
- `<track kind="captions">`, `kind="subtitles"`: Un archivo WebVTT con `srclang` y `label`; `default` lo muestra desde el principio
- `.luz-player-captions`: Un botón para activar y desactivar los subtítulos: usa la pista predeterminada o, si no hay, la primera
- `.luz-player-tracks`: Un selector con `.luz-input` para elegir una pista o ninguna
- `.luz-player-fallback`: Texto que solo se muestra cuando el script no se ejecuta

### Cómo funciona
El elemento multimedia nativo reproduce el archivo; `player.js` controla los controles de LUZ, con estilos de `components/player.css`.

- `initPlayers()` monta todos los elementos `.luz-player` de la página o del elemento que le pases. `luz.js` lo ejecuta. Si un reproductor ya está montado, lo deja como está, así que se puede volver a ejecutar sin riesgo.
- Al montarlo, el script quita `controls` nativo y conecta los controles de LUZ: reproducir y pausar, tiempo, búsqueda y volumen. Se inicializan según el estado del propio contenido: un vídeo `muted` aparece silenciado y la duración conocida por el navegador se muestra de inmediato.
- La búsqueda y el volumen usan controles deslizantes nativos `<input type="range">`. Cuando se conoce la duración, el de búsqueda tiene un paso por segundo, independientemente del valor de `max` en el marcado.
- Los botones de pantalla completa e imagen en imagen se ocultan cuando el navegador no ofrece esas funciones.
- Los subtítulos son los del navegador: cada elemento `<track>` es una pista de texto cuyos indicadores dibuja el navegador. Los controles de LUZ solo eligen qué pista se muestra, así que también reflejan las selecciones del menú propio del navegador. `::cue` muestra texto claro sobre la superficie multimedia. No se guarda ninguna opción. Se oculta cualquier control que no tenga una pista que mostrar.
- `mountPlayer(root)` y `mountMidiPlayer(root)` montan un único reproductor.
- El reproductor es un contenedor de consulta de tamaño: por debajo de 480 px de ancho propio, los controles de audio se apilan y se oculta la barra de volumen, esté donde esté. Si un elemento superior ajusta su tamaño al contenido (un elemento flex en línea o flotante), necesita un ancho propio.
- En texto de derecha a izquierda, la línea de tiempo sigue la dirección de lectura: la barra de búsqueda empieza a la derecha y se rellena hacia la izquierda, la fila de controles se invierte y las teclas del control deslizante son las del navegador. Los iconos de reproducción, pausa y volumen no se invierten: no apuntan a ninguna parte.

### Sin JavaScript
El audio y el vídeo muestran los controles propios del navegador y los de LUZ permanecen ocultos. Los controles del navegador ofrecen subtítulos; una pista con `default` se muestra desde el principio.

El reproductor MIDI muestra el texto alternativo.

### Teclado y ARIA
Usa Tab para moverte por los controles; cada uno conserva sus teclas nativas.

- Botones: Enter o Espacio. Sus nombres cambian según el estado: «Reproducir» o «Pausar», «Silenciar» o «Activar sonido». El botón de subtítulos conserva el nombre «Subtítulos» e indica si está pulsado (`aria-pressed`).
- Selector de pistas: usa las teclas propias del navegador; cada opción aparece en el idioma de su pista.
- Controles deslizantes: teclas de dirección, Home, End, Page Up y Page Down. Una tecla de dirección mueve el control de búsqueda un segundo y el de volumen un paso (5 % en el ejemplo). El de búsqueda indica el tiempo con texto.
- Cuando el reproductor tiene el foco, pero no uno de sus controles (por ejemplo, después de pulsar el vídeo): Espacio o K reproduce y pausa, y M silencia. F activa la pantalla completa y C activa o desactiva los subtítulos si el reproductor tiene esos botones. Si mantienes Ctrl, Alt o Cmd, estas teclas no hacen nada.
- El reproductor tiene `role="group"` y su nombre procede de `aria-label`.

### Cuándo usarlo
Usa un reproductor para reproducir un vídeo, un sonido o un archivo MIDI dentro de la página cuando quien lee lo inicie.

### Cuándo no usarlo
No uses un reproductor para contenido multimedia que se inicia solo o se reproduce en segundo plano.

- No actives nunca la reproducción automática.
- Para una ilustración animada breve y sin sonido, usa una imagen o una [figura](https://nandovejer.github.io/luz/es/docs/components/figure/).
