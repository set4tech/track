import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS decisions (
        id SERIAL PRIMARY KEY,
        decision_text TEXT NOT NULL,
        context TEXT,
        sender_email VARCHAR(255),
        thread_subject VARCHAR(500),
        original_email_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    res.status(200).json({ message: 'Database setup complete' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}