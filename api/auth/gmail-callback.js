import { google } from 'googleapis';
import { sql } from '@vercel/postgres';
import { encrypt } from '../../lib/crypto.js';
import { config } from '../../lib/config.js';
import { GmailSyncService } from '../../lib/gmail-sync.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${config.baseUrl}/api/auth/gmail-callback`
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;
  
  // Parse state to extract userId and sync parameters
  let userId, syncAfterAuth, syncPeriod;
  try {
    const stateData = JSON.parse(state);
    userId = stateData.userId;
    syncAfterAuth = stateData.syncAfterAuth || false;
    syncPeriod = stateData.syncPeriod || 'month';
  } catch (e) {
    // Fallback for old state format (just userId)
    userId = state;
    syncAfterAuth = false;
    syncPeriod = 'month';
  }

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

    // If sync was requested, trigger it in the background
    if (syncAfterAuth) {
      // Start sync in background (non-blocking)
      const gmailSync = new GmailSyncService(userId);
      
      // Calculate date range for sync
      const now = new Date();
      let afterDate;
      
      if (syncPeriod === 'month') {
        afterDate = new Date(now);
        afterDate.setMonth(afterDate.getMonth() - 1);
      } else if (syncPeriod === 'week') {
        afterDate = new Date(now);
        afterDate.setDate(afterDate.getDate() - 7);
      } else {
        afterDate = new Date(now);
        afterDate.setMonth(afterDate.getMonth() - 1); // Default to month
      }
      
      gmailSync.syncEmails(afterDate, now).catch(error => {
        console.error('Background sync error:', error);
      });
      
      // Return a page that posts a success message and closes
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gmail Connected</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'gmail-auth-success' }, '*');
              window.close();
            } else {
              window.location.href = '/api/app?gmail_syncing=true';
            }
          </script>
          <p>Gmail connected successfully! This window will close automatically...</p>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } else {
      res.redirect('/?gmail_connected=true');
    }
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.redirect(`/?gmail_auth_error=${encodeURIComponent('Failed to complete authorization')}`);
  }
}