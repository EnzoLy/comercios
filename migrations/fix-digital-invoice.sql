-- Fix Digital Invoice Table
-- Run this in Supabase SQL Editor if you get column errors

-- Drop existing table if it has issues
DROP TABLE IF EXISTS digital_invoice CASCADE;

-- Recreate table with correct structure (snake_case for PostgreSQL)
CREATE TABLE digital_invoice (
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
  CONSTRAINT fk_digital_invoice_sale FOREIGN KEY (sale_id) REFERENCES sale(id) ON DELETE CASCADE,
  CONSTRAINT fk_digital_invoice_store FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX idx_digital_invoice_access_token ON digital_invoice(access_token);
CREATE UNIQUE INDEX idx_digital_invoice_sale ON digital_invoice(sale_id);
CREATE INDEX idx_digital_invoice_store ON digital_invoice(store_id);
CREATE INDEX idx_digital_invoice_created ON digital_invoice(created_at DESC);

-- Add comments
COMMENT ON TABLE digital_invoice IS 'Facturas digitales públicas para clientes';
COMMENT ON COLUMN digital_invoice.access_token IS 'Token público para acceso sin autenticación';

-- Success
SELECT 'Digital Invoice table fixed successfully!' as message;
