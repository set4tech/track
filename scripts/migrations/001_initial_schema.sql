-- Initial schema migration
-- Creates the base tables for the Track application

-- Create decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  summary TEXT NOT NULL,
  decision_maker VARCHAR(255),
  witnesses TEXT[],
  decision_date DATE,
  scheduled_review_date DATE,
  remind_on DATE,
  priority VARCHAR(50),
  tags TEXT[],
  impact_scope VARCHAR(50),
  affected_systems TEXT[],
  rollback_plan TEXT,
  success_metrics TEXT,
  communication_plan TEXT,
  notes TEXT,
  slack_channel_id VARCHAR(255),
  slack_message_ts VARCHAR(255),
  created_by_slack_user_id VARCHAR(255)
);

-- Create indexes for better query performance
CREATE INDEX idx_decisions_team_id ON decisions(team_id);
CREATE INDEX idx_decisions_created_at ON decisions(created_at);
CREATE INDEX idx_decisions_decision_date ON decisions(decision_date);
CREATE INDEX idx_decisions_scheduled_review_date ON decisions(scheduled_review_date);
CREATE INDEX idx_decisions_remind_on ON decisions(remind_on);
CREATE INDEX idx_decisions_priority ON decisions(priority);

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
CREATE INDEX idx_slack_installations_team_id ON slack_installations(team_id);

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_installations_updated_at BEFORE UPDATE ON slack_installations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();