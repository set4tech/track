import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Allow both GET and POST for setup
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Drop the old table if it exists to avoid schema conflicts
    await sql`DROP TABLE IF EXISTS decisions`;
    
    await sql`
      CREATE TABLE decisions (
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_decisions_thread ON decisions(thread_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_confirmation ON decisions(confirmation_token)`;
    
    res.status(200).json({ message: 'Enhanced decisions table created successfully' });
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ error: error.message });
  }
}
