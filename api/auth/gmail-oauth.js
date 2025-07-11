import { google } from 'googleapis';
import { sql } from '@vercel/postgres';
import { encrypt } from '../../lib/crypto.js';
import { requireAuth } from '../../lib/auth.js';
import { config } from '../../lib/config.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${config.baseUrl}/api/auth/gmail-callback`
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await requireAuth(req, res);
    if (!authContext) return;

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: authContext.user.id.toString()
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Gmail OAuth error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
}