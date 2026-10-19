# Tokens

Propiedades personalizadas de CSS para todos los valores de color, espacio, tamaño y tipografía. Usa los semánticos: cambian según el modo de color.

### Dos capas

- **Los primitivos** contienen valores sin procesar: `--luz-blue-60`, `--luz-space-md`. Son iguales en todos los modos.
- **Los tokens semánticos** asignan una función a un color: `--luz-text-primary`, `--luz-surface-page`. En cada modo apuntan a distintos primitivos.
- Las escalas de espacio, tamaño, radio, sombra y tipografía son primitivos que los componentes usan directamente: no cambian según el modo.

Where the tokens come from
```text
packages/tokens/tokens.json        the source of the primitives
packages/tokens/src/semantic.css   the semantic colours, per mode
dist/luz-tokens.css                both layers, and the ET Book font
dist/tokens.css                    both layers, no font
```

### Usa colores semánticos, nunca primitivos

Un componente que usa un color primitivo se ve bien en un modo y mal en los demás.

Semantic and primitive colour tokens
```css
/* Do: semantic tokens follow the mode */
.panel {
  color: var(--luz-text-primary);
  background: var(--luz-surface);
  border: 1px solid var(--luz-divider);
  padding: var(--luz-space-md);
}

/* Don't: a primitive colour stays the same in dark mode */
.panel {
  color: var(--luz-gray-100);
  background: var(--luz-blue-10);
}
```

### Texto sobre un relleno sólido

Con `--luz-text-on-fill`, usa un token de relleno, no el color de marca ni el de estado.

- Los rellenos: `--luz-brand-fill`, `--luz-brand-fill-hover`, `--luz-brand-fill-active` y `--luz-color-danger-fill`.
- En los modos claro y de alto contraste, equivalen a los colores de marca y de peligro. En el modo oscuro son un nivel más oscuros: el color oscuro de marca es lo bastante claro para leerse como texto, y el texto blanco sobre él no alcanza 4,5:1.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
