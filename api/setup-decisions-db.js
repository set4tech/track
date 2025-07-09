import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  // Allow both GET and POST for setup
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This endpoint is deprecated - use migrations instead
    // Run: npm run db:migrate
    return res.status(200).json({ 
      message: 'Database setup is now handled by migrations.',
      instructions: 'Run npm run db:migrate to set up the database'
    });
    
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
        created_at TIMESTAMP DEFAULT NOW(),
        slack_team_id VARCHAR(255),
        slack_channel_id VARCHAR(255),
        slack_user_id VARCHAR(255)
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_decisions_thread ON decisions(thread_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_confirmation ON decisions(confirmation_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_slack_team ON decisions(slack_team_id)`;
    
    await sql`
      CREATE TABLE IF NOT EXISTS slack_installations (
        id SERIAL PRIMARY KEY,
        team_id VARCHAR(255) UNIQUE NOT NULL,
        team_name VARCHAR(255),
        bot_token VARCHAR(255) NOT NULL,
        bot_user_id VARCHAR(255),
        installed_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    res.status(200).json({ message: 'Enhanced decisions table created successfully' });
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ error: error.message });
  }
}
