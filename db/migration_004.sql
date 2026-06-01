-- GlobalBridge migration 004 — user uploaded documents
-- Idempotent. Run after schema.sql + migration_002.sql + migration_003.sql.

CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(30) NOT NULL,          -- verification | document
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  original_name VARCHAR(255),
  mime VARCHAR(100),
  size_bytes INT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id, created_at DESC);
