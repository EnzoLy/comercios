CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID,
  store_id UUID,
  employment_id UUID,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL,
  FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,
  FOREIGN KEY (employment_id) REFERENCES employment(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_log_store_id ON audit_log(store_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
