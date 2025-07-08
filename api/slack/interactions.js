import { sql } from '../../lib/database.js';
import { verifySlackRequest } from './verify.js';

async function getSlackToken(teamId) {
  const { rows } = await sql`
    SELECT bot_token FROM slack_installations WHERE team_id = ${teamId}
  `;
  return rows[0]?.bot_token;
}

async function updateSlackMessage(token, channel, ts, text, blocks = null) {
  const response = await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      ts,
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

  try {
    // Verify request signature for security
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    if (!verifySlackRequest(rawBody, signature, timestamp)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the payload (Slack sends it as form data)
    const payload = JSON.parse(req.body.payload || req.body);
    const { type, user, team, actions, message, channel } = payload;

    if (type !== 'block_actions' || !actions?.[0]) {
      return res.status(200).json({ ok: true });
    }

    const action = actions[0];
    const confirmToken = action.value;
    const token = await getSlackToken(team.id);

    if (!token) {
      return res.status(200).json({
        text: 'Bot not properly installed. Please reinstall the app.',
      });
    }

    if (action.action_id === 'confirm_decision') {
      // Confirm the decision
      await sql`
        UPDATE decisions 
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE confirmation_token = ${confirmToken} AND status = 'pending_confirmation'
      `;

      // Update the message
      await updateSlackMessage(
        token,
        channel.id,
        message.ts,
        "✅ *Decision Confirmed!* This decision has been added to your decision log.",
        []
      );

    } else if (action.action_id === 'reject_decision') {
      // Delete the pending decision
      await sql`
        DELETE FROM decisions 
        WHERE confirmation_token = ${confirmToken} AND status = 'pending_confirmation'
      `;

      // Update the message
      await updateSlackMessage(
        token,
        channel.id,
        message.ts,
        "❌ *Not a Decision* - This message was not recorded as a decision.",
        []
      );
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Slack interactions error:', error);
    res.status(500).json({ error: error.message });
  }
}
