import { sql } from '../../lib/database.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Handle OAuth callback
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    
    // For production, you should validate the state parameter against a stored value
    // This is a simplified implementation

    try {
      // Exchange code for access token
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code: code,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'OAuth exchange failed');
      }

      // Store installation in database
      await sql`
        INSERT INTO slack_installations (team_id, team_name, bot_token, bot_user_id)
        VALUES (${data.team.id}, ${data.team.name}, ${data.access_token}, ${data.bot_user_id})
        ON CONFLICT (team_id) 
        DO UPDATE SET 
          team_name = EXCLUDED.team_name,
          bot_token = EXCLUDED.bot_token,
          bot_user_id = EXCLUDED.bot_user_id,
          installed_at = NOW()
      `;

      // Send welcome message to the installing user
      try {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: data.authed_user.id,
            text: `🎉 Welcome to Decision Tracker!\n\nI'm here to help your team track important decisions automatically.\n\n*Quick Start:*\n• Type \`/decisions help\` to see available commands\n• Make decisions naturally in your messages (e.g., "We decided to use React")\n• I'll ask for confirmation when I detect decisions\n• Use \`/decisions\` to see recent decisions\n\nQuestions? Visit https://track-set4.vercel.app/support\n\nHappy decision tracking! 📋`,
          }),
        });
      } catch (welcomeError) {
        console.error('Failed to send welcome message:', welcomeError);
      }

      // Redirect to success page - use dynamic URL
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://track-sigma-nine.vercel.app';
      res.redirect(`${baseUrl}/public/slack-success.html`);
    } catch (error) {
      console.error('OAuth error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
