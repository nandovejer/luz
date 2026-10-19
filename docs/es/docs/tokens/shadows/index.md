# Sombras

La escala de elevación: cuánto parece flotar una superficie sobre la página.

Cuanto más elevada está la superficie, mayor es la sombra. No uses nunca una sombra como único borde de una superficie: combínala con un borde, porque las sombras desaparecen con los colores forzados.

Los valores de abajo corresponden al modo claro. En el modo oscuro, las sombras pequeña, mediana y grande se vuelven más intensas, con negro al 40, 50 y 60 por ciento, porque una sombra pálida no se aprecia sobre una superficie oscura. En alto contraste se sustituyen por contornos: la sombra pequeña desaparece, la mediana es una línea negra de 1px y la grande, una línea negra de 2px, porque ahí el desenfoque es invisible. `--luz-shadow-icon` se define una sola vez, así que todos los modos usan el mismo valor.

- `--luz-shadow-sm`: una tarjeta bajo el puntero.
- `--luz-shadow-md`: tooltips y avisos emergentes.
- `--luz-shadow-lg`: diálogos y el panel lateral.
- `--luz-shadow-icon`: un icono sobre una imagen, como el botón de reproducción de un vídeo.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
