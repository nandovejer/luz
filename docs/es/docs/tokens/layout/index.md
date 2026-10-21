# Maquetación y puntos de ruptura

El ancho del contenido y dónde cambia la maquetación. Incluido en @luz-ds/core.

Incluido en core, no en tokens.

- Los puntos de ruptura son valores de referencia: las consultas de medios no pueden leer propiedades personalizadas, así que escribe el número, por ejemplo, `@media (max-width: 768px)`.
- Safari en un Mac con barras de desplazamiento siempre visibles no cuenta la barra en las consultas de medios basadas en el ancho (error 52653 de WebKit), así que se alcanza un punto de ruptura cuando la ventana mide hasta unos 15 px más que su valor.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
