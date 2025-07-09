-- Users table for storing authenticated accounts
CREATE TABLE users (
    id serial PRIMARY KEY,
    provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
    provider_id text UNIQUE NOT NULL,
    email text UNIQUE,
    name text,
    picture text,
    created_at timestamp DEFAULT now(),
    last_login timestamp DEFAULT now(),
    UNIQUE(provider, provider_id)
);

-- Link existing decisions to users (optional, backward compatible)
ALTER TABLE decisions 
ADD COLUMN user_id integer REFERENCES users(id),
ADD COLUMN created_by_email text;

-- Index for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider_id ON users(provider_id);
CREATE INDEX idx_decisions_user_id ON decisions(user_id);

-- Session tracking for security auditing (optional)
CREATE TABLE user_sessions (
    id serial PRIMARY KEY,
    user_id integer REFERENCES users(id) NOT NULL,
    token_jti text UNIQUE NOT NULL,
    created_at timestamp DEFAULT now(),
    expires_at timestamp NOT NULL,
    ip_address inet,
    user_agent text
);