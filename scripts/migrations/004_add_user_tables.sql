-- Users table for storing authenticated accounts
CREATE TABLE users (
    id serial PRIMARY KEY,
    provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
    provider_id text NOT NULL,
    email text NOT NULL,
    name text,
    picture text,
    created_at timestamp DEFAULT now(),
    last_login timestamp DEFAULT now(),
    UNIQUE(provider, provider_id)
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- User sessions table (optional - for tracking active sessions)
CREATE TABLE user_sessions (
    id serial PRIMARY KEY,
    user_id integer REFERENCES users(id) ON DELETE CASCADE,
    jti text NOT NULL UNIQUE,
    expires_at timestamp NOT NULL,
    created_at timestamp DEFAULT now()
);

-- Add user_id column to decisions table to link decisions to users
ALTER TABLE decisions ADD COLUMN user_id integer REFERENCES users(id);

-- Add created_by_email to track the email address that created the decision
ALTER TABLE decisions ADD COLUMN created_by_email text;

-- Create index on user_id for faster user-specific queries
CREATE INDEX idx_decisions_user_id ON decisions(user_id);
CREATE INDEX idx_decisions_created_by_email ON decisions(created_by_email);