-- Add environment tracking to decisions
-- This allows filtering decisions by which environment they were sent to

-- Add environment column
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'production';

-- Add recipient email to track which bot email was used
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);

-- Add index for environment queries
CREATE INDEX IF NOT EXISTS idx_decisions_environment ON decisions(environment);

-- Update existing records to production
UPDATE decisions 
SET environment = 'production' 
WHERE environment IS NULL;