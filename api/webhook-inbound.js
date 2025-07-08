import { sql } from '../lib/database.js';
import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';
import crypto from 'crypto';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize SendGrid with error handling
try {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} catch (error) {
  console.error('SendGrid initialization error:', error);
}

function extractEmailHeaders(headers) {
  // SendGrid provides headers as a string, parse it
  const headerObj = {};
  if (typeof headers === 'string') {
    headers.split('\n').forEach(line => {
      const [key, ...value] = line.split(':');
      if (key) headerObj[key.trim()] = value.join(':').trim();
    });
  }
  return headerObj;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, to, cc, subject, text, html, headers } = req.body;
    const botEmail = 'decisions@bot.set4.io';
    
    // Parse headers
    const headerObj = extractEmailHeaders(headers);
    const messageId = headerObj['Message-ID'] || crypto.randomBytes(16).toString('hex');
    const threadId = headerObj['References'] || headerObj['In-Reply-To'] || messageId;
    
    // Check if this is a new decision (CC) or query (TO)
    const isCC = cc && cc.toLowerCase().includes(botEmail);
    const isTO = to && to.toLowerCase().includes(botEmail);
    
    if (isCC) {
      // Check if already processed
      const existing = await sql`
        SELECT id FROM decisions WHERE message_id = ${messageId}
      `;
      
      if (existing.rows.length > 0) {
        return res.status(200).json({ status: 'duplicate' });
      }
      
      // Extract all participants
      const allEmails = [from, ...(to?.split(',') || []), ...(cc?.split(',') || [])]
        .map(e => e.trim().match(/<(.+)>/) ? e.match(/<(.+)>/)[1] : e)
        .filter(e => e && !e.includes(botEmail));
      
      const uniqueEmails = [...new Set(allEmails)];
      
      // Parse with GPT-4
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "system",
          content: `Extract decision information from email threads. Return JSON with:
            - decision_summary: Clear, concise statement of what was decided (max 200 chars)
            - decision_maker: Email of person who made the decision (from the From field)
            - witnesses: Array of all other email addresses in the thread
            - decision_date: When decision was made (ISO format)
            - topic: Main subject area (2-5 words)
            - parameters: Object with key details like:
              - budget: amount if mentioned
              - timeline: dates/deadlines
              - resources: people/tools needed
              - scope: what's included/excluded
              - success_criteria: how to measure success
            - priority: critical/high/medium/low
            - decision_type: technical/budget/timeline/personnel/strategic/operational
            - deadline: If mentioned (ISO format)
            - impact_scope: team/department/company/external
            - confidence: 0-100 score of how confident you are this is a decision
            - key_points: Array of 3-5 bullet points explaining the decision
            
            Only extract if confidence > 70. Return null if no clear decision found.`
        }, {
          role: "user", 
          content: `Email thread:\nFrom: ${from}\nTo: ${to}\nCC: ${cc}\nSubject: ${subject}\n\n${text}`
        }],
        response_format: { type: "json_object" }
      });
      
      const parsed = JSON.parse(completion.choices[0].message.content);
      
      if (!parsed || parsed.confidence < 70) {
        return res.status(200).json({ status: 'no_decision_found' });
      }
      
      // Generate confirmation token
      const confirmToken = crypto.randomBytes(32).toString('hex');
      
      // Store decision (pending confirmation)
      await sql`
        INSERT INTO decisions (
          message_id, thread_id, decision_summary, decision_maker, witnesses,
          decision_date, topic, parameters, priority, decision_type,
          status, deadline, impact_scope, raw_thread, parsed_context,
          confirmation_token
        ) VALUES (
          ${messageId}, ${threadId}, ${parsed.decision_summary}, 
          ${parsed.decision_maker || from}, ${uniqueEmails.filter(e => e !== from)},
          ${parsed.decision_date || new Date()}, ${parsed.topic}, 
          ${JSON.stringify(parsed.parameters)}, ${parsed.priority}, 
          ${parsed.decision_type}, 'pending_confirmation', ${parsed.deadline}, 
          ${parsed.impact_scope}, ${text}, ${JSON.stringify(parsed)},
          ${confirmToken}
        )
      `;
      
      // Send confirmation request
      const confirmUrl = `https://track-set4.vercel.app/api/confirm-decision?token=${confirmToken}`;
      
      await sgMail.send({
        to: from,
        from: process.env.SENDER_EMAIL,
        subject: `Please Confirm Decision: ${parsed.topic}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Decision Recorded - Please Confirm</h2>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${parsed.decision_summary}</h3>
              
              <p><strong>Type:</strong> ${parsed.decision_type} (${parsed.priority} priority)</p>
              <p><strong>Impact:</strong> ${parsed.impact_scope}</p>
              ${parsed.deadline ? `<p><strong>Deadline:</strong> ${new Date(parsed.deadline).toLocaleDateString()}</p>` : ''}
              
              <h4>Key Points:</h4>
              <ul>
                ${parsed.key_points?.map(point => `<li>${point}</li>`).join('') || '<li>No key points extracted</li>'}
              </ul>
              
              ${Object.keys(parsed.parameters || {}).length > 0 ? `
                <h4>Parameters:</h4>
                <ul>
                  ${Object.entries(parsed.parameters).map(([k,v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}
                </ul>
              ` : ''}
              
              <p><strong>Witnesses:</strong> ${uniqueEmails.filter(e => e !== from).join(', ') || 'None'}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                ✓ Confirm This Decision
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If this wasn't a decision or was incorrectly captured, simply ignore this email.
              Only confirmed decisions will be stored in the decision log.
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">Thread ID: ${threadId}</p>
          </div>
        `
      });
      
      res.status(200).json({ status: 'success', decision: parsed });
      
    } else if (isTO) {
      // Query for confirmed decisions
      const { rows } = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed'
        ORDER BY confirmed_at DESC 
        LIMIT 10
      `;
      
      let response = `Here are your recent confirmed decisions:\n\n`;
      rows.forEach((row, i) => {
        response += `${i+1}. ${row.decision_summary}\n`;
        response += `   Topic: ${row.topic}\n`;
        response += `   Date: ${new Date(row.decision_date).toLocaleDateString()}\n`;
        response += `   Type: ${row.decision_type} (${row.priority})\n\n`;
      });
      
      if (rows.length === 0) {
        response = 'No confirmed decisions found yet.';
      }
      
      await sgMail.send({
        to: from,
        from: process.env.SENDER_EMAIL,
        subject: `Re: ${subject}`,
        text: response
      });
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}