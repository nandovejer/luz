# Documentación

La estructura, la cabecera de página, la barra lateral, el ejemplo, Qué hacer y qué no, la paginación y el pie de una web de documentación; y cómo saber si los necesitas.

### Usa este paquete cuando

- Escribes una web de documentación: guías, una referencia o un manual, con una barra lateral de páginas.
- Quieres que una página larga tenga una cabecera, una lista de sus secciones y un enlace a la página siguiente.

### Usa otro paquete cuando

- Tu sitio es una landing page, un blog o una aplicación: [Landing](https://nandovejer.github.io/luz/es/docs/landing/), [CMS](https://nandovejer.github.io/luz/es/docs/cms/) y [App](https://nandovejer.github.io/luz/es/docs/app/) tienen sus propias piezas.
- Solo necesitas una barra lateral y un área de contenido: la [maquetación](https://nandovejer.github.io/luz/es/docs/components/layout/) y la [barra lateral](https://nandovejer.github.io/luz/es/docs/components/sidebar/) de core son suficientes.

Una web de documentación se lee durante sesiones largas, página tras página. La maquetación que necesita ya está en core: la estructura, la barra lateral y su panel, el bloque de código y la tabla.

Este paquete contiene las siete piezas propias de una página de documentación: las tres columnas, la cabecera, la lista de secciones, el ejemplo enmarcado, el par de Qué hacer y qué no, los enlaces a la página siguiente y la letra pequeña.

### Instalar y cargar

- Todas las clases empiezan por `.luz-docs-`, usan solo tokens semánticos y están en la capa de cascada `luz.docs`, después de la de app.
- No tiene script. Carga `docs.css` después del CSS de tokens y core: [Instalar LUZ](https://nandovejer.github.io/luz/es/docs/get-started/#site-kinds) incluye el comando. El script de core es opcional: marca en la barra lateral la sección visible.
- Tiene su propia versión, 0.x mientras sigue creciendo, y necesita la versión `^0.1.0` de tokens y core. Site es una dependencia peer opcional para la búsqueda.
- Puedes copiar una página completa; [las plantillas de Documentación](https://nandovejer.github.io/luz/es/docs/documentation/templates/) también explican qué falta en la versión 0.1.
