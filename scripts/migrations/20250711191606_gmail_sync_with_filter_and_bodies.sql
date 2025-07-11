-- Gmail sync integration with server-side filtering and encrypted token storage

-- Update users table for Gmail OAuth tokens
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gmail_refresh_token_enc BYTEA,
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT FALSE,
DROP COLUMN IF EXISTS gmail_refresh_token;

-- Create gmail_sync_state table for tracking sync progress and filters
CREATE TABLE IF NOT EXISTS gmail_sync_state (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  gmail_filter_query TEXT,
  gmail_label_ids TEXT[],
  last_sync_at TIMESTAMP WITH TIME ZONE,
  next_page_token TEXT,
  last_history_id BIGINT,
  sync_status TEXT DEFAULT 'idle',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gmail_messages table for message metadata
CREATE TABLE IF NOT EXISTS gmail_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[],
  cc_emails TEXT[],
  subject TEXT,
  snippet TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  has_body BOOLEAN DEFAULT FALSE,
  labels TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gmail_message_id)
);

-- Create gmail_bodies table for large message content
CREATE TABLE IF NOT EXISTS gmail_bodies (
  message_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_text TEXT,
  body_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gmail_decisions table for extracted decisions
CREATE TABLE IF NOT EXISTS gmail_decisions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  decision_id INTEGER REFERENCES decisions(id) ON DELETE SET NULL,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gmail_message_id)
);

-- Add indexes for performance
CREATE INDEX idx_gmail_messages_user_date ON gmail_messages(user_id, date DESC);
CREATE INDEX idx_gmail_messages_thread ON gmail_messages(user_id, gmail_thread_id);
CREATE INDEX idx_gmail_sync_state_user ON gmail_sync_state(user_id);
CREATE INDEX idx_gmail_bodies_user ON gmail_bodies(user_id);
CREATE INDEX idx_gmail_decisions_user ON gmail_decisions(user_id);

-- Add updated_at triggers
CREATE TRIGGER update_gmail_sync_state_updated_at
  BEFORE UPDATE ON gmail_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_messages_updated_at
  BEFORE UPDATE ON gmail_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();