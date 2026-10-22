# CMS

La estructura de páginas de un blog, un periódico o cualquier sitio de artículos, desde la cabecera hasta el listado de publicaciones; y cómo saber si lo necesitas.

Un sitio de artículos publica muchas páginas con la misma estructura: una historia con cabecera, texto y autor, y listados que llevan hasta ellas. Este paquete contiene la estructura de página de ese tipo de sitio: la cabecera (una barra o una mancheta), la cabecera de página, la cabecera del artículo con su índice y el pie.

La maquetación que necesita cada página (la página, la barra fija y la navbar) es de core; las piezas que actúan en todo el sitio (búsqueda, idioma y consentimiento de cookies) están en [Site](https://nandovejer.github.io/luz/es/docs/site/).

- Funciona con cualquier CMS y cualquier stack. Puedes poner las clases en cualquier elemento, así que una plantilla de WordPress, Drupal, Ghost, Hugo o tu propio código puede incluirlas.
- Todas las clases empiezan por `.luz-cms-`, usan solo tokens semánticos y están en la capa de cascada `luz.cms`, después de la de site. Cada patrón es una clase sobre un elemento nativo, maquetado en el HTML con los objetos de core.
- No tiene script. Carga `cms.css` después del CSS de tokens y core (y de site, si lo usas): [Instalar LUZ](https://nandovejer.github.io/luz/es/docs/get-started/#site-kinds) incluye el comando y las etiquetas CDN. Con el script de core, el índice marca la sección visible.
- Tiene su propia versión, 0.x mientras sigue creciendo, y necesita la versión `^0.1.0` de tokens y core, declarados como dependencias peer. Site es una dependencia peer opcional: sin él, los patrones se muestran igual y las reglas que refinan sus elementos no afectan a nada.
- La tarjeta de publicación, el listado, las publicaciones relacionadas y la ficha del autor no necesitan su propio CSS: se componen con la tarjeta, el avatar y la paginación de core en [plantillas de CMS](https://nandovejer.github.io/luz/es/docs/cms/templates/).

### Usa cms cuando

- Publicas artículos, entradas o historias, cada una con título, autor y fecha.
- Tus artículos son lo bastante largos como para necesitar un índice junto al texto.
- Quieres una cabecera que dé nombre a la publicación y a sus secciones, como una barra o una mancheta de periódico.

### Usa otro paquete cuando

- Tu sitio es una landing page: [Landing](https://nandovejer.github.io/luz/es/docs/landing/) tiene su cabecera, hero y pie.
- Tus páginas son documentación o una aplicación, sin autor ni fecha: la [maquetación](https://nandovejer.github.io/luz/es/docs/components/layout/) y la [navbar](https://nandovejer.github.io/luz/es/docs/components/navbar/) de core son un buen punto de partida.
