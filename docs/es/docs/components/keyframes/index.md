# Fotogramas clave

Cinco animaciones compartidas para tus propios componentes, que se detienen cuando se solicita movimiento reducido

Un quinto fotograma clave, `luz-fade-in`, abre el diálogo modal.

### Usar un fotograma clave

Asigna un nombre al fotograma clave en tu propia `animation` y toma su duración de un [token de movimiento](https://nandovejer.github.io/luz/es/docs/tokens/motion/).

Panel that slides in code
```css
.panel[open] {
  animation: luz-slide-up var(--luz-duration-base) var(--luz-easing-enter);
}
```

- Con el movimiento reducido, todos los tokens `--luz-duration-*` valen `0s`, por lo que la animación no se ejecuta y el elemento aparece en su estado final.
- Una duración escrita directamente ignora el movimiento reducido: no la escribas nunca.
- No repitas una animación indefinidamente: detenla cuando termine la tarea.

- `luz-spin`: Un giro completo, para un indicador de carga
- `luz-shimmer`: Desplaza un degradado de fondo, para un marcador de carga
- `luz-pulse`: Crece y se desvanece, y luego vuelve a aparecer, para llamar la atención una vez
- `luz-slide-up`: Aparece gradualmente mientras sube 8 px, para algo que entra en escena
- `luz-fade-in`: Aparece gradualmente; se usa en el diálogo modal y su fondo.
