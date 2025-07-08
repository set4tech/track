-- Initial schema migration
-- Creates the base tables for the Track application

-- Create decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  thread_id VARCHAR(255),
  decision_summary TEXT NOT NULL,
  decision_maker VARCHAR(255),
  witnesses TEXT[],
  decision_date TIMESTAMP,
  topic VARCHAR(255),
  parameters JSONB,
  priority VARCHAR(20),
  decision_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending_confirmation',
  deadline TIMESTAMP,
  impact_scope VARCHAR(50),
  raw_thread TEXT,
  parsed_context TEXT,
  confirmation_token VARCHAR(255) UNIQUE,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  slack_team_id VARCHAR(255),
  slack_channel_id VARCHAR(255),
  slack_user_id VARCHAR(255)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_decisions_thread ON decisions(thread_id);
CREATE INDEX IF NOT EXISTS idx_confirmation ON decisions(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_slack_team ON decisions(slack_team_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_decision_date ON decisions(decision_date);
CREATE INDEX IF NOT EXISTS idx_decisions_priority ON decisions(priority);

-- Create Slack installations table
CREATE TABLE IF NOT EXISTS slack_installations (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(255) UNIQUE NOT NULL,
  bot_token VARCHAR(255) NOT NULL,
  bot_user_id VARCHAR(255) NOT NULL,
  installation_data JSONB NOT NULL,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for Slack installations
CREATE INDEX IF NOT EXISTS idx_slack_installations_team_id ON slack_installations(team_id);

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_slack_installations_updated_at') THEN
    CREATE TRIGGER update_slack_installations_updated_at BEFORE UPDATE ON slack_installations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;