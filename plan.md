Here's the complete implementation plan for your POC:

## 1. Updated Database Schema

```sql
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
);

CREATE INDEX idx_decisions_thread ON decisions(thread_id);
CREATE INDEX idx_confirmation ON decisions(confirmation_token);
```

## 2. Update setup-decisions-db.js

```javascript
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS decisions (
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
    
    res.status(200).json({ message: 'Decisions table created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 3. Complete Email Processing with LLM

```javascript
// api/webhook-inbound.js
import { sql } from '@vercel/postgres';
import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';
import crypto from 'crypto';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
      const confirmUrl = `https://track.vercel.app/api/confirm-decision?token=${confirmToken}`;
      
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
              
              ${Object.keys(parsed.parameters).length > 0 ? `
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
      // Simple query for now
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
```

## 4. Confirmation Endpoint

```javascript
// api/confirm-decision.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Invalid confirmation link');
  }
  
  try {
    const result = await sql`
      UPDATE decisions 
      SET status = 'confirmed', confirmed_at = NOW() 
      WHERE confirmation_token = ${token} AND status = 'pending_confirmation'
      RETURNING *
    `;
    
    if (result.rows.length === 0) {
      return res.status(404).send('Decision not found or already confirmed');
    }
    
    const decision = result.rows[0];
    
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decision Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { background: #22c55e; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .details { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✓ Decision Confirmed</h1>
        </div>
        
        <div class="details">
          <h2>${decision.decision_summary}</h2>
          <p><strong>Topic:</strong> ${decision.topic}</p>
          <p><strong>Type:</strong> ${decision.decision_type}</p>
          <p><strong>Priority:</strong> ${decision.priority}</p>
          <p><strong>Confirmed at:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>This decision has been added to your decision log.</p>
        <p><a href="/decisions">View all decisions →</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error confirming decision');
  }
}
```

## 5. Simple Frontend to View Decisions

```javascript
// api/decisions-ui.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    const { rows } = await sql`
      SELECT * FROM decisions 
      WHERE status = 'confirmed'
      ORDER BY confirmed_at DESC
    `;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decision Log</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .decision { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .decision h3 { margin-top: 0; color: #1a1a1a; }
          .meta { display: flex; gap: 20px; color: #666; font-size: 14px; }
          .meta span { display: flex; align-items: center; gap: 5px; }
          .priority-critical { color: #dc2626; font-weight: bold; }
          .priority-high { color: #ea580c; }
          .priority-medium { color: #ca8a04; }
          .priority-low { color: #16a34a; }
          .parameters { background: #fff; padding: 10px; border-radius: 4px; margin: 10px 0; }
          .witnesses { color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>📋 Decision Log</h1>
        <p>Total confirmed decisions: ${rows.length}</p>
        
        ${rows.map(decision => {
          const params = decision.parameters || {};
          const witnesses = decision.witnesses || [];
          
          return `
            <div class="decision">
              <h3>${decision.decision_summary}</h3>
              
              <div class="meta">
                <span>📅 ${new Date(decision.decision_date).toLocaleDateString()}</span>
                <span>🏷️ ${decision.topic}</span>
                <span>📊 ${decision.decision_type}</span>
                <span class="priority-${decision.priority}">⚡ ${decision.priority}</span>
                <span>🎯 ${decision.impact_scope}</span>
              </div>
              
              ${Object.keys(params).length > 0 ? `
                <div class="parameters">
                  <strong>Parameters:</strong>
                  ${Object.entries(params).map(([k,v]) => `<br>• ${k}: ${v}`).join('')}
                </div>
              ` : ''}
              
              ${decision.deadline ? `<p>⏰ <strong>Deadline:</strong> ${new Date(decision.deadline).toLocaleDateString()}</p>` : ''}
              
              <p class="witnesses">
                <strong>Decision Maker:</strong> ${decision.decision_maker}<br>
                ${witnesses.length > 0 ? `<strong>Witnesses:</strong> ${witnesses.join(', ')}` : ''}
              </p>
            </div>
          `;
        }).join('')}
        
        ${rows.length === 0 ? '<p>No confirmed decisions yet.</p>' : ''}
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 6. Add to package.json

```bash
npm install openai
```

## 7. Environment Variables

Add to Vercel:
```bash
vercel env add OPENAI_API_KEY
# Add your OpenAI API key when prompted
```

## 8. Deploy and Test

```bash
vercel --prod
```

Then:
- Visit `https://track.vercel.app/api/setup-decisions-db` to create tables
- Visit `https://track.vercel.app/api/decisions-ui` to see the decision log
- Send test email CCing `decisions@bot.set4.io` with a decision

The flow is:
1. Email with decision → Bot extracts it → Sends confirmation email
2. Click confirm link → Decision marked as confirmed
3. View all decisions at `/api/decisions-ui`

This gives you a working POC with LLM parsing, confirmation flow, and basic UI.
