# Media de Tutoriales

Esta carpeta contiene las imágenes y videos utilizados en los tutoriales del sistema.

## Estructura de Carpetas

```
tutoriales/
├── imagenes/
│   ├── comenzar/          # Imágenes para tutoriales de "Comenzar"
│   ├── productos/         # Imágenes para tutoriales de "Productos"
│   ├── inventario/        # Imágenes para tutoriales de "Inventario"
│   ├── caja/              # Imágenes para tutoriales de "Caja"
│   ├── empleados/         # Imágenes para tutoriales de "Empleados"
│   ├── proveedores/       # Imágenes para tutoriales de "Proveedores"
│   ├── reportes/          # Imágenes para tutoriales de "Reportes"
│   └── configuracion/     # Imágenes para tutoriales de "Configuración"
└── videos/
    ├── comenzar/          # Videos para tutoriales de "Comenzar"
    ├── productos/         # Videos para tutoriales de "Productos"
    ├── inventario/        # Videos para tutoriales de "Inventario"
    ├── caja/              # Videos para tutoriales de "Caja"
    ├── empleados/         # Videos para tutoriales de "Empleados"
    ├── proveedores/       # Videos para tutoriales de "Proveedores"
    ├── reportes/          # Videos para tutoriales de "Reportes"
    └── configuracion/     # Videos para tutoriales de "Configuración"
```

## Nomenclatura de Archivos

### Imágenes

**Formato:** `nombre-descriptivo-paso.jpg` o `nombre-descriptivo-paso.png`

Ejemplos:
- `agregar-producto-formulario.jpg`
- `agregar-producto-confirmacion.jpg`
- `pos-interfaz-principal.png`
- `inventario-movimientos-lista.jpg`

**Thumbnails:** Agregar sufijo `-thumb` para miniaturas
- `agregar-producto-thumb.jpg` (400x300px)

### Videos

**Formato:** `nombre-descriptivo.mp4`

Ejemplos:
- `agregar-producto.mp4`
- `realizar-venta.mp4`
- `cerrar-turno.mp4`

## Especificaciones Técnicas

### Imágenes

- **Formato:** JPG (preferido) o PNG
- **Resolución:**
  - Screenshots: 1920x1080 o 1280x720
  - Thumbnails: 400x300px
- **Tamaño máximo:** 500KB por imagen
- **Optimización:** Usar TinyPNG o Squoosh antes de subir

### Videos

- **Formato:** MP4 (H.264)
- **Resolución:** 1280x720 (720p)
- **FPS:** 30fps
- **Duración:** 30 segundos - 2 minutos
- **Tamaño máximo:** 10MB por video
- **Bitrate:** 2-4 Mbps
- **Audio:** Opcional (puede ser mudo)

## Placeholders Actuales

Los tutoriales actuales usan placeholders de https://placehold.co/

Cuando tengas contenido real, reemplaza las URLs en los archivos MDX:

**Antes (placeholder):**
```mdx
<ImageZoom
  src="https://placehold.co/800x450/1e40af/white?text=Captura"
  alt="Descripción"
/>
```

**Después (imagen real):**
```mdx
<ImageZoom
  src="/tutoriales/imagenes/productos/agregar-producto-formulario.jpg"
  alt="Descripción"
/>
```

## Workflow de Creación

1. **Captura screenshots** de las funcionalidades
2. **Optimiza las imágenes** (comprimir, recortar, anotar)
3. **Graba videos** cortos demostrando procesos
4. **Comprime videos** para reducir tamaño
5. **Sube archivos** a las carpetas correspondientes
6. **Actualiza archivos MDX** con las rutas correctas

## Herramientas Recomendadas

**Capturas:**
- Windows: Snipping Tool, Greenshot, ShareX
- Browser: Awesome Screenshot (extensión Chrome)

**Edición de Imágenes:**
- GIMP (gratis)
- Photoshop
- Figma (para anotaciones)

**Grabación de Video:**
- OBS Studio (gratis y potente)
- Loom (fácil de usar)
- ScreenToGif (para GIFs)

**Compresión:**
- Imágenes: TinyPNG, Squoosh
- Videos: HandBrake

## Notas Importantes

- Anonimiza datos sensibles en screenshots
- Usa datos de ejemplo realistas pero ficticios
- Mantén consistencia visual (mismo tema, mismo idioma)
- Asegúrate de tener buena iluminación en videos
- Añade subtítulos o texto overlay en videos si es posible
