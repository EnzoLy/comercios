-- Add owner PIN field to user table
ALTER TABLE "user" ADD COLUMN owner_pin VARCHAR(255) NULLABLE;

-- Create index for efficient lookups
CREATE INDEX idx_user_owner_pin ON "user"(owner_pin) WHERE owner_pin IS NOT NULL;
