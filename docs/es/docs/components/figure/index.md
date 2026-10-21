# Figura

Muestra una imagen, un gráfico o un diagrama con un pie que indica qué representa.

### Problemas conocidos
Ninguno conocido.

### Copiar el marcado
Figure markup
```html
<figure class="luz-figure">
  <div class="luz-figure__media">
    <img src="requests.png" width="640" height="192" alt="Bar chart: requests rise every day, from 1,200 on Monday to 3,400 on Saturday.">
  </div>
  <figcaption class="luz-figure__caption">Requests per day, last six days.</figcaption>
</figure>
```

### Variantes y opciones
No hay modificadores.

- `.luz-figure`: Una superficie con relleno, borde inicial del color de marca y esquinas redondeadas
- `.luz-figure__media`: Redondea y recorta la imagen, el gráfico o el código que contiene
- `.luz-figure__caption`: Más pequeño, en cursiva y con el color de texto secundario

### Cómo funciona
Elementos nativos `<figure>` y `<figcaption>`, con estilos de `components/figure.css`. No necesitan JavaScript.

- El pie identifica la figura para la tecnología de asistencia.
- Un `<figure>` sin clases también recibe un estilo básico de los elementos base.

### Sin JavaScript
No cambia nada: una figura usa HTML y CSS.

### Teclado y ARIA
Una figura no es interactiva ni recibe el foco.

- El contenido multimedia necesita su propia alternativa textual: `alt` en un `<img>`, o `role="img"` y `aria-label` en un `<svg>` en línea.
- Un gráfico también necesita que sus datos aparezcan como texto: en el texto alt, en el pie o en una [tabla](https://nandovejer.github.io/luz/es/docs/components/table/) junto al gráfico.

### Cuándo usarlo
Usa una figura para un gráfico, una imagen, un diagrama o un fragmento de código al que haga referencia el texto y que necesite un pie.

### Cuándo no usarlo
No uses una figura con fines decorativos.

- Una imagen decorativa lleva `alt=""` y no necesita una figura.
- Para mostrar una imagen en un cuadro con forma fija, usa el [marco de imagen](https://nandovejer.github.io/luz/es/docs/components/image/).
