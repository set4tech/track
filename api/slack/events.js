import { sql } from '@vercel/postgres';
import OpenAI from 'openai';
import crypto from 'crypto';
import { verifySlackRequest } from './verify.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper to get raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Disable Vercel's body parser for this endpoint
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getSlackToken(teamId) {
  const { rows } = await sql`
    SELECT bot_token FROM slack_installations WHERE team_id = ${teamId}
  `;
  return rows[0]?.bot_token;
}

async function sendSlackMessage(token, channel, text, blocks = null) {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text,
      blocks,
    }),
  });
  return response.json();
}

async function sendEphemeralMessage(token, channel, user, text, blocks = null) {
  const response = await fetch('https://slack.com/api/chat.postEphemeral', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      user,
      text,
      blocks,
    }),
  });
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  let body;
  
  try {
    // Try parsing as JSON first (for events)
    body = JSON.parse(rawBody);
  } catch {
    // If JSON parsing fails, parse as form data (for slash commands)
    body = Object.fromEntries(new URLSearchParams(rawBody));
  }

  try {
    const { type, challenge, event, command, team_id, user_id, channel_id, text } = body;

    // Handle URL verification (skip signature verification for this)
    if (type === 'url_verification') {
      return res.status(200).json({ challenge });
    }

    // Verify request signature for security (for all other requests)
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    
    if (!verifySlackRequest(rawBody, signature, timestamp)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle slash commands
    if (command === '/decisions') {
      const token = await getSlackToken(team_id);
      if (!token) {
        return res.status(200).json({
          text: 'Bot not properly installed. Please reinstall the app.',
        });
      }

      if (!text || text.trim() === '' || text.trim() === 'help') {
        return res.status(200).json({
          text: `*Decision Tracker Help*\n\n• \`/decisions\` - Show recent decisions\n• \`/decisions search [query]\` - Search decisions\n• Mention decisions in messages with keywords like "we decided" or "the decision is" to track them automatically`,
        });
      }

      if (text.startsWith('search ')) {
        const query = text.substring(7).trim();
        const { rows } = await sql`
          SELECT * FROM decisions 
          WHERE status = 'confirmed' 
          AND slack_team_id = ${team_id}
          AND (decision_summary ILIKE ${'%' + query + '%'} OR topic ILIKE ${'%' + query + '%'})
          ORDER BY confirmed_at DESC 
          LIMIT 10
        `;

        if (rows.length === 0) {
          return res.status(200).json({
            text: `No decisions found matching "${query}"`,
          });
        }

        const results = rows.map((row, i) => 
          `${i+1}. *${row.decision_summary}*\n   📅 ${new Date(row.decision_date).toLocaleDateString()} | 🏷️ ${row.topic} | ⚡ ${row.priority}`
        ).join('\n\n');

        return res.status(200).json({
          text: `*Search Results for "${query}":*\n\n${results}`,
        });
      }

      // Show recent decisions
      const { rows } = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed' 
        AND slack_team_id = ${team_id}
        ORDER BY confirmed_at DESC 
        LIMIT 10
      `;

      if (rows.length === 0) {
        return res.status(200).json({
          text: 'No confirmed decisions found yet. Start tracking decisions by mentioning them in messages!',
        });
      }

      const decisions = rows.map((row, i) => 
        `${i+1}. *${row.decision_summary}*\n   📅 ${new Date(row.decision_date).toLocaleDateString()} | 🏷️ ${row.topic} | ⚡ ${row.priority}`
      ).join('\n\n');

      return res.status(200).json({
        text: `*Recent Decisions:*\n\n${decisions}`,
      });
    }

    // Handle message events
    if (type === 'event_callback' && event?.type === 'message' && event?.text) {
      // Skip bot messages and messages without decision keywords
      if (event.bot_id || !event.text.match(/(decided?|decision|we choose|going with|final call)/i)) {
        return res.status(200).json({ ok: true });
      }

      const token = await getSlackToken(event.team || team_id);
      if (!token) {
        return res.status(200).json({ ok: true });
      }

      // Parse with GPT-4
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "system",
          content: `Extract decision information from Slack messages. Return JSON with:
            - decision_summary: Clear, concise statement of what was decided (max 200 chars)
            - topic: Main subject area (2-5 words)
            - parameters: Object with key details
            - priority: critical/high/medium/low
            - decision_type: technical/budget/timeline/personnel/strategic/operational
            - impact_scope: team/department/company/external
            - confidence: 0-100 score of how confident you are this is a decision
            - key_points: Array of 3-5 bullet points explaining the decision
            
            Only extract if confidence > 70. Return null if no clear decision found.`
        }, {
          role: "user", 
          content: `Slack message: ${event.text}`
        }],
        response_format: { type: "json_object" }
      });
      
      const parsed = JSON.parse(completion.choices[0].message.content);
      
      if (!parsed || parsed.confidence < 70) {
        return res.status(200).json({ ok: true });
      }

      // Generate confirmation token
      const confirmToken = crypto.randomBytes(32).toString('hex');
      
      // Store decision (pending confirmation)
      await sql`
        INSERT INTO decisions (
          message_id, decision_summary, decision_maker, decision_date, 
          topic, parameters, priority, decision_type, status, impact_scope, 
          raw_thread, parsed_context, confirmation_token,
          slack_team_id, slack_channel_id, slack_user_id
        ) VALUES (
          ${event.ts}, ${parsed.decision_summary}, ${event.user},
          ${new Date()}, ${parsed.topic}, ${JSON.stringify(parsed.parameters)}, 
          ${parsed.priority}, ${parsed.decision_type}, 'pending_confirmation', 
          ${parsed.impact_scope}, ${event.text}, ${JSON.stringify(parsed)},
          ${confirmToken}, ${event.team || team_id}, ${event.channel}, ${event.user}
        )
      `;

      // Send confirmation message to user
      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Decision Detected:* ${parsed.decision_summary}\n\n*Type:* ${parsed.decision_type} (${parsed.priority} priority)\n*Impact:* ${parsed.impact_scope}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "✅ Confirm Decision" },
              style: "primary",
              action_id: "confirm_decision",
              value: confirmToken
            },
            {
              type: "button",
              text: { type: "plain_text", text: "❌ Not a Decision" },
              action_id: "reject_decision",
              value: confirmToken
            }
          ]
        }
      ];

      await sendEphemeralMessage(
        token, 
        event.channel, 
        event.user,
        "I detected a potential decision in your message. Please confirm:",
        blocks
      );
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Slack events error:', error);
    res.status(500).json({ error: error.message });
  }
}
