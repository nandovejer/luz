# Tipografía

Las tres pilas de fuentes, la escala tipográfica en rem y el tamaño mínimo que puede usar cada tipo de texto.

Dos parámetros determinan el tamaño de toda la escala. Defínelos en rem en `:root`, dentro de tu CSS; definirlos en `body` o en una sección no cambia nada. Los componentes leen los pasos `--luz-text-*`, nunca los parámetros.

### Funciones de las fuentes

Estos cuatro se incluyen en core, no en tokens.

### Escala tipográfica y tamaños mínimos

Todos los tamaños se expresan en `rem`, así que el texto sigue el tamaño de fuente que se configure en el navegador, no solo el zoom de página (WCAG 1.4.4). La escala es igual para todos los anchos de ventana: ningún punto de ruptura reduce el texto. Por encima de la base de 16px, cada paso es el anterior multiplicado por 1.25 y redondeado a 1/16 rem (un píxel entero con el valor predeterminado); por debajo están los mínimos de legibilidad. La columna Fórmula muestra la cadena tal como la escribe la hoja de estilos; un navegador compatible con `round()` redondea cada paso a 1/16 rem y obtiene el valor de la columna Valor.

- El **texto del cuerpo** usa `--luz-text-body` (17px con los valores predeterminados), con una altura de línea de 1.6.
- El **texto secundario y de interfaz** nunca es inferior a `--luz-text-sm` (14px).
- **Nada** baja de `--luz-text-xs` (12px). Los tamaños relativos a su contexto (`kbd`, `time`, `output`, código en línea y pies) se limitan con `max()` para que no bajen del mínimo dentro de texto pequeño.
- Los **campos de formulario** usan `--luz-text-control` (configuración de core): `--luz-text-md` en ordenadores; `max(1rem, var(--luz-text-base))` a 768px o menos y en pantallas táctiles, nunca por debajo de 16px, porque iOS Safari amplía la página al enfocar cualquier campo más pequeño.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
