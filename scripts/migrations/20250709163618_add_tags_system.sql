-- Add tags/filters system for decisions
-- This allows categorizing decisions by themes/topics and filtering in the UI

-- Create tags table to store unique tags
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create junction table for many-to-many relationship between decisions and tags
CREATE TABLE IF NOT EXISTS decision_tags (
  id SERIAL PRIMARY KEY,
  decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(decision_id, tag_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_decision_tags_decision ON decision_tags(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_tags_tag ON decision_tags(tag_id);

-- Add trigger to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tag usage count
DROP TRIGGER IF EXISTS update_tag_usage_on_decision_tag ON decision_tags;
CREATE TRIGGER update_tag_usage_on_decision_tag
AFTER INSERT OR DELETE ON decision_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_count();

-- Add update trigger for tags updated_at
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();