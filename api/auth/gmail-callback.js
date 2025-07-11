import { google } from 'googleapis';
import { sql } from '@vercel/postgres';
import { encrypt } from '../../lib/crypto.js';
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

  const { code, state: userId, error } = req.query;

  if (error) {
    return res.redirect(`/?gmail_auth_error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    return res.redirect('/?gmail_auth_error=missing_parameters');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    const encryptedRefreshToken = tokens.refresh_token 
      ? encrypt(tokens.refresh_token) 
      : null;

    await sql`
      UPDATE users
      SET gmail_refresh_token_enc = ${encryptedRefreshToken},
          gmail_access_token = ${tokens.access_token},
          gmail_token_expires_at = ${new Date(tokens.expiry_date)},
          gmail_sync_enabled = TRUE
      WHERE id = ${userId} AND email = ${userInfo.email}
    `;

    const defaultFilter = userInfo.email.includes('@set4.io')
      ? '(from:(*@set4.io) OR to:(*@set4.io)) -category:promotions -category:social'
      : '-category:promotions -category:social';

    await sql`
      INSERT INTO gmail_sync_state (user_id, gmail_filter_query, gmail_label_ids)
      VALUES (${userId}, ${defaultFilter}, ${['INBOX', 'SENT']})
      ON CONFLICT (user_id) DO UPDATE
      SET gmail_filter_query = COALESCE(gmail_sync_state.gmail_filter_query, ${defaultFilter}),
          gmail_label_ids = COALESCE(gmail_sync_state.gmail_label_ids, ${['INBOX', 'SENT']})
    `;

    res.redirect('/?gmail_connected=true');
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.redirect(`/?gmail_auth_error=${encodeURIComponent('Failed to complete authorization')}`);
  }
}