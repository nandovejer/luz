# Radio

La escala de radios de esquina: cuadrado, 2px, como máximo 4px, y redondo.

Todas las cajas tienen la misma esquina, `--luz-radius-md` (4px): botones, campos con borde completo, tarjetas, alertas, menús y diálogos. Es el límite: ningún rectángulo es más redondeado. `--luz-radius-sm` se usa en elementos pequeños (código en línea, `kbd`, casillas de verificación y barras finas) y en una fila dentro de una caja redondeada, para que las dos esquinas sean concéntricas. `--luz-radius-none` se usa en una caja que se une a otra o en un campo que solo tiene borde inferior, como un selector o un campo de texto.

`--luz-radius-full` no es una esquina: crea una píldora o un círculo para formas que son redondas por naturaleza, como la pista de un interruptor o la insignia de recuento. Un punto, un botón de opción o el control de un deslizador se convierte en círculo con `50%`.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
