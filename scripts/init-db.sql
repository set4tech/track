-- Initialize the local development database
-- This script runs automatically when the Docker container starts for the first time

-- Create the decisions table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_decisions_thread ON decisions(thread_id);
CREATE INDEX IF NOT EXISTS idx_confirmation ON decisions(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_slack_team ON decisions(slack_team_id);

-- Create slack_installations table
CREATE TABLE IF NOT EXISTS slack_installations (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(255) UNIQUE NOT NULL,
  team_name VARCHAR(255),
  bot_token VARCHAR(255) NOT NULL,
  bot_user_id VARCHAR(255),
  installed_at TIMESTAMP DEFAULT NOW()
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO track_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO track_user;
