import { sql } from '../lib/database.js';
import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';
import crypto from 'crypto';
import formidable from 'formidable';
import { getConfig } from '../lib/config.js';
import { extractTagsFromDecision, attachTagsToDecision } from '../lib/tag-extractor.js';

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

// Helper function to extract tags after response is sent
async function extractTagsInBackground(decisionId, decisionData, startTime) {
  try {
    console.log(`[${Date.now() - startTime}ms] Background: Starting tag extraction for decision ${decisionId}...`);
    const tags = await extractTagsFromDecision(decisionData);
    console.log(`[${Date.now() - startTime}ms] Background: Extracted ${tags.length} tags:`, tags);
    
    if (tags.length > 0) {
      const attached = await attachTagsToDecision(decisionId, tags);
      console.log(`[${Date.now() - startTime}ms] Background: Tag attachment completed: ${attached}`);
    }
  } catch (tagError) {
    console.error('Background tag extraction/attachment error:', tagError);
  }
}

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log(`[${startTime}] Webhook handler started (optimized version)`);
  
  // Vercel functions have a 10-second timeout
  const timeoutWarning = setTimeout(() => {
    console.error(`[${Date.now() - startTime}ms] WARNING: Approaching 10-second timeout!`);
  }, 9000);
  
  if (req.method !== 'POST') {
    clearTimeout(timeoutWarning);
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
    const botDomain = '@bot.set4.io';
    const botPrefix = 'decisions';
    const isBotIncluded = (cc && cc.toLowerCase().includes(botPrefix) && cc.toLowerCase().includes(botDomain)) || 
                          (to && to.toLowerCase().includes(botPrefix) && to.toLowerCase().includes(botDomain));
    const isTO = to && to.toLowerCase().includes(botPrefix) && to.toLowerCase().includes(botDomain);
    
    // Determine environment from email address
    let detectedEnvironment = 'production';
    const recipients = `${to || ''} ${cc || ''}`.toLowerCase();
    
    if (recipients.includes('+preview@')) {
      detectedEnvironment = 'preview';
    } else if (recipients.includes('+test@') || recipients.includes('+local@')) {
      detectedEnvironment = 'test';
    }
    
    console.log(`Detected environment from email: ${detectedEnvironment}, config environment: ${config.environment}`);
    
    if (isBotIncluded) {
      // Check for existing decision
      console.log(`Checking for existing decision with message_id: ${messageId}`);
      const existing = await sql`
        SELECT id FROM decisions WHERE message_id = ${messageId}
      `;
      
      if (existing.rows.length > 0) {
        console.log('Decision already exists, skipping');
        clearTimeout(timeoutWarning);
        return res.status(200).json({ status: 'already_processed' });
      }
      
      // Extract all participants
      const allEmails = [from, ...(to?.split(',') || []), ...(cc?.split(',') || [])]
        .map(e => e.trim().match(/<(.+)>/) ? e.match(/<(.+)>/)[1] : e)
        .filter(e => e && !(e.includes(botPrefix) && e.includes(botDomain)));
      
      const uniqueEmails = [...new Set(allEmails)];
      
      // Parse with GPT-4
      console.log(`[${Date.now() - startTime}ms] Starting OpenAI decision extraction...`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use faster model for quicker response
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
      console.log(`[${Date.now() - startTime}ms] OpenAI decision extraction completed`);
      console.log('OpenAI parsed result:', parsed);
      
      if (!parsed || parsed.confidence < 70) {
        console.log('Decision rejected - confidence too low:', parsed?.confidence);
        clearTimeout(timeoutWarning);
        return res.status(200).json({ status: 'no_decision_found', confidence: parsed?.confidence });
      }
      
      // Check if decision maker has a user account
      const userResult = await sql`
        SELECT id FROM users WHERE email = ${parsed.decision_maker || from}
      `;
      const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
      
      // Store decision (automatically confirmed)
      console.log(`[${Date.now() - startTime}ms] Storing decision in database...`);
      const result = await sql`
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
        RETURNING id
      `;
      
      const decisionId = result.rows[0].id;
      
      // SEND EMAIL IMMEDIATELY BEFORE TAG EXTRACTION
      const senderEmail = process.env.SENDER_EMAIL || 'decision@bot.set4.io';
      const recipientEmail = from;
      const ccEmails = cc?.split(',').filter(email => !(email.toLowerCase().includes(botPrefix) && email.toLowerCase().includes(botDomain))).join(',') || undefined;
      
      console.log(`[${Date.now() - startTime}ms] Preparing to send confirmation email:`);
      console.log('  - From:', senderEmail);
      console.log('  - To:', recipientEmail);
      console.log('  - CC:', ccEmails || 'none');
      console.log('  - SendGrid API Key:', process.env.SENDGRID_API_KEY ? 'configured' : 'MISSING');
      
      try {
        const emailResult = await sgMail.send({
          to: recipientEmail,
          cc: ccEmails,
          from: {
            name: 'Decision Bot',
            email: senderEmail
          },
          subject: `Re: ${subject}`,
          text: `I have logged this decision:

"${parsed.decision_summary}"

Type: ${parsed.decision_type} (${parsed.priority} priority)
Impact: ${parsed.impact_scope}
${parsed.deadline ? `Deadline: ${new Date(parsed.deadline).toLocaleDateString()}\n` : ''}${parsed.key_points?.length ? `\nKey Points:\n${parsed.key_points.map(point => `• ${point}`).join('\n')}` : ''}

View all decisions: https://track-sigma-nine.vercel.app/api/decisions-ui`
        });
        console.log(`[${Date.now() - startTime}ms] SendGrid response:`, emailResult);
        console.log(`[${Date.now() - startTime}ms] Confirmation email sent successfully`);
      } catch (emailError) {
        console.error(`[${Date.now() - startTime}ms] Failed to send confirmation email:`, emailError);
        console.error('SendGrid error details:', emailError.response?.body);
        // Don't fail the whole request if email fails
      }
      
      // Extract tags AFTER sending email (non-blocking)
      const decisionData = {
        id: decisionId,
        decision_summary: parsed.decision_summary,
        topic: parsed.topic,
        decision_type: parsed.decision_type,
        impact_scope: parsed.impact_scope,
        parsed_context: JSON.stringify(parsed)
      };
      
      // Start tag extraction but don't wait for it
      extractTagsInBackground(decisionId, decisionData, startTime);
      
      console.log(`[${Date.now() - startTime}ms] Total webhook processing time (excluding background tasks)`);
      clearTimeout(timeoutWarning);
      
      res.status(200).json({ status: 'success', decision: parsed });
      
    } else {
      clearTimeout(timeoutWarning);
      res.status(200).json({ status: 'ignored' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    clearTimeout(timeoutWarning);
    res.status(500).json({ error: error.message });
  }
}