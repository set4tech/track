import { google } from 'googleapis';
import { sql } from '@vercel/postgres';
import { encrypt } from '../../lib/crypto.js';
import { AUTH_CONFIG } from '../../lib/config.js';
import { getInboundEmailAddress } from '../../lib/config.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  AUTH_CONFIG.google.redirectUri,
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
  } catch (_e) {
    // Fallback for old state format (just userId)
    userId = state;
    syncAfterAuth = false;
    syncPeriod = 'month';
  }

  if (error) {
    // Handle specific OAuth errors
    let errorMessage = error;
    let errorDetails = '';
    
    if (error === 'access_denied') {
      errorMessage = 'Gmail access was denied';
      errorDetails = 'You need to approve Gmail access to use the sync feature.';
    } else if (error === 'invalid_request') {
      errorMessage = 'OAuth configuration error';
      errorDetails = 'This often occurs when your email is not added as a test user. Contact your administrator.';
    }
    
    // Return a user-friendly error page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Connection Failed</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 2rem;
            max-width: 600px;
            margin: 0 auto;
          }
          .error {
            background: #fee;
            border: 2px solid #c00;
            padding: 1.5rem;
            border-radius: 4px;
            margin-bottom: 1rem;
          }
          h2 { color: #c00; margin: 0 0 0.5rem 0; }
          p { margin: 0 0 1rem 0; }
          a { color: #0066cc; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>${errorMessage}</h2>
          <p>${errorDetails}</p>
          <p>Error code: ${error}</p>
        </div>
        <p><a href="/api/gmail-setup">Try again</a> | <a href="/api/app">Skip for now</a></p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'gmail-auth-error', 
              error: '${error}',
              message: '${errorMessage}'
            }, '*');
            setTimeout(() => window.close(), 5000);
          }
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
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
          gmail_filter_configured = FALSE
      WHERE id = ${userId} AND email = ${userInfo.email}
    `;

    // Create Gmail filter to forward emails
    if (syncAfterAuth) {
      try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const forwardingEmail = getInboundEmailAddress();
        
        // First, we need to add the forwarding address
        // Note: This will send a verification email to the forwarding address
        try {
          await gmail.users.settings.forwardingAddresses.create({
            userId: 'me',
            requestBody: {
              forwardingEmail: forwardingEmail,
            }
          });
        } catch (forwardError) {
          // Forwarding address might already exist, continue
          console.log('Forwarding address may already exist:', forwardError.message);
        }
        
        // Create a filter to forward emails where user is CC'd
        const filter = await gmail.users.settings.filters.create({
          userId: 'me',
          requestBody: {
            criteria: {
              to: `cc:${userInfo.email}`, // Emails where user is CC'd
            },
            action: {
              forward: forwardingEmail,
            }
          }
        });
        
        // Mark filter as configured
        await sql`
          UPDATE users
          SET gmail_filter_configured = TRUE,
              gmail_filter_id = ${filter.data.id}
          WHERE id = ${userId}
        `;
        
        console.log('Gmail filter created successfully:', filter.data.id);
      } catch (filterError) {
        console.error('Error creating Gmail filter:', filterError);
        // Continue anyway - user can set up manually
      }

      
      // Return a page that shows forwarding setup status
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gmail Connected</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2rem;
              max-width: 600px;
              margin: 0 auto;
            }
            .success {
              background: #d4edda;
              border: 2px solid #28a745;
              padding: 1.5rem;
              border-radius: 4px;
              margin-bottom: 1rem;
            }
            .warning {
              background: #fff3cd;
              border: 2px solid #ffc107;
              padding: 1.5rem;
              border-radius: 4px;
              margin-bottom: 1rem;
            }
            h2 { color: #28a745; margin: 0 0 0.5rem 0; }
            p { margin: 0 0 1rem 0; }
            .warning h2 { color: #856404; }
            button {
              background: #28a745;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              font-size: 1rem;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover { background: #218838; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>Gmail Connected Successfully!</h2>
            <p>Your Gmail account has been connected.</p>
          </div>
          
          <div class="warning">
            <h2>Verification Email Sent</h2>
            <p>We've sent a verification email to <strong>${forwardingEmail}</strong>.</p>
            <p>Please check your email and click the verification link to complete the forwarding setup.</p>
            <p>Once verified, emails where you're CC'd will automatically forward to Decision Tracker.</p>
          </div>
          
          <button onclick="closeAndRedirect()">Continue to Dashboard</button>
          
          <script>
            function closeAndRedirect() {
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'gmail-auth-success',
                  verificationPending: true 
                }, '*');
                window.close();
              } else {
                window.location.href = '/api/app?gmail_forwarding_pending=true';
              }
            }
            
            // Auto-redirect after 10 seconds
            setTimeout(closeAndRedirect, 10000);
          </script>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } else {
      res.redirect('/?gmail_connected=true');
    }
  } catch (callbackError) {
    console.error('Gmail callback error:', callbackError);
    res.redirect(`/?gmail_auth_error=${encodeURIComponent('Failed to complete authorization')}`);
  }
}
