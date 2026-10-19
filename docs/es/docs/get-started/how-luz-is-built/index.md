# Cómo se construye LUZ

Tres compromisos detrás de cada versión: se crea pensando primero en las personas y también para que la entiendan los agentes de IA; cada cambio empieza con una prueba que falla; y nada se ejecuta en tu página si no lo has cargado.

### Primero las personas, lista para la IA

LUZ se crea para quien usa la página. Parte del HTML nativo, funciona con teclado y sin JavaScript, y aspira al nivel AA de WCAG 2.2 en tres modos de color.

El HTML y CSS sencillos, con una lista cerrada de nombres de clase, también son fáciles de usar correctamente por un agente de IA. El sitio publica la lista de nombres y un comando comprueba lo que ha escrito el agente.

[Trabajar con IA](https://nandovejer.github.io/luz/es/docs/get-started/ai/) incluye los archivos y la instrucción.

### Primero las pruebas

Cada cambio empieza con una prueba que falla. La prueba indica qué debe hacer el cambio y se confirma antes que él. Primero se explora: puedes probar un cambio con libertad y escribes su prueba cuando sabes qué debe hacer, antes del primer commit.

El proceso tiene dos pasos:

1. Crea un commit `test:`. La prueba debe fallar sin el cambio y por el motivo correcto: porque falta el comportamiento, no por una errata en la prueba.
2. Crea el commit del cambio que hace que la prueba pase. Nadie debilita una prueba para que pase.

Una corrección empieza con la prueba que reproduce el error. La prueba se lee antes que el código.

Hay varios tipos de pruebas:

- **Pruebas unitarias** con Vitest, para la lógica y los valores.
- **Pruebas en navegador** con Playwright en Chromium, una vez con JavaScript y otra sin él. Comprueban el comportamiento, el teclado y el estado de la página cuando el script no se ejecuta.
- **Pruebas de accesibilidad.** axe analiza cada página en los modos claro, oscuro y de alto contraste. Un problema grave o crítico hace fallar la compilación.
- **Pruebas de documentación.** Las relaciones de contraste y las listas de tokens de las páginas de documentación se calculan a partir del CSS y una prueba vuelve a calcularlas para evitar que se desvíen del código.
- **Presupuestos de tamaño.** Si un archivo supera su límite, la comprobación falla; nadie aumenta el límite.
- **Comprobaciones** de los textos publicados, las licencias y el contenido de cada paquete.

Un solo comando, `pnpm check:all`, las ejecuta todas.

Ese comando no incluye Safari ni Firefox. Antes de una versión, unas personas revisan ambos navegadores y las revisiones abiertas son públicas.

Las reglas que aplican estas comprobaciones están en [PRINCIPLES.md](https://github.com/nandovejer/luz/blob/main/PRINCIPLES.md), y [TESTING.md](https://github.com/nandovejer/luz/blob/main/dev/TESTING.md) explica cómo escribir pruebas.

### Sin dependencias

Los paquetes no tienen dependencias en tiempo de ejecución. Incluyen CSS sencillo y pequeños módulos ES que no necesitan compilación, y usan los elementos y las API del navegador antes que cualquier script.

Los presupuestos de tamaño son una línea roja: una comprobación falla si un archivo supera su límite y nadie lo aumenta para que pase. Todo lo que publica LUZ está bajo la licencia MIT, y solo bajo la licencia MIT.

[Primeros pasos](https://nandovejer.github.io/luz/es/docs/get-started/) explica cómo cargarlo.
