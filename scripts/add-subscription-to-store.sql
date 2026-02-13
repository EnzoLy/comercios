-- Rename existing columns to snake_case if they exist with camelCase
-- Run this script against your Supabase database

-- Store table: rename camelCase columns to snake_case
ALTER TABLE "store" RENAME COLUMN "ownerId" TO "owner_id";
ALTER TABLE "store" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "store" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "store" RENAME COLUMN "updatedAt" TO "updated_at";

-- Add missing subscription columns
ALTER TABLE "store" 
ADD COLUMN IF NOT EXISTS "subscription_status" VARCHAR(50) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "subscription_start_date" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "subscription_end_date" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "is_permanent" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "subscription_price" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "subscription_period_type" VARCHAR(20) DEFAULT 'MONTHLY',
ADD COLUMN IF NOT EXISTS "tax_enabled" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "default_tax_rate" DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tax_name" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "require_employee_pin" BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS "idx_store_subscription_status" ON "store" ("subscription_status");
CREATE INDEX IF NOT EXISTS "idx_store_subscription_end_date" ON "store" ("subscription_end_date");

-- SubscriptionPayment table: rename camelCase to snake_case
ALTER TABLE "subscription_payment" RENAME COLUMN "storeId" TO "store_id";
ALTER TABLE "subscription_payment" RENAME COLUMN "recordedByUserId" TO "recorded_by_user_id";
ALTER TABLE "subscription_payment" RENAME COLUMN "paymentDate" TO "payment_date";
ALTER TABLE "subscription_payment" RENAME COLUMN "durationMonths" TO "duration_months";
ALTER TABLE "subscription_payment" RENAME COLUMN "periodStartDate" TO "period_start_date";
ALTER TABLE "subscription_payment" RENAME COLUMN "periodEndDate" TO "period_end_date";
ALTER TABLE "subscription_payment" RENAME COLUMN "referenceNumber" TO "reference_number";
ALTER TABLE "subscription_payment" RENAME COLUMN "paymentMethod" TO "payment_method";
ALTER TABLE "subscription_payment" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "subscription_payment" RENAME COLUMN "updatedAt" TO "updated_at";

-- Employment table: rename columns if needed
ALTER TABLE "employment" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "employment" RENAME COLUMN "storeId" TO "store_id";
ALTER TABLE "employment" RENAME COLUMN "startDate" TO "start_date";
ALTER TABLE "employment" RENAME COLUMN "endDate" TO "end_date";
ALTER TABLE "employment" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "employment" RENAME COLUMN "requiresPin" TO "requires_pin";
ALTER TABLE "employment" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "employment" RENAME COLUMN "updatedAt" TO "updated_at";
