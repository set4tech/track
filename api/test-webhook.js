import { sql } from '../lib/database.js';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Initialize SendGrid with error handling
try {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} catch (error) {
  console.error('SendGrid initialization error:', error);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, to, cc, subject, text } = req.body;
    const botEmail = 'decisions@bot.set4.io';
    
    // Check if this is a decision email (CC'd to bot)
    const isCC = cc && cc.toLowerCase().includes(botEmail);
    
    if (isCC) {
      // Simple decision extraction without LLM
      const messageId = crypto.randomBytes(16).toString('hex');
      const confirmToken = crypto.randomBytes(32).toString('hex');
      
      // Extract decision from text (simple pattern matching)
      const decisionMatch = text.match(/(?:decided?|decision|choose|going with).*?([^.!?]+)/i);
      const decision = decisionMatch ? decisionMatch[1].trim() : text.substring(0, 100);
      
      // Store decision (pending confirmation)
      await sql`
        INSERT INTO decisions (
          message_id, thread_id, decision_summary, decision_maker, witnesses,
          decision_date, topic, parameters, priority, decision_type,
          status, deadline, impact_scope, raw_thread, parsed_context,
          confirmation_token
        ) VALUES (
          ${messageId}, ${messageId}, ${decision}, 
          ${from}, ARRAY[]::text[],
          ${new Date()}, ${'Test Decision'}, 
          ${'{}'}::jsonb, ${'medium'}, 
          ${'strategic'}, 'pending_confirmation', ${null}, 
          ${'team'}, ${text}, ${'{}'}::jsonb,
          ${confirmToken}
        )
      `;
      
      // Send confirmation request
      const confirmUrl = `https://track-set4.vercel.app/api/confirm-decision?token=${confirmToken}`;
      
      await sgMail.send({
        to: from,
        from: process.env.SENDER_EMAIL,
        subject: `Please Confirm Decision: Test Decision`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Decision Recorded - Please Confirm</h2>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${decision}</h3>
              <p><strong>Type:</strong> strategic (medium priority)</p>
              <p><strong>Impact:</strong> team</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                ✓ Confirm This Decision
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This is a test of the decision tracking system.
            </p>
          </div>
        `
      });
      
      res.status(200).json({ 
        status: 'success', 
        decision: decision,
        message: 'Test decision recorded - check your email for confirmation'
      });
    } else {
      res.status(200).json({ 
        status: 'ignored', 
        message: 'Email not CC\'d to bot - no action taken'
      });
    }
    
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
