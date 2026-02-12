-- ============================================================================
-- Migration: Add Expiration Date Tracking System
-- Description: Sistema de seguimiento de vencimientos para productos perecederos
-- Date: 2026-02-12
-- ============================================================================

-- 1. Agregar columna trackExpirationDates a la tabla product
-- Los productos existentes tendrán trackExpirationDates = false por defecto
ALTER TABLE product
ADD COLUMN "trackExpirationDates" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN product."trackExpirationDates" IS 'Indica si el producto requiere seguimiento de fechas de vencimiento (productos perecederos)';

-- ============================================================================
-- 2. Crear tabla product_batch (lotes de productos con fechas de vencimiento)
-- ============================================================================

CREATE TABLE product_batch (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productId" uuid NOT NULL,
    "batchNumber" varchar(100),
    "expirationDate" timestamp NOT NULL,
    "initialQuantity" integer NOT NULL,
    "currentQuantity" integer NOT NULL,
    "unitCost" decimal(10,2) NOT NULL,
    "purchaseOrderId" uuid,
    "purchaseOrderItemId" uuid,
    "isExpired" boolean NOT NULL DEFAULT false,
    "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_batch_product
        FOREIGN KEY ("productId")
        REFERENCES product(id)
        ON DELETE CASCADE
);

-- Índices para optimizar queries FEFO
CREATE INDEX idx_product_batch_product_id ON product_batch("productId");
CREATE INDEX idx_product_batch_product_expiration ON product_batch("productId", "expirationDate");
CREATE INDEX idx_product_batch_product_quantity ON product_batch("productId", "currentQuantity");

COMMENT ON TABLE product_batch IS 'Lotes de productos con fechas de vencimiento para control FEFO';
COMMENT ON COLUMN product_batch."batchNumber" IS 'Número de lote (opcional)';
COMMENT ON COLUMN product_batch."expirationDate" IS 'Fecha de vencimiento del lote';
COMMENT ON COLUMN product_batch."initialQuantity" IS 'Cantidad inicial del lote';
COMMENT ON COLUMN product_batch."currentQuantity" IS 'Cantidad disponible actual del lote';
COMMENT ON COLUMN product_batch."isExpired" IS 'Flag computado para filtros rápidos de lotes vencidos';

-- ============================================================================
-- 3. Crear tabla batch_stock_movement (movimientos a nivel de lote)
-- ============================================================================

CREATE TABLE batch_stock_movement (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "batchId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "stockMovementId" uuid,
    type varchar(50) NOT NULL CHECK (type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE')),
    quantity integer NOT NULL,
    "unitPrice" decimal(10,2),
    "saleId" uuid,
    "userId" uuid,
    notes text,
    "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_batch_movement_batch
        FOREIGN KEY ("batchId")
        REFERENCES product_batch(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_batch_movement_product
        FOREIGN KEY ("productId")
        REFERENCES product(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_batch_movement_stock_movement
        FOREIGN KEY ("stockMovementId")
        REFERENCES stock_movement(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_batch_movement_sale
        FOREIGN KEY ("saleId")
        REFERENCES sale(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_batch_movement_user
        FOREIGN KEY ("userId")
        REFERENCES "user"(id)
        ON DELETE SET NULL
);

-- Índices para auditoría y reportes
CREATE INDEX idx_batch_movement_batch_id ON batch_stock_movement("batchId");
CREATE INDEX idx_batch_movement_batch_created ON batch_stock_movement("batchId", "createdAt");
CREATE INDEX idx_batch_movement_product_created ON batch_stock_movement("productId", "createdAt");

COMMENT ON TABLE batch_stock_movement IS 'Rastreo de movimientos de inventario a nivel de lote individual';
COMMENT ON COLUMN batch_stock_movement.type IS 'Tipo de movimiento: PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE';
COMMENT ON COLUMN batch_stock_movement.quantity IS 'Cantidad movida (positiva para entrada, negativa para salida)';

-- ============================================================================
-- 4. Trigger para actualizar isExpired automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_batch_expired_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW."isExpired" := (NEW."expirationDate" < CURRENT_TIMESTAMP);
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_expired
    BEFORE INSERT OR UPDATE ON product_batch
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_expired_status();

COMMENT ON FUNCTION update_batch_expired_status() IS 'Actualiza automáticamente el flag isExpired basado en la fecha de vencimiento';

-- ============================================================================
-- 5. Función helper para obtener productos por vencer (opcional, para reportes)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_expiring_batches(
    p_store_id uuid,
    p_days_threshold integer DEFAULT 30
)
RETURNS TABLE (
    product_id uuid,
    product_name varchar,
    batch_id uuid,
    batch_number varchar,
    expiration_date timestamp,
    current_quantity integer,
    days_until_expiration integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        pb.id,
        pb."batchNumber",
        pb."expirationDate",
        pb."currentQuantity",
        EXTRACT(DAY FROM (pb."expirationDate" - CURRENT_TIMESTAMP))::integer
    FROM product_batch pb
    INNER JOIN product p ON pb."productId" = p.id
    WHERE
        p."storeId" = p_store_id
        AND p."trackExpirationDates" = true
        AND pb."currentQuantity" > 0
        AND pb."expirationDate" <= (CURRENT_TIMESTAMP + (p_days_threshold || ' days')::interval)
    ORDER BY pb."expirationDate" ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_expiring_batches IS 'Obtiene lotes que vencen dentro de X días para un store específico';

-- ============================================================================
-- 6. Verificación final
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name IN ('product_batch', 'batch_stock_movement')
    ) THEN
        RAISE NOTICE 'Migration completed successfully!';
        RAISE NOTICE 'Tables created: product_batch, batch_stock_movement';
        RAISE NOTICE 'Column added: product.trackExpirationDates (default: false for existing products)';
    ELSE
        RAISE EXCEPTION 'Migration failed - tables not created';
    END IF;
END $$;

-- ============================================================================
-- Notas de implementación:
-- ============================================================================
--
-- 1. PRODUCTOS EXISTENTES:
--    - Todos los productos existentes tendrán trackExpirationDates = false
--    - No se ven afectados por este cambio
--    - Pueden activarse individualmente o en lote desde la UI
--
-- 2. BACKWARD COMPATIBILITY:
--    - El sistema sigue funcionando igual para productos sin tracking
--    - Solo los productos con trackExpirationDates = true usan lotes
--
-- 3. PERFORMANCE:
--    - Índices optimizados para queries FEFO
--    - Trigger automático para flag isExpired
--    - Función helper para reportes rápidos
--
-- 4. INTEGRIDAD:
--    - Foreign keys con CASCADE en deletes de producto
--    - SET NULL en deletes de usuario/movimiento
--    - Constraints en enum de tipos de movimiento
--
-- ============================================================================
