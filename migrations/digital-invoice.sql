-- Digital Invoice Migration
-- Run this in Supabase SQL Editor

-- Create DigitalInvoice table (snake_case for PostgreSQL)
CREATE TABLE IF NOT EXISTS digital_invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL UNIQUE,
  store_id UUID NOT NULL,
  access_token VARCHAR(64) NOT NULL UNIQUE,
  invoice_number VARCHAR(50),
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (sale_id) REFERENCES sale(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "idx_digital_invoice_access_token" ON digital_invoice("accessToken");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_digital_invoice_sale" ON digital_invoice("saleId");
CREATE INDEX IF NOT EXISTS "idx_digital_invoice_store" ON digital_invoice("storeId");
CREATE INDEX IF NOT EXISTS "idx_digital_invoice_created" ON digital_invoice("createdAt" DESC);

-- Add comment
COMMENT ON TABLE digital_invoice IS 'Facturas digitales públicas para clientes';
COMMENT ON COLUMN digital_invoice."accessToken" IS 'Token público para acceso sin autenticación';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Digital Invoice table created successfully!';
END $$;
