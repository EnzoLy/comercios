# Múltiples Códigos de Barras y Productos por Peso

## Resumen de Implementación

Se han agregado dos funcionalidades importantes al sistema de gestión de productos:

1. **Múltiples códigos de barras por producto**
2. **Soporte para productos por peso** (frutas, verduras, carnes, etc.)

---

## 1. Múltiples Códigos de Barras

### Problema
Anteriormente, un producto solo podía tener un código de barras. Esto era problemático cuando:
- El mismo producto tiene códigos de diferentes proveedores
- Diferentes presentaciones tienen códigos distintos
- Productos reempaquetados necesitan su propio código

### Solución
Se creó una nueva tabla `product_barcode` que permite:
- **Código principal**: Almacenado en `product.barcode` (retrocompatibilidad)
- **Códigos adicionales**: Almacenados en `product_barcode` (one-to-many)

### Uso

#### En el Formulario de Producto:
```
1. Código de Barras (Opcional)
   - Campo principal (como antes)
   - Botón de escáner de cámara

2. Códigos de Barras Adicionales
   - Input para agregar nuevos códigos
   - Lista de códigos agregados
   - Botón para eliminar cada código
   - Validación: No permite duplicados
```

#### En el POS:
El sistema busca productos en:
1. Código principal (`product.barcode`)
2. Códigos alternativos (`product_barcode`)

---

## 2. Productos por Peso

### Problema
Los productos que se venden por peso (frutas, verduras, carnes) tienen un comportamiento especial:
- No tienen un código de barras fijo
- El código se genera dinámicamente al pesar
- El código incluye el peso/precio en sí mismo
- Usan prefijos especiales (20-29)

### Solución
Se implementó soporte completo para productos por peso:

#### Campos Nuevos en Product:
- `isWeighedProduct`: Boolean - Indica si es producto por peso
- `weightUnit`: String - Unidad de medida (kg, g, lb, oz)

#### Funciones Helper (`src/lib/utils/barcode.ts`):

```typescript
// Verificar si un código es de producto por peso
isWeighedProductBarcode(barcode: string): boolean

// Decodificar código de barras de producto por peso
decodeWeighedProductBarcode(barcode: string, unitPrice: number): WeighedProductInfo

// Generar código de barras para producto por peso
generateWeighedProductBarcode(productCode: string, weight: number): string
```

### Flujo en POS con Productos por Peso:

```
1. Cliente pesa manzanas en báscula
2. Báscula imprime código: 2000001234567
   - 20 = Prefijo (producto por peso)
   - 00001 = Código de producto (Manzanas)
   - 23456 = Peso/Precio
   - 7 = Checksum

3. Cajero escanea código en POS

4. Sistema detecta prefijo 20-29

5. Decodifica código:
   - Extrae código base: 00001
   - Extrae peso/precio: 23456

6. Busca producto por código base

7. Calcula precio final:
   - Si es peso: peso × precioPorUnidad
   - Si es precio: usa precio del código

8. Agrega al carrito con peso calculado
```

---

## Estructura de Base de Datos

### Tabla `product_barcode`:

```sql
CREATE TABLE product_barcode (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  barcode VARCHAR(100) NOT NULL UNIQUE,
  is_weight_based BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
```

### Campos agregados en `product`:

```sql
ALTER TABLE product ADD COLUMN is_weighed_product BOOLEAN DEFAULT FALSE;
ALTER TABLE product ADD COLUMN weight_unit VARCHAR(20);
```

---

## Validaciones

### Schema de Producto (`product.schema.ts`):
```typescript
{
  ...
  isWeighedProduct: boolean,
  weightUnit?: string, // 'kg' | 'g' | 'lb' | 'oz'
  additionalBarcodes: string[], // Array de códigos alternativos
}
```

### Reglas:
- Los códigos de barras deben ser únicos (incluso los adicionales)
- `weightUnit` es obligatorio si `isWeighedProduct = true`
- No se puede agregar el mismo código dos veces

---

## Ejemplos de Uso

### Crear Producto por Peso:

```typescript
POST /api/stores/{storeId}/products

{
  "name": "Manzanas Rojas",
  "sku": "MANZ-001",
  "barcode": "2000001", // Código base para productos por peso
  "sellingPrice": 3500,
  "costPrice": 2000,
  "isWeighedProduct": true,
  "weightUnit": "kg",
  "additionalBarcodes": ["7804567890123", "7504567890123"]
}
```

### Buscar Producto (POS):

```typescript
// El sistema busca en ambos lugares
GET /api/stores/{storeId}/products/barcode/{barcode}

// Si barcode = "7804567890123":
// 1. Busca en product.barcode → No encontrado
// 2. Busca en product_barcode → Encontrado
// 3. Retorna el producto
```

---

## Migración de Base de Datos

Ejecutar el archivo SQL:
```bash
migrations/add-weighed-products-and-multiple-barcodes.sql
```

O manualmente:
```sql
-- Crear tabla de códigos de barras
CREATE TABLE product_barcode (...);

-- Agregar campos a productos
ALTER TABLE product ADD COLUMN is_weighed_product BOOLEAN DEFAULT FALSE;
ALTER TABLE product ADD COLUMN weight_unit VARCHAR(20);

-- Eliminar restricción única en barcode
ALTER TABLE product DROP CONSTRAINT uq_product_store_barcode;
```

---

## Notas Importantes

### Prefijos 20-29:
- **20-29**: Indican productos por peso
- **No identifican un producto único**
- **Incluyen precio o peso en el código**
- El código se genera en tiempo real (balanza/terminal)

### Compatibilidad:
- ✅ Productos existentes siguen funcionando
- ✅ Campo `barcode` principal sigue existiendo
- ✅ Solo usa códigos adicionales si los agregas
- ✅ Productos por peso son opcionales

### Seguridad:
- ✅ Validación de duplicados
- ✅ Transacciones atómicas
- ✅ Permisos de ADMIN/MANAGER requeridos

---

## Próximos Pasos (Opcionales)

1. **Reportes**: Agregar reporte de ventas de productos por peso
2. **Inventario**: Manejar stock differently para productos por peso
3. **Balanzas**: Integración directa con balanzas electrónicas
4. **Etiquetas**: Generador de etiquetas con códigos de barras
5. **Histórico**: Registro de cambios de códigos de barras

---

## Archivos Modificados/Creados

### Nuevos:
- `src/lib/db/entities/product-barcode.entity.ts`
- `src/lib/utils/barcode.ts`
- `migrations/add-weighed-products-and-multiple-barcodes.sql`

### Modificados:
- `src/lib/db/entities/product.entity.ts`
- `src/lib/validations/product.schema.ts`
- `src/components/products/product-form.tsx`
- `src/app/api/stores/[storeId]/products/route.ts`

---

## Testing

### Casos de prueba:

1. ✅ Crear producto con múltiples códigos
2. ✅ Escanear producto desde POS con código alternativo
3. ✅ Crear producto por peso
4. ✅ Decodificar código de barras de producto por peso
5. ✅ Calcular precio correcto según peso
6. ✅ Validar que no se dupliquen códigos
7. ✅ Eliminar código adicional
8. ✅ Editar producto por peso

---

## Soporte

Para problemas o preguntas:
- Revisar `src/lib/utils/barcode.ts` para lógica de decodificación
- Revisar migración SQL para estructura de base de datos
- Verificar logs del servidor para errores de validación
