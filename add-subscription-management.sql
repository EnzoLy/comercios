-- Migration: Add Subscription Management System
-- Date: 2026-02-12
-- Description: Adds subscription tracking fields to Store and creates SubscriptionPayment table

-- ============================================
-- PART 1: Extend Store table with subscription fields
-- ============================================

-- Add subscription columns to store table
ALTER TABLE store
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS subscription_period_type VARCHAR(20) DEFAULT 'MONTHLY';

-- Create indexes for subscription fields
CREATE INDEX IF NOT EXISTS idx_store_subscription_status ON store(subscription_status);
CREATE INDEX IF NOT EXISTS idx_store_subscription_end_date ON store(subscription_end_date);

-- Set default values for existing stores (90 days trial from today)
UPDATE store
SET
  subscription_status = 'ACTIVE',
  subscription_start_date = CURRENT_TIMESTAMP,
  subscription_end_date = CURRENT_TIMESTAMP + INTERVAL '90 days',
  is_permanent = FALSE,
  subscription_period_type = 'MONTHLY'
WHERE subscription_start_date IS NULL;

-- ============================================
-- PART 2: Create SubscriptionPayment table
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_number VARCHAR(255),
  payment_date DATE NOT NULL,
  duration_months INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  recorded_by_user_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Foreign keys
  CONSTRAINT fk_subscription_payment_store
    FOREIGN KEY (store_id)
    REFERENCES store(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_subscription_payment_user
    FOREIGN KEY (recorded_by_user_id)
    REFERENCES "user"(id)
    ON DELETE RESTRICT,

  -- Constraints
  CONSTRAINT chk_subscription_payment_amount_positive
    CHECK (amount > 0),

  CONSTRAINT chk_subscription_payment_duration_positive
    CHECK (duration_months > 0),

  CONSTRAINT chk_subscription_payment_method
    CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER'))
);

-- Create indexes for subscription_payment
CREATE INDEX IF NOT EXISTS idx_subscription_payment_store ON subscription_payment(store_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payment_date ON subscription_payment(payment_date);
CREATE INDEX IF NOT EXISTS idx_subscription_payment_recorded_by ON subscription_payment(recorded_by_user_id);

-- ============================================
-- PART 3: Add trigger to update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_subscription_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_payment_timestamp
BEFORE UPDATE ON subscription_payment
FOR EACH ROW
EXECUTE FUNCTION update_subscription_payment_updated_at();

-- ============================================
-- PART 4: Verification queries
-- ============================================

-- Verify store subscription columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'store'
  AND column_name LIKE '%subscription%' OR column_name = 'is_permanent'
ORDER BY ordinal_position;

-- Verify subscription_payment table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_payment'
ORDER BY ordinal_position;

-- Count stores with trial subscriptions
SELECT
  COUNT(*) as total_stores,
  COUNT(CASE WHEN subscription_status = 'ACTIVE' THEN 1 END) as active,
  COUNT(CASE WHEN is_permanent = TRUE THEN 1 END) as permanent
FROM store;
