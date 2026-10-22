# Comprobador de contraste

Comprueba tus propias sobrescrituras de color frente al contraste que promete LUZ, con un comando o en la página, antes de que lleguen a quien la use.

### Ejecutarlo

LUZ mantiene legibles sus propios colores en los modos claro, oscuro y de alto contraste. En cuanto sobrescribes un token, esa promesa pasa a ser tuya. `check-contrast` lee las declaraciones `--luz-*` de tu hoja de estilos, las aplica sobre los tokens de LUZ como haría el navegador y mide las mismas combinaciones que se enumeran en las páginas de componentes. Necesita Node 20 o posterior y nada más. `luz-check`, el comando de [@luz-ds/check](https://nandovejer.github.io/luz/es/docs/get-started/ai/), realiza la misma comprobación en las hojas de estilo que indiques, junto con sus reglas para el HTML y CSS de una página.

The command
```text
npx @luz-ds/tokens check-contrast my-theme.css
```

Indica los nombres de tus archivos en el orden en que carga la página. Usa `--json` para obtener un informe legible por máquina y `--strict` para que también fallen las advertencias.

Example output
```text
✗ light, high-contrast: --luz-text-secondary on surface-page is 2.8:1, needs 4.5:1 (text)
    --luz-text-secondary: #999 is set in my-theme.css:2
✗ contrast: 5 pairs fail (9 of 378 measurements) in light, dark, high-contrast
```

### Qué comprueba

La luminancia relativa de WCAG 2.x y el contraste del nivel AA de WCAG 2.2. No se usa APCA porque no forma parte del estándar.

Las combinaciones se comprueban en los modos claro, oscuro y de alto contraste, y en cada `[data-theme="name"]` que defina tu archivo, como `name` y `name/light`, `name/dark` y `name/high-contrast`. Los colores translúcidos se aplican sobre la superficie que tienen debajo, como en la página. Una *advertencia* es un objetivo más estricto que WCAG que LUZ se fija, como el relleno de una casilla marcada sobre la página: se muestra, pero no hace fallar la comprobación salvo que pases `--strict`.

### Qué lee

- **Selectores:** `:root`, `html`, `[data-theme="x"]` y `[data-mode="y"]`, por separado o combinados. Una regla posterior prevalece sobre otra anterior con la misma especificidad, y un selector más específico prevalece sobre uno posterior. Una sobrescritura de `:root` cargada después de LUZ también llega a los modos oscuro y de alto contraste, salvo que ese modo vuelva a establecer el token: establece cada token por modo.
- **Reglas at:** `@media (prefers-color-scheme: dark)` y `light`, además de `@layer` y `@supports`, se consideran verdaderas. No se modela el orden de las capas.
- **Valores:** `#rgb`, `#rrggbb` con o sin alfa, `rgb()` y `hsl()` en cualquiera de sus sintaxis, `white`, `black`, `transparent` y cadenas de `var()`.
- **Todo lo demás se informa, no se omite:** los selectores de clase, otras consultas de medios o reglas que no se entiendan se enumeran como ignoradas. Un color que no se pueda leer, como `color-mix()` u `oklch()`, cuenta como un fallo, porque una combinación que no se ha medido no es una combinación que haya superado la prueba.

### Códigos de salida

### En tu compilación

El comando hace fallar el paso si hay un error, así que basta con una línea.

A package.json script
```json
{
  "scripts": {
    "check:contrast": "luz-tokens check-contrast src/theme.css"
  }
}
```

### Pruébalo en la página

Con JavaScript activado, puedes pegar aquí tus sobrescrituras y ejecutar la misma comprobación. No sale nada de la página. Sin JavaScript, usa el comando anterior: hace lo mismo.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
