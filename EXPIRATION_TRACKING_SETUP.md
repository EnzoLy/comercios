# Sistema de Seguimiento de Vencimientos - Setup

## 📋 Pre-requisitos

- Base de datos PostgreSQL (Supabase) configurada
- Conexión activa a la base de datos
- Extensión `uuid-ossp` habilitada (Supabase la tiene por defecto)

## 🚀 Instalación

### Opción 1: Usando psql (Línea de comandos)

```bash
# Conectar a tu base de datos
psql "postgresql://[user]:[password]@[host]:6543/postgres"

# Ejecutar el archivo SQL
\i add-expiration-tracking.sql

# O en una sola línea
psql "postgresql://[user]:[password]@[host]:6543/postgres" -f add-expiration-tracking.sql
```

### Opción 2: Usando Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `add-expiration-tracking.sql`
5. Ejecuta la query

### Opción 3: Usando DBeaver u otra GUI

1. Abre tu herramienta de base de datos favorita
2. Conecta a tu base de datos
3. Abre el archivo `add-expiration-tracking.sql`
4. Ejecuta el script completo

## ✅ Verificación

Después de ejecutar la migración, verifica que todo se creó correctamente:

```sql
-- Verificar nueva columna en product
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'product' AND column_name = 'trackExpirationDates';

-- Verificar tabla product_batch
SELECT * FROM information_schema.tables WHERE table_name = 'product_batch';

-- Verificar tabla batch_stock_movement
SELECT * FROM information_schema.tables WHERE table_name = 'batch_stock_movement';

-- Verificar índices creados
SELECT indexname FROM pg_indexes WHERE tablename = 'product_batch';

-- Verificar productos existentes (todos deben tener trackExpirationDates = false)
SELECT name, sku, "trackExpirationDates" FROM product LIMIT 10;
```

## 📊 Cambios Realizados

### 1. Tabla `product`
- **Nueva columna**: `trackExpirationDates` (boolean, default: false)
- Productos existentes automáticamente tienen valor `false`

### 2. Nueva tabla `product_batch`
Campos principales:
- `id` - UUID
- `productId` - Relación con producto
- `batchNumber` - Número de lote (opcional)
- `expirationDate` - Fecha de vencimiento
- `initialQuantity` - Cantidad inicial
- `currentQuantity` - Cantidad disponible
- `unitCost` - Costo por unidad
- `isExpired` - Flag automático (trigger)

Índices optimizados:
- `idx_product_batch_product_id`
- `idx_product_batch_product_expiration` (para FEFO)
- `idx_product_batch_product_quantity`

### 3. Nueva tabla `batch_stock_movement`
Rastreo de movimientos a nivel de lote:
- Vinculado a `product_batch`
- Referencia a `stock_movement` (agregado)
- Tipos: PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE

### 4. Funciones y Triggers
- `update_batch_expired_status()` - Actualiza automáticamente `isExpired`
- `get_expiring_batches(store_id, days)` - Helper para reportes

## 🔄 Rollback (Si es necesario)

Si necesitas revertir los cambios:

```sql
-- ADVERTENCIA: Esto eliminará TODOS los lotes creados
DROP TABLE IF EXISTS batch_stock_movement CASCADE;
DROP TABLE IF EXISTS product_batch CASCADE;
DROP FUNCTION IF EXISTS update_batch_expired_status() CASCADE;
DROP FUNCTION IF EXISTS get_expiring_batches(uuid, integer) CASCADE;
ALTER TABLE product DROP COLUMN IF EXISTS "trackExpirationDates";
```

## 🎯 Siguientes Pasos

Después de ejecutar la migración:

1. **Reiniciar el servidor de desarrollo**
   ```bash
   pnpm dev
   ```

2. **Probar funcionalidad básica**
   - Crear un producto nuevo con tracking de vencimientos
   - Recibir una orden de compra con lotes
   - Verificar que los lotes se crearon en la base de datos

3. **Activar tracking en productos existentes** (opcional)
   - Ve a `/dashboard/[storeSlug]/products`
   - Selecciona productos perecederos
   - Usa el diálogo de "Bulk Expiration Toggle"
   - Crea lotes manualmente en `/dashboard/[storeSlug]/inventory/batches`

## 📝 Notas Importantes

### Productos Existentes
- **NO se ven afectados** por esta migración
- Todos tienen `trackExpirationDates = false` por defecto
- Puedes activar el tracking individualmente o en lote
- Si activas tracking en productos con stock > 0, deberás crear lotes manualmente

### Performance
- Los índices están optimizados para queries FEFO
- El trigger `isExpired` se ejecuta automáticamente
- No hay impacto en productos sin tracking

### Integridad de Datos
- Foreign keys configurados con CASCADE donde corresponde
- No se pierden datos en operaciones normales
- Los lotes se eliminan automáticamente al eliminar el producto

## 🐛 Troubleshooting

### Error: "uuid-ossp extension not found"
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "permission denied"
Asegúrate de tener permisos de superusuario o ejecuta desde Supabase Dashboard.

### Los productos no muestran el checkbox
Verifica que el servidor se haya reiniciado después de la migración.

### No aparecen lotes en la tabla
1. Verifica que `trackExpirationDates = true` en el producto
2. Asegúrate de haber recibido una orden de compra con información de lotes
3. Revisa los logs del servidor por errores

## 📞 Soporte

Si encuentras problemas:
1. Verifica que todas las tablas se crearon correctamente
2. Revisa los logs del servidor de desarrollo
3. Consulta los comentarios en el archivo SQL para detalles técnicos

---

**Versión**: 1.0
**Fecha**: 2026-02-12
**Compatible con**: PostgreSQL 12+, Supabase
