-- Add full-text search support to decisions, gmail_messages, and gmail_bodies tables

-- 1. Add tsvector column to decisions table
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update decisions search vector
CREATE OR REPLACE FUNCTION update_decisions_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.decision_summary, '') || ' ' ||
    COALESCE(NEW.topic, '') || ' ' ||
    COALESCE(NEW.parameters::text, '') || ' ' ||
    COALESCE(NEW.parsed_context, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger for decisions
DROP TRIGGER IF EXISTS decisions_search_vector_update ON decisions;
CREATE TRIGGER decisions_search_vector_update
  BEFORE INSERT OR UPDATE OF decision_summary, topic, parameters, parsed_context
  ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_decisions_search_vector();

-- Update existing rows
UPDATE decisions SET search_vector = to_tsvector('english',
  COALESCE(decision_summary, '') || ' ' ||
  COALESCE(topic, '') || ' ' ||
  COALESCE(parameters::text, '') || ' ' ||
  COALESCE(parsed_context, '')
);

-- Create GIN index for decisions search
CREATE INDEX IF NOT EXISTS idx_decisions_search_vector ON decisions USING GIN (search_vector);

-- Add index on user_id for efficient user-scoped searches
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions (user_id);

-- 2. Add tsvector column to gmail_messages table
ALTER TABLE gmail_messages 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update gmail_messages search vector
CREATE OR REPLACE FUNCTION update_gmail_messages_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.subject, '') || ' ' ||
    COALESCE(NEW.snippet, '') || ' ' ||
    COALESCE(NEW.from_email, '') || ' ' ||
    COALESCE(NEW.from_name, '') || ' ' ||
    COALESCE(array_to_string(NEW.to_emails, ' ', ''), '') || ' ' ||
    COALESCE(array_to_string(NEW.cc_emails, ' ', ''), '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger for gmail_messages
DROP TRIGGER IF EXISTS gmail_messages_search_vector_update ON gmail_messages;
CREATE TRIGGER gmail_messages_search_vector_update
  BEFORE INSERT OR UPDATE OF subject, snippet, from_email, from_name, to_emails, cc_emails
  ON gmail_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_messages_search_vector();

-- Update existing rows
UPDATE gmail_messages SET search_vector = to_tsvector('english',
  COALESCE(subject, '') || ' ' ||
  COALESCE(snippet, '') || ' ' ||
  COALESCE(from_email, '') || ' ' ||
  COALESCE(from_name, '') || ' ' ||
  COALESCE(array_to_string(to_emails, ' ', ''), '') || ' ' ||
  COALESCE(array_to_string(cc_emails, ' ', ''), '')
);

-- Create GIN index for gmail_messages search
CREATE INDEX IF NOT EXISTS idx_gmail_messages_search_vector ON gmail_messages USING GIN (search_vector);

-- 3. Add tsvector column to gmail_bodies table
ALTER TABLE gmail_bodies 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update gmail_bodies search vector
CREATE OR REPLACE FUNCTION update_gmail_bodies_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.body_text, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger for gmail_bodies
DROP TRIGGER IF EXISTS gmail_bodies_search_vector_update ON gmail_bodies;
CREATE TRIGGER gmail_bodies_search_vector_update
  BEFORE INSERT OR UPDATE OF body_text
  ON gmail_bodies
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_bodies_search_vector();

-- Update existing rows
UPDATE gmail_bodies SET search_vector = to_tsvector('english',
  COALESCE(body_text, '')
);

-- Create GIN index for gmail_bodies search
CREATE INDEX IF NOT EXISTS idx_gmail_bodies_search_vector ON gmail_bodies USING GIN (search_vector);

-- 4. Add function to search across all tables with ranking
CREATE OR REPLACE FUNCTION search_all_content(
  p_user_id INTEGER,
  p_query TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id INTEGER,
  type TEXT,
  title TEXT,
  snippet TEXT,
  rank REAL,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH search_query AS (
    SELECT plainto_tsquery('english', p_query) AS q
  ),
  decisions_results AS (
    SELECT 
      d.id,
      'decision'::TEXT AS type,
      COALESCE(d.topic, LEFT(d.decision_summary, 100)) AS title,
      d.decision_summary AS snippet,
      ts_rank(d.search_vector, sq.q) AS rank,
      d.created_at
    FROM decisions d, search_query sq
    WHERE d.user_id = p_user_id
      AND d.search_vector @@ sq.q
  ),
  messages_results AS (
    SELECT 
      gm.id,
      'email'::TEXT AS type,
      gm.subject AS title,
      gm.snippet AS snippet,
      ts_rank(gm.search_vector, sq.q) AS rank,
      gm.created_at
    FROM gmail_messages gm, search_query sq
    WHERE gm.user_id = p_user_id
      AND gm.search_vector @@ sq.q
  ),
  bodies_results AS (
    SELECT 
      gb.user_id::INTEGER AS id,
      'email_body'::TEXT AS type,
      gm.subject AS title,
      LEFT(gb.body_text, 200) AS snippet,
      ts_rank(gb.search_vector, sq.q) AS rank,
      gb.created_at
    FROM gmail_bodies gb
    JOIN gmail_messages gm ON gb.message_id = gm.gmail_message_id AND gb.user_id = gm.user_id
    CROSS JOIN search_query sq
    WHERE gb.user_id = p_user_id
      AND gb.search_vector @@ sq.q
  )
  SELECT * FROM (
    SELECT * FROM decisions_results
    UNION ALL
    SELECT * FROM messages_results
    UNION ALL
    SELECT * FROM bodies_results
  ) AS combined_results
  ORDER BY rank DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Add indexes to support efficient keyset pagination
CREATE INDEX IF NOT EXISTS idx_decisions_rank_id ON decisions (user_id, id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_rank_id ON gmail_messages (user_id, id);
CREATE INDEX IF NOT EXISTS idx_gmail_bodies_rank_id ON gmail_bodies (user_id, message_id);