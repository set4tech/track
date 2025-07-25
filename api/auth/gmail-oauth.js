import { google } from 'googleapis';
import { requireAuth } from '../../lib/auth.js';
import { AUTH_CONFIG } from '../../lib/config.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  AUTH_CONFIG.google.redirectUri,
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await requireAuth(req, res);
    if (!authContext) return;

    const scopes = [
      'https://www.googleapis.com/auth/gmail.settings.basic',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    // Check for sync parameters from the query string
    const syncAfterAuth = req.query.sync_after_auth === 'true';
    const syncPeriod = req.query.sync_period || 'month';

    
    // Include sync parameters in the state
    const state = JSON.stringify({
      userId: authContext.user.id.toString(),
      syncAfterAuth,
      syncPeriod,
    });

    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state,
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Gmail OAuth error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
}