import { sql } from '../lib/database.js';
import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';
import crypto from 'crypto';
import formidable from 'formidable';
import { getConfig } from '../lib/config.js';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: process.env.HELICONE_API_KEY ? {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  } : {},
});

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
    const config = getConfig();
    const botEmail = config.inboundEmail;
    
    console.log(`📧 Webhook received on ${config.environment}:`, {
      to,
      cc,
      from,
      botEmail,
      environment: config.environment
    });
    
    // Parse headers
    const headerObj = extractEmailHeaders(headers);
    const messageId = headerObj['Message-ID'] || crypto.randomBytes(16).toString('hex');
    const threadId = headerObj['References'] || headerObj['In-Reply-To'] || messageId;
    
    // Check if bot is included (either CC or TO)
    const isBotIncluded = (cc && cc.toLowerCase().includes(botEmail.split('+')[0])) || 
                          (to && to.toLowerCase().includes(botEmail.split('+')[0]));
    const isTO = to && to.toLowerCase().includes(botEmail.split('+')[0]);
    
    // Determine environment from email address
    let detectedEnvironment = 'production';
    const recipients = `${to || ''} ${cc || ''}`.toLowerCase();
    
    if (recipients.includes('+preview@')) {
      detectedEnvironment = 'preview';
    } else if (recipients.includes('+local@') || recipients.includes('+dev@')) {
      detectedEnvironment = 'local';
    } else if (recipients.includes('+')) {
      // Extract custom environment from plus addressing
      const match = recipients.match(/\+([^@]+)@/);
      if (match) detectedEnvironment = match[1];
    }
    
    if (isBotIncluded && !isTO) {
      // Process as decision (bot in CC)
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
        .filter(e => e && !e.includes(botEmail.split('+')[0]));
      
      const uniqueEmails = [...new Set(allEmails)];
      
      // Parse with GPT-4
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "system",
          content: `Extract decision information from email threads. Decisions can be expressed in various ways:

- Direct statements: "We will proceed with X", "I decide to do Y", "Let's go with option Z"
- Confirmations: "Yes, confirmed", "Agreed", "That works", "Sounds good", "Let's do it"
- Approvals: "Approved", "Go ahead", "Green light", "You have my approval"
- Commitments: "I'll handle this", "We're committed to X", "Count me in"
- Selections: "I choose A", "We'll go with B", "Option C is best"
- Authorizations: "You're authorized to proceed", "Permission granted"

Pay special attention to conversational context - a simple "yes" in response to "Should we do X?" is a decision.

Return JSON with:
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
      console.log('OpenAI parsed result:', parsed);
      
      if (!parsed || parsed.confidence < 70) {
        console.log('Decision rejected - confidence too low:', parsed?.confidence);
        return res.status(200).json({ status: 'no_decision_found', confidence: parsed?.confidence });
      }
      
      // Check if decision maker has a user account
      const userResult = await sql`
        SELECT id FROM users WHERE email = ${parsed.decision_maker || from}
      `;
      const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
      
      // Store decision (automatically confirmed)
      await sql`
        INSERT INTO decisions (
          message_id, thread_id, decision_summary, decision_maker, witnesses,
          decision_date, topic, parameters, priority, decision_type,
          status, deadline, impact_scope, raw_thread, parsed_context,
          confirmed_at, user_id, created_by_email
        ) VALUES (
          ${messageId}, ${threadId}, ${parsed.decision_summary}, 
          ${parsed.decision_maker || from}, ${uniqueEmails.filter(e => e !== from)},
          ${parsed.decision_date || new Date()}, ${parsed.topic}, 
          ${JSON.stringify(parsed.parameters)}, ${parsed.priority}, 
          ${parsed.decision_type}, 'confirmed', ${parsed.deadline}, 
          ${parsed.impact_scope}, ${text}, ${JSON.stringify(parsed)},
          ${new Date()}, ${userId}, ${parsed.decision_maker || from}
        )
      `;
      
      // Reply in the same thread to confirm decision was logged
      await sgMail.send({
        to: from,
        cc: cc?.split(',').filter(email => !email.toLowerCase().includes(botEmail.split('+')[0])).join(',') || undefined,
        from: {
          name: 'Decision Bot',
          email: process.env.SENDER_EMAIL || 'decision@bot.set4.io'
        },
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
      // Query for confirmed decisions (bot in TO)
      const { rows } = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed'
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      const decisionsList = rows.length > 0 
        ? rows.map((d, i) => `${i + 1}. ${d.decision_summary} (${new Date(d.created_at).toLocaleDateString()})`).join('\n')
        : 'No decisions found.';
      
      await sgMail.send({
        to: from,
        from: process.env.SENDER_EMAIL,
        subject: `Re: ${subject}`,
        text: `Recent decisions:\n\n${decisionsList}\n\nView all: https://track-sigma-nine.vercel.app/api/decisions-ui`
      });
      
      res.status(200).json({ status: 'query_sent' });
    } else {
      res.status(200).json({ status: 'ignored' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}