-- ============================================
-- Migración: Productos por Peso y Múltiples Códigos de Barras
-- ============================================

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
CREATE INDEX IF NOT EXISTS idx_product_barcode_product_id ON product_barcode("productId");
CREATE INDEX IF NOT EXISTS idx_product_barcode_barcode ON product_barcode(barcode);

-- 2. Agregar campos a la tabla product para productos por peso
ALTER TABLE product
ADD COLUMN IF NOT EXISTS "isWeighedProduct" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "weightUnit" VARCHAR(20);

-- 3. Eliminar la restricción única en ("storeId", "barcode")
-- Los productos ahora pueden tener múltiples códigos de barras
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_product_store_barcode'
  ) THEN
    ALTER TABLE product
    DROP CONSTRAINT uq_product_store_barcode;
  END IF;
END $$;

-- 4. Crear índice regular en ("storeId", "barcode") para búsquedas
CREATE INDEX IF NOT EXISTS idx_product_store_barcode ON product("storeId", "barcode");

-- ============================================
-- Comentarios explicativos
-- ============================================

COMMENT ON TABLE product_barcode IS 'Almacena códigos de barras adicionales para productos';
COMMENT ON COLUMN product_barcode."isWeightBased" IS 'TRUE si el código incluye peso/precio (prefijos 20-29)';
COMMENT ON COLUMN product_barcode."isPrimary" IS 'TRUE si este es el código principal del producto';
COMMENT ON COLUMN product."isWeighedProduct" IS 'TRUE si el producto se vende por peso (frutas, verduras, carnes, etc.)';
COMMENT ON COLUMN product."weightUnit" IS 'Unidad de medida para productos por peso: kg, g, lb, oz';

-- ============================================
-- Datos de ejemplo (opcional - comentar en producción)
-- ============================================

-- Ejemplo: Producto por peso (Manzanas)
-- INSERT INTO product ("storeId", name, sku, barcode, "costPrice", "sellingPrice", "currentStock", "isWeighedProduct", "weightUnit") VALUES
-- ('store-uuid', 'Manzanas Rojas', 'MANZ-001', '2000001', 2000, 3500, 100, TRUE, 'kg');

-- Ejemplo: Código de barras adicional para un producto
-- INSERT INTO product_barcode ("productId", barcode, "isPrimary") VALUES
-- ('product-uuid', '7804567890123', FALSE);

-- ============================================
-- Notas importantes
-- ============================================

/*
PREFIJOS PARA PRODUCTOS POR PESO (20-29):

- 20: Producto por peso (estándar)
- 21: Producto por peso (alternativo)
- 22: Producto con precio incluido
- 23: Producto con peso incluido
- 24-27: Reservado para uso futuro
- 28: Producto por peso local
- 29: Producto por peso privado

ESTRUCTURA DE CÓDIGO DE BARRAS PARA PRODUCTOS POR PESO (EAN-13):

Posiciones  Descripción
0-1         Prefijo (20-29)
2-6         Código del producto (5 dígitos)
7-11        Precio o peso (4-5 dígitos)
12          Dígito de verificación

Ejemplo: 2000001234567
20 = Prefijo (producto por peso)
00001 = Código del producto (Manzanas)
23456 = Peso/Precio (ej: 234.56g o $2.34)
7 = Checksum

USO EN POS:

1. Escanear código de barras
2. Verificar prefijo (20-29)
3. Extraer código base del producto (posiciones 2-6)
4. Extraer peso/precio (posiciones 7-11)
5. Buscar producto por código base o barcode principal
6. Calcular precio final según peso y precio por unidad

*/
