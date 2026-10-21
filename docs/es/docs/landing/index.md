# Landing

Lo que una landing page necesita además de core: desde la cabecera y el hero hasta los bloques de una página de evento; y cómo saber si los necesitas.

Una landing page presenta un producto o evento en una sola página e invita a quien la visita a actuar. Este paquete contiene los patrones que solo usa este tipo de página.

La columna de página, la barra fija, el enlace para saltar y los enlaces de la cabecera son de core; la búsqueda, el banner de cookies y el selector de idioma son de [Site](https://nandovejer.github.io/luz/es/docs/site/) y opcionales.

- Todas las clases empiezan por `.luz-landing-`, usan solo tokens semánticos y están en la capa de cascada `luz.landing`, después de la de site.
- No tiene script. Carga `landing.css` después del CSS de tokens, core y site: [Instalar LUZ](https://nandovejer.github.io/luz/es/docs/get-started/#site-kinds) incluye el comando y las etiquetas CDN.
- Tiene su propia versión, 0.x mientras sigue creciendo, y necesita la versión `^0.1.0` de tokens, core y site, declarados como dependencias peer.
- La [página de inicio de LUZ](https://nandovejer.github.io/luz/es/) está hecha con este paquete.

### Usa landing cuando

- Creas la página de un producto, un servicio o un evento, con características que mostrar unas junto a otras.
- Quieres bloques que puedas copiar para una página así: hero, programa, ponentes, entradas, llamada a la acción e inscripción.

### Usa solo site cuando

- Tus páginas son artículos, documentación o una aplicación: una cabecera, el contenido y un pie.
- Maquetas tus propios bloques con los objetos de cuadrícula de core.
