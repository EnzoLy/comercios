-- ============================================================================
-- Services Feature Migration
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Create service_category table
CREATE TABLE IF NOT EXISTS service_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(store_id, name),
  FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_category_store_id ON service_category(store_id);

-- ============================================================================

-- 2. Create service table
CREATE TABLE IF NOT EXISTS service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INT NOT NULL,
  category_id UUID,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES service_category(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_service_store_id ON service(store_id);
CREATE INDEX IF NOT EXISTS idx_service_store_id_name ON service(store_id, name);
CREATE INDEX IF NOT EXISTS idx_service_category_id ON service(category_id);

-- ============================================================================

-- 3. Create service_appointment table
CREATE TABLE IF NOT EXISTS service_appointment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  service_id UUID NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20),
  client_email VARCHAR(255),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE RESTRICT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_service_appointment_store_id ON service_appointment(store_id);
CREATE INDEX IF NOT EXISTS idx_service_appointment_store_id_scheduled_at ON service_appointment(store_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_service_appointment_service_id ON service_appointment(service_id);
CREATE INDEX IF NOT EXISTS idx_service_appointment_status ON service_appointment(status);

-- ============================================================================

-- 4. Modify sale_item table to support services
-- Make product_id nullable and add service_id column

ALTER TABLE sale_item
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE sale_item
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES service(id) ON DELETE RESTRICT;

-- Add constraint to ensure either product_id or service_id is set (but not both)
-- This is enforced at the application level, but we can add a check constraint
ALTER TABLE sale_item
  ADD CONSTRAINT check_product_or_service
  CHECK (
    (product_id IS NOT NULL AND service_id IS NULL) OR
    (product_id IS NULL AND service_id IS NOT NULL)
  );

-- Create index for service_id lookups
CREATE INDEX IF NOT EXISTS idx_sale_item_service_id ON sale_item(service_id);

-- ============================================================================

-- 5. Enable RLS (Row Level Security) if needed
-- Uncomment if you use RLS

-- ALTER TABLE service_category ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE service ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE service_appointment ENABLE ROW LEVEL SECURITY;

-- ============================================================================

-- Summary of Changes:
-- ✅ Created service_category table with unique name per store
-- ✅ Created service table with price, duration, category, image, active status
-- ✅ Created service_appointment table with client info and status tracking
-- ✅ Modified sale_item to support both product_id and service_id (mutually exclusive)
-- ✅ Added all necessary indexes for performance
-- ✅ Added constraints to maintain data integrity

-- Note: All timestamps use TIMESTAMP WITH TIME ZONE for proper Supabase integration
