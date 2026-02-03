-- ============================================
-- Migración: Productos por Peso y Múltiples Códigos de Barras
-- ============================================

-- Verificar primero si las columnas usan snake_case o camelCase
-- Descomentar para verificar:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'product';

-- 1. Crear tabla para códigos de barras adicionales
CREATE TABLE IF NOT EXISTS product_barcode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  barcode VARCHAR(100) NOT NULL,
  "isWeightBased" BOOLEAN DEFAULT FALSE,
  "isPrimary" BOOLEAN DEFAULT TRUE,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_product_barcode_product
    FOREIGN KEY ("productId")
    REFERENCES product(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_product_barcode_barcode
    UNIQUE(barcode)
);

-- Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_product_barcode_productId ON product_barcode("productId");
CREATE INDEX IF NOT EXISTS idx_product_barcode_barcode ON product_barcode(barcode);

-- 2. Agregar campos a la tabla product para productos por peso
ALTER TABLE product
ADD COLUMN IF NOT EXISTS "isWeighedProduct" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "weightUnit" VARCHAR(20);

-- 3. Eliminar la restricción única en (storeId, barcode)
-- Los productos ahora pueden tener múltiples códigos de barras

-- Primero verificamos el nombre exacto de la restricción
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Buscar la restricción unique en (storeId, barcode)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'product'::regclass
    AND contype = 'u'
    AND conname LIKE '%barcode%';

  -- Si existe, eliminarla
  IF FOUND THEN
    EXECUTE format('ALTER TABLE product DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Restricción eliminada: %', constraint_name;
  END IF;
END $$;

-- 4. Crear índice regular en (storeId, barcode) para búsquedas
CREATE INDEX IF NOT EXISTS idx_product_storeId_barcode ON product("storeId", barcode);

-- ============================================
-- Comentarios explicativos
-- ============================================

COMMENT ON TABLE product_barcode IS 'Almacena códigos de barras adicionales para productos';
COMMENT ON COLUMN product_barcode."isWeightBased" IS 'TRUE si el código incluye peso/precio (prefijos 20-29)';
COMMENT ON COLUMN product_barcode."isPrimary" IS 'TRUE si este es el código principal del producto';
COMMENT ON COLUMN product."isWeighedProduct" IS 'TRUE si el producto se vende por peso (frutas, verduras, carnes, etc.)';
COMMENT ON COLUMN product."weightUnit" IS 'Unidad de medida para productos por peso: kg, g, lb, oz';

-- ============================================
-- Verificación
-- ============================================

-- Verificar que la tabla se creó correctamente
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'product_barcode'
ORDER BY ordinal_position;

-- Verificar los nuevos campos en product
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'product'
  AND column_name IN ('isWeighedProduct', 'weightUnit');
