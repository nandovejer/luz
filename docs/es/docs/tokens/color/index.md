# Color

Todos los colores que puede usar un componente, con nombres según su función y sus valores en claro, oscuro y alto contraste, uno junto al otro.

Elige un token por la función que cumple, no por su color. El nombre es el mismo en todos los modos; cambia el valor.

- **Superficies** para fondos, **texto** para palabras, **líneas** para bordes y separadores.
- **Marca** para enlaces y la acción principal; los tokens de **relleno** van detrás del texto blanco.
- **Estado** para éxito, advertencia, peligro e información, y nada más.
- **Barra lateral**, **campos** y **sintaxis de código** solo para esos componentes.

Cada token muestra su función y, al lado, su valor en los modos claro, oscuro y de alto contraste. Un clic en el nombre lo selecciona entero, listo para copiar. En Figma, los mismos nombres son variables: consulta [Tokens en Figma](https://nandovejer.github.io/luz/es/docs/tokens/figma/).

**Los 55 tokens semánticos, en 9 grupos**

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
