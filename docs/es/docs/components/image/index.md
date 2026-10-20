# Imagen

Muestra una imagen en un marco de forma fija, con una superficie lisa mientras se carga o si falta.

### Problemas conocidos
Si una imagen no se carga, algunos navegadores añaden un icono de imagen rota junto a su texto alternativo. En el modo de colores forzados, la superficie adopta el color de la página y el marco muestra un borde fino.

### Copiar el marcado
Image frame markup
```html
<div class="luz-image">
  <picture>
    <source type="image/avif" srcset="dunes-640.avif 640w, dunes-1280.avif 1280w" sizes="(min-width: 768px) 50vw, 100vw">
    <source type="image/webp" srcset="dunes-640.webp 640w, dunes-1280.webp 1280w" sizes="(min-width: 768px) 50vw, 100vw">
    <img src="dunes-1280.jpg" srcset="dunes-640.jpg 640w, dunes-1280.jpg 1280w" sizes="(min-width: 768px) 50vw, 100vw"
      width="1280" height="720" alt="Sand dunes under a low sun" loading="lazy" decoding="async">
  </picture>
</div>
```

### Variantes y opciones
Un modificador establece la forma. Si no se usa ninguno, el marco tiene una proporción de 16:9.

- `.luz-image`: 16:9
- `.luz-image--4x3`: 4:3
- `.luz-image--3x2`: 3:2
- `.luz-image--1x1`: Cuadrado
- `.luz-image--21x9`: 21:9, para banners anchos
- `.luz-image--9x16`: 9:16, vertical

### Cómo funciona
Un `<div>` de proporción fija alrededor de un `<picture>` nativo, con estilos de `@luz-ds/core`. Sin JavaScript.

- La imagen llena el marco y se recorta para ajustarse a él.
- El marco es una superficie lisa `--luz-surface-strong`: se muestra sin imagen, mientras se carga o si falla. El texto alternativo de una imagen que no se carga aparece sobre ella, al igual que las imágenes PNG y SVG transparentes.
- LUZ no incluye ninguna imagen de sustitución: la página no solicita nada que no haya especificado.

### Sin JavaScript
No cambia nada: el marco y la imagen se crean con HTML y CSS. Sin CSS, la imagen aparece con su tamaño original.

### Teclado y ARIA
El marco no tiene ninguna interacción propia.

- Los lectores de pantalla anuncian el `<img>` mediante su texto alternativo; un marco vacío no anuncia nada.
- No añadas un rol ni un `aria-label` al marco.
- Si la imagen es un enlace, su nombre procede del texto alternativo, que debe indicar adónde lleva.

### Cuándo usarlo
Usa el marco de imagen para mostrar una imagen en un cuadro de forma fija, como la portada de una tarjeta o la cabecera de un artículo, cuando la imagen pueda faltar.

- Contenido de otras personas o de un sistema de gestión de contenidos.
- Una página creada antes de disponer de las imágenes.

### Cuándo no usarlo
No lo uses con imágenes que deban conservar su forma, como gráficos o capturas de pantalla: el marco las recorta.

- Para un gráfico o diagrama con un pie, usa una [figura](https://nandovejer.github.io/luz/es/docs/components/figure/).
- Para los iconos y logotipos, usa un `<img>` o un SVG con su tamaño original.
- No uses nunca un marco vacío como sustituto de una imagen informativa: si falta, indícalo con texto.
