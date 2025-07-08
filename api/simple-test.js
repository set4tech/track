import { sql } from '../lib/database.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, subject, text } = req.body;
    
    // Generate IDs
    const messageId = crypto.randomBytes(16).toString('hex');
    const confirmToken = crypto.randomBytes(32).toString('hex');
    
    // Store decision directly as confirmed (skip OpenAI and email)
    await sql`
      INSERT INTO decisions (
        message_id, thread_id, decision_summary, decision_maker, witnesses,
        decision_date, topic, parameters, priority, decision_type,
        status, deadline, impact_scope, raw_thread, parsed_context,
        confirmation_token, confirmed_at
      ) VALUES (
        ${messageId}, ${messageId}, ${text.substring(0, 200)}, 
        ${from}, ARRAY[]::text[],
        ${new Date()}, ${subject || 'Test Decision'}, 
        ${'{}'}::jsonb, ${'medium'}, 
        ${'strategic'}, 'confirmed', ${null}, 
        ${'team'}, ${text}, ${'{}'}::jsonb,
        ${confirmToken}, ${new Date()}
      )
    `;
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Decision stored directly as confirmed',
      decision_id: messageId
    });
    
  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
