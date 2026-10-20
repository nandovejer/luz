# Trabajar con IA

Qué puede leer un agente de programación con IA, cómo comprobar lo que ha escrito y qué revisor de accesibilidad puedes darle.

### Comprueba lo que ha escrito un agente

`npx @luz-ds/check` lee sin conexión el HTML y el CSS de un proyecto e indica qué clases, elementos, orden de carga y tokens de color de LUZ son incorrectos. Lee archivos, pero no escribe nada.

The files an agent can read are linked from `llms.txt`. The commands with paths, the options and exit codes (`npx @luz-ds/check --help`), a sample of the output, the fields of `--json` and the tables of the files and of the rules are on the page at the URL above.

### Qué bloquea y sobre qué avisa check

Cada regla tiene un id, como `class/unknown`, que aparece en todos los hallazgos. Una regla bloqueante hace que el código de salida sea 1.

### El revisor de accesibilidad

El mismo paquete muestra una definición de agente para un asistente de programación con IA: un revisor que lee el código fuente de una página y ofrece recomendaciones de accesibilidad. Cópiala en tu proyecto.

The command that copies the reviewer
```bash
npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md
```

- **Sobrescribe archivos.** El operador `>` sustituye un archivo existente. Si lo has editado, usa otra ruta o guarda antes tu copia en el control de versiones.
- **Es de solo lectura.** Tiene tres herramientas, `Read`, `Grep` y `Glob`: lee, busca y enumera archivos, pero no escribe nada. Solo lectura no significa que sea inofensivo, porque `Read` no limita las rutas. Lee el archivo antes de usarlo y revisa cualquier cambio como harías con el código.

The other notes on the reviewer are on the page at the URL above.

### Lo que no hace

Una ejecución sin hallazgos indica lo que el comprobador no ha encontrado en los archivos que ha leído. No es una prueba de la página.

- **No ejecuta un navegador.** Lee archivos, así que no detecta nada que dependa de cómo se representa una página, como la maquetación, el orden del foco o los colores que calcula el navegador.
- **Solo mide el contraste de tus tokens.** Mide los colores `--luz-*` que defines en tu propio archivo de tokens de color. No compara los colores escritos directamente en una regla con ningún otro. En [Comprobación del contraste](https://nandovejer.github.io/luz/es/docs/tokens/contrast/) se explica cómo lee los pares.
- **No detecta las clases creadas en tiempo de ejecución.** Un nombre construido en un script, como `"luz-" + name`, o escrito por una plantilla, no está en el archivo, así que no se comprueba.
- **No comprueba nombres, etiquetas, texto alternativo, encabezados ni el idioma.** No analiza si un botón tiene nombre, si una imagen tiene una alternativa útil, si los encabezados están ordenados ni si la página tiene un idioma. Una ejecución sin hallazgos no dice nada sobre estos aspectos.
- **No sustituye las pruebas con lector de pantalla.** Ni el comando ni el revisor utilizan tecnología de asistencia. Lo que no se ha probado se enumera en [la declaración de accesibilidad](https://nandovejer.github.io/luz/es/docs/accessibility/#h-a11y-not-tested).
- **No accede a la red.** Se ejecuta sin conexión, con los datos de tu `node_modules` o de su propio paquete.
- **El descubrimiento mediante `llms.txt` se hace con un enlace.** Este sitio no está en la raíz de un host, así que el agente no encuentra el archivo por sí solo: dale la URL, como hace el prompt anterior.
- **El código de salida 0 no es un resultado de accesibilidad.** Indica que ninguna de las reglas anteriores bloquea los archivos leídos.
- **Los mensajes están en inglés.** No se traducen, sea cual sea el idioma de la página.
