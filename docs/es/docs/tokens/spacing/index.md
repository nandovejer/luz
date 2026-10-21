# Espaciado y tamaños

La escala de espaciado para separaciones y rellenos, y las alturas de botones y campos.

Obtén de esta escala todas las separaciones, rellenos y márgenes para que el espaciado sea coherente entre componentes. Usa los pasos pequeños dentro de un componente y los grandes entre secciones.

Una línea fina de 2px y, después, la unidad `--luz-space-unit` (0.25rem, 4px con una raíz de 16px) multiplicada por 1, 2, 3, 4, 6, 8, 12, 16 y 24: cada potencia de dos y el paso intermedio de 1,5×. La unidad se expresa en rem, así que el espaciado sigue, como el texto, el tamaño de fuente que se configura en el navegador. Defínela en `:root` para cambiar toda la escala; los componentes usan los pasos, nunca la unidad.

### Alturas de los controles

`tokens.json → control`

44px es el tamaño objetivo de WCAG 2.5.5; los demás pasos distan aproximadamente 1,25× en la cuadrícula de 4px.

- `--luz-control-sm`: botones de cierre y otros objetivos pequeños para iconos.
- `--luz-control-md`: botones pequeños.
- `--luz-control-lg`: botones y campos; es el valor predeterminado.
- `--luz-control-xl`: botones grandes.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
