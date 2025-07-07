import { sql } from '@vercel/postgres';
import sgMail from '@sendgrid/mail';

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
    const { from, to, cc, subject, text, envelope } = req.body;
    
    const botEmail = 'decisions@bot.set4.io';
    const isCC = cc && cc.toLowerCase().includes(botEmail);
    const isTO = to && to.toLowerCase().includes(botEmail);
    
    if (isCC) {
      const decisionRegex = /(?:decided?|decision is?|we'll go with|final decision):\s*(.+?)(?:\.|$)/i;
      const match = text.match(decisionRegex);
      
      if (match) {
        const decision = match[1].trim();
        
        await sql`
          INSERT INTO decisions (decision_text, context, sender_email, thread_subject, original_email_id)
          VALUES (${decision}, ${text.substring(0, 500)}, ${from}, ${subject}, ${envelope.from})
        `;
        
        await sgMail.send({
          to: from,
          from: process.env.SENDER_EMAIL,
          subject: `Decision logged: ${subject}`,
          text: `I've logged your decision: "${decision}"\n\nFrom thread: ${subject}`
        });
      }
    } else if (isTO) {
      const queryMatch = text.match(/(?:what.*decide|decision.*about|decisions.*regarding)\s+(.+?)(?:\?|$)/i;
      
      if (queryMatch) {
        const topic = queryMatch[1].trim();
        
        const { rows } = await sql`
          SELECT * FROM decisions 
          WHERE decision_text ILIKE ${'%' + topic + '%'} 
          OR thread_subject ILIKE ${'%' + topic + '%'}
          ORDER BY created_at DESC 
          LIMIT 5
        `;
        
        let response = `Found ${rows.length} decisions about "${topic}":\n\n`;
        rows.forEach(row => {
          response += `• ${row.decision_text}\n  From: ${row.thread_subject}\n  Date: ${new Date(row.created_at).toLocaleDateString()}\n\n`;
        });
        
        await sgMail.send({
          to: from,
          from: process.env.SENDER_EMAIL,
          subject: `Re: ${subject}`,
          text: response
        });
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}