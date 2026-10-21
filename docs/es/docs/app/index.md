# App

La cabecera y el panel de control de una aplicación web, sobre la estructura y la barra lateral de core; y cómo saber si las necesitas.

Una aplicación es una herramienta que las mismas personas usan a diario para consultar un estado y actuar sobre algo. La maquetación que necesita ya está en core: la estructura con su barra lateral, el panel deslizable en móvil, la barra fija, la cuadrícula y la tarjeta.

Este paquete contiene las dos piezas propias de una aplicación: la barra superior del área principal, con la búsqueda y la cuenta, y el panel de control, una cuadrícula de paneles bajo el título de la vista.

- Todas las clases empiezan por `.luz-app-`, usan solo tokens semánticos y están en la capa de cascada `luz.app`, después de las capas de site, landing y cms. Cada patrón es una clase sobre un elemento nativo, maquetado en el HTML con los objetos de core.
- No tiene script. Carga `app.css` después del CSS de tokens y core (y de site, si usas su búsqueda): [Instalar LUZ](https://nandovejer.github.io/luz/es/docs/get-started/#site-kinds) incluye el comando y las etiquetas CDN. La barra lateral es de core y tiene su propio script opcional.
- Tiene su propia versión, 0.x mientras sigue creciendo, y necesita la versión `^0.1.0` de tokens y core, declarados como dependencias peer. Site es una dependencia peer opcional: sin él, la barra no incluye búsqueda y el resto se muestra igual.
- No tiene barra lateral propia: la [barra lateral de core](https://nandovejer.github.io/luz/es/docs/components/sidebar/) se abre como un panel deslizable a 768 px o menos, sin script. La barra de iconos y la barra lateral plegable no están en la versión 0.1.
- La página de la aplicación, un panel de control vacío y una aplicación sin barra lateral no necesitan CSS propio: son fragmentos de HTML que puedes copiar de [las plantillas de App](https://nandovejer.github.io/luz/es/docs/app/templates/).

### Usa app cuando

- Creas una herramienta a la que las personas acceden con su cuenta, con una barra lateral de secciones y una vista para cada una.
- Quieres una barra discreta para las herramientas globales y un panel de control con paneles que muestren el estado de la vista.

### Usa otro paquete cuando

- Tu sitio es una landing page o un blog: [Landing](https://nandovejer.github.io/luz/es/docs/landing/) y [CMS](https://nandovejer.github.io/luz/es/docs/cms/) tienen sus propias cabeceras.
- Solo necesitas una barra lateral y un área de contenido: la [maquetación](https://nandovejer.github.io/luz/es/docs/components/layout/) y la [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/) de core son suficientes.
