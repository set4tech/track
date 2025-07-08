import { sql } from '@vercel/postgres';
import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';
import crypto from 'crypto';
import formidable from 'formidable';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize SendGrid with error handling
try {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} catch (error) {
  console.error('SendGrid initialization error:', error);
}

// Disable Vercel's body parser for this endpoint
export const config = {
  api: {
    bodyParser: false,
  },
};

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

async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({});
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      // formidable wraps fields in arrays, so we unwrap them
      const unwrappedFields = {};
      for (const key in fields) {
        unwrappedFields[key] = fields[key][0];
      }
      resolve({ fields: unwrappedFields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart/form-data from SendGrid
    const { fields } = await parseFormData(req);
    console.log('Parsed email fields:', fields);
    
    const { from, to, cc, subject, text, html, headers } = fields;
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
      
      // Store decision (automatically confirmed)
      await sql`
        INSERT INTO decisions (
          message_id, thread_id, decision_summary, decision_maker, witnesses,
          decision_date, topic, parameters, priority, decision_type,
          status, deadline, impact_scope, raw_thread, parsed_context,
          confirmed_at
        ) VALUES (
          ${messageId}, ${threadId}, ${parsed.decision_summary}, 
          ${parsed.decision_maker || from}, ${uniqueEmails.filter(e => e !== from)},
          ${parsed.decision_date || new Date()}, ${parsed.topic}, 
          ${JSON.stringify(parsed.parameters)}, ${parsed.priority}, 
          ${parsed.decision_type}, 'confirmed', ${parsed.deadline}, 
          ${parsed.impact_scope}, ${text}, ${JSON.stringify(parsed)},
          ${new Date()}
        )
      `;      // Reply in the same thread to confirm decision was logged
      await sgMail.send({
        to: from,
        cc: cc?.split(',').filter(email => !email.toLowerCase().includes(botEmail)).join(',') || undefined,
        from: process.env.SENDER_EMAIL,
        subject: `Re: ${subject}`,
        text: `I have logged this decision:

"${parsed.decision_summary}"

Type: ${parsed.decision_type} (${parsed.priority} priority)
Impact: ${parsed.impact_scope}
${parsed.deadline ? `Deadline: ${new Date(parsed.deadline).toLocaleDateString()}\n` : ''}${parsed.key_points?.length ? `\nKey Points:\n${parsed.key_points.map(point => `• ${point}`).join('\n')}` : ''}

View all decisions: https://track-sigma-nine.vercel.app/api/decisions-ui`
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