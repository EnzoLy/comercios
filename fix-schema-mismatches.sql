-- =====================================================
-- Fix Schema Mismatches
-- =====================================================

-- 1. Add missing columns to sale table
ALTER TABLE sale
ADD COLUMN IF NOT EXISTS "customerName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "customerEmail" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "customerPhone" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP WITH TIME ZONE;

-- 2. Add missing columns to product table
ALTER TABLE product
ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "trackStock" BOOLEAN NOT NULL DEFAULT TRUE;

-- 2b. Add missing columns to supplier table
ALTER TABLE supplier
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS "zipCode" VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Fix stock_movement table
-- Drop columns that don't match entity
ALTER TABLE stock_movement
DROP COLUMN IF EXISTS "storeId",
DROP COLUMN IF EXISTS "previousStock",
DROP COLUMN IF EXISTS "newStock";

-- Rename unitCost to unitPrice
ALTER TABLE stock_movement
RENAME COLUMN "unitCost" TO "unitPrice";

-- Rename referenceNumber to reference
ALTER TABLE stock_movement
RENAME COLUMN "referenceNumber" TO reference;

-- Make userId nullable (entity has it as optional)
ALTER TABLE stock_movement
ALTER COLUMN "userId" DROP NOT NULL;

SELECT 'Schema fixes applied successfully' AS status;
