-- Add status field to decisions table
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- Update existing records to have active status
UPDATE decisions 
SET status = 'active' 
WHERE status IS NULL;