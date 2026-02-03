-- Migration: Add PIN fields to Employment table
-- Description: Add pin (hashed) and requiresPin fields for employee PIN-based authentication

ALTER TABLE "employment"
ADD COLUMN IF NOT EXISTS "pin" character varying(255),
ADD COLUMN IF NOT EXISTS "requiresPin" boolean NOT NULL DEFAULT false;

-- Set requiresPin = true for CASHIER, STOCK_KEEPER, MANAGER roles
UPDATE "employment"
SET "requiresPin" = true
WHERE "role" IN ('CASHIER', 'STOCK_KEEPER', 'MANAGER');

-- Keep requiresPin = false for ADMIN (they use traditional login)
UPDATE "employment"
SET "requiresPin" = false
WHERE "role" = 'ADMIN';

-- Add index on requiresPin for faster lookups
CREATE INDEX IF NOT EXISTS "idx_employment_requires_pin" ON "employment"("requiresPin");

-- Verify the changes
SELECT
  id,
  "userId",
  "storeId",
  role,
  "isActive",
  "requiresPin",
  "pin" IS NOT NULL as "pinConfigured"
FROM "employment"
ORDER BY "createdAt" DESC;
