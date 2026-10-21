# Site

Seis componentes independientes que necesitan datos del sitio: búsqueda, consentimiento de cookies, modo de color, selector de idioma, submenú y banner; y cómo saber si los necesitas.

Una pieza pertenece aquí cuando necesita datos del sitio: su índice de búsqueda, su política de cookies, sus idiomas, su menú o un aviso. Cada una es una etiqueta `<luz-*>` independiente, que funciona en cualquier cabecera o página.

Todo lo demás es un **componente** de core: una pieza reutilizable que encaja en cualquier sitio; los componentes están en [Componentes](https://nandovejer.github.io/luz/es/docs/components/).

La estructura de la página (la cabecera, el hero, el pie y la cabecera de página) está en los paquetes para cada tipo de sitio: [landing](https://nandovejer.github.io/luz/es/docs/landing/) para una landing page y [CMS](https://nandovejer.github.io/luz/es/docs/cms/) para un blog, un periódico o cualquier CMS. Funcionan sin este paquete y usan sus componentes cuando necesitan una búsqueda o un selector de idioma.

- Cada etiqueta es el bloque y sus partes siguen el patrón `.luz-<tag>__<part>`; todas las reglas usan solo tokens semánticos.
- La [página de inicio de LUZ](https://nandovejer.github.io/luz/es/) y esta documentación están hechas con ellos.
- ¿No sabes a qué paquete pertenece una pieza? [Qué necesita cada paquete](https://nandovejer.github.io/luz/es/docs/get-started/structure/#needs) enumera todas las piezas y el paquete que las contiene.

### Usa site cuando

- Quieres búsqueda del sitio, un banner de cookies o un selector de idioma sin tener que programarlos.
- Tu cabecera tiene varios enlaces agrupados bajo un botón.
- Necesitas un aviso breve encima de la cabecera en todas las páginas.

### Usa solo core cuando

- Solo necesitas componentes como botones, formularios y tarjetas.
- Tu sitio no tiene búsqueda ni cookies opcionales, y solo tiene un idioma.
- Creas un único widget, no una página completa.

### Tus propios componentes encima

Da estilo también a lo que añadas con tokens semánticos para que siga el modo de color y cualquier [tema propio](https://nandovejer.github.io/luz/es/docs/tokens/themes/).

Semantic tokens in an app-level component
```css
.my-panel {
  background: var(--luz-surface);
  border: 1px solid var(--luz-divider);
  color: var(--luz-text-primary);
}

.my-panel:hover {
  background: var(--luz-surface-muted);
  border-color: var(--luz-outline);
}

/* Not a primitive colour: it would stay the same in dark mode */
/* color: var(--luz-gray-100); */
```
