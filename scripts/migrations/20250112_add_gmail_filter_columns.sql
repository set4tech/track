-- Add columns for Gmail filter configuration
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gmail_filter_configured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gmail_filter_id VARCHAR(255);

-- Drop the gmail_sync_enabled column as we're no longer syncing
ALTER TABLE users
DROP COLUMN IF EXISTS gmail_sync_enabled;