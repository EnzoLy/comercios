-- Create employment_access_token table for QR-based temporary access tokens
CREATE TABLE IF NOT EXISTS employment_access_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  employment_id UUID NOT NULL,
  created_by UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT false,
  ip_address VARCHAR(45),
  user_agent TEXT,
  allow_multiple_uses BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (employment_id) REFERENCES employment(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_access_token_token ON employment_access_token(token);
CREATE INDEX idx_access_token_employment ON employment_access_token(employment_id);
CREATE INDEX idx_access_token_expires ON employment_access_token(expires_at);
CREATE INDEX idx_access_token_revoked ON employment_access_token(is_revoked);
CREATE INDEX idx_access_token_created_by ON employment_access_token(created_by);

-- Add comment for documentation
COMMENT ON TABLE employment_access_token IS 'Temporary access tokens for employees via QR codes with configurable expiration';
