import { requireAuth } from '../lib/auth.js';
import { sql } from '@vercel/postgres';
import { google } from 'googleapis';
import { decrypt } from '../lib/crypto.js';
import { AUTH_CONFIG } from '../lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await requireAuth(req, res);
    if (!authContext) return;

    // Get user's Gmail credentials
    const { rows } = await sql`
      SELECT gmail_refresh_token_enc, gmail_filter_configured, gmail_filter_id
      FROM users
      WHERE id = ${authContext.user.id}
    `;

    if (!rows.length || !rows[0].gmail_refresh_token_enc) {
      return res.status(400).json({ 
        error: 'Gmail not connected',
        message: 'Please connect Gmail first from the setup page' 
      });
    }

    const user = rows[0];
    
    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      AUTH_CONFIG.google.redirectUri,
    );

    const refreshToken = decrypt(user.gmail_refresh_token_enc);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Check forwarding addresses
    const forwardingAddresses = await gmail.users.settings.forwardingAddresses.list({
      userId: 'me'
    });

    const forwardingEmail = 'decisions@bot.set4.io';
    const forwardingAddress = forwardingAddresses.data.forwardingAddresses?.find(
      addr => addr.forwardingEmail === forwardingEmail
    );

    const response = {
      filterConfigured: user.gmail_filter_configured,
      filterId: user.gmail_filter_id,
      forwardingAddress: forwardingAddress || null,
      forwardingVerified: forwardingAddress?.verificationStatus === 'accepted',
      verificationPending: forwardingAddress?.verificationStatus === 'pending',
    };

    // If forwarding is verified but filter not created, create it now
    if (response.forwardingVerified && !user.gmail_filter_configured) {
      try {
        const filter = await gmail.users.settings.filters.create({
          userId: 'me',
          requestBody: {
            criteria: {
              query: `cc:me`, // Emails where user is CC'd
            },
            action: {
              forward: forwardingEmail,
            }
          }
        });
        
        await sql`
          UPDATE users
          SET gmail_filter_configured = TRUE,
              gmail_filter_id = ${filter.data.id}
          WHERE id = ${authContext.user.id}
        `;
        
        response.filterConfigured = true;
        response.filterId = filter.data.id;
      } catch (filterError) {
        console.error('Error creating filter:', filterError);
        response.filterError = filterError.message;
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Gmail verify forwarding error:', error);
    res.status(500).json({ error: 'Failed to check forwarding status' });
  }
}