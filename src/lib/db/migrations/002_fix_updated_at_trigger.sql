-- Fix trigger that references wrong column name (updated_at vs updatedAt)
-- This trigger was probably auto-created and references snake_case columns

-- Drop the problematic trigger from all tables that might have it
DROP TRIGGER IF EXISTS update_product_updated_at ON product;
DROP TRIGGER IF EXISTS update_updated_at_column ON product;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate with correct column name
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to product table
CREATE TRIGGER update_product_updated_at
    BEFORE UPDATE ON product
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Check if other tables need the same fix (tables with updatedAt column)
-- Common tables that might have this issue:
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updatedAt' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', tbl.table_name, tbl.table_name);
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_column ON %I', tbl.table_name);
        EXECUTE format('
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        ', tbl.table_name, tbl.table_name);
    END LOOP;
END $$;
