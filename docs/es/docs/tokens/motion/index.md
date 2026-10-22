# Movimiento

Las duraciones y funciones de aceleración de cada transición, que pasan a cero cuando quien lee prefiere reducir el movimiento. Incluido en @luz-ds/tokens.

Obtén todas las duraciones de un token. Con `prefers-reduced-motion: reduce`, todas pasan a `0s`, así que el movimiento se detiene en todas partes sin CSS adicional.

Incluido en tokens, con el cambio a `0s` cuando se prefiere reducir el movimiento, así que una página solo con tokens también pierde su movimiento.

A transition with motion tokens
```css
.panel {
  transition: opacity var(--luz-duration-base) var(--luz-easing-standard);
}
```

- **Estándar** para los movimientos dentro de la página, **entrada** para lo que aparece y **salida** para lo que desaparece.
- **Elástico** se pasa un poco: resérvalo para detalles pequeños y desenfadados.
- No escribas una duración fija en el código: ignoraría la preferencia de movimiento reducido.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
