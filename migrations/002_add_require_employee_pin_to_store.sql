-- Add requireEmployeePin field to store table
ALTER TABLE store ADD COLUMN IF NOT EXISTS "requireEmployeePin" boolean NOT NULL DEFAULT true;

-- Add comment to explain the field
COMMENT ON COLUMN store."requireEmployeePin" IS 'Whether employees need to enter a PIN to access the POS';
