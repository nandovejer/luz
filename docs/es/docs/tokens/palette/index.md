# Paleta de colores

Las escalas de colores primitivos. Solo para quienes crean temas: los componentes nunca las usan.

¿Estás creando un componente? Usa los [colores semánticos](https://nandovejer.github.io/luz/es/docs/tokens/color/). Un tema asigna estas escalas a los tokens semánticos.

Valores sin procesar que nunca se usan directamente en los componentes. La paleta propia de LUZ: `scripts/build-palette.js` calcula cada paso en OKLCH a partir de una curva de luminosidad compartida por todas las familias, una curva de croma y un tono por familia.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
