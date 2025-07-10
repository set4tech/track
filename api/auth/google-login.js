import { verifyGoogleToken, findOrCreateUser, generateSessionToken, validateCSRFToken } from '../../lib/auth.js';
import { AUTH_CONFIG } from '../../lib/config.js';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // GET request - show Google OAuth page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sign in with Google</title>
        <meta name="google-signin-client_id" content="${AUTH_CONFIG.google.clientId}">
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body style="display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: -apple-system, sans-serif;">
        <div style="text-align: center;">
          <h2>Sign in with Google</h2>
          <div id="g_id_onload"
               data-client_id="${AUTH_CONFIG.google.clientId}"
               data-callback="handleCredentialResponse"
               data-auto_prompt="false">
          </div>
          <div class="g_id_signin"
               data-type="standard"
               data-size="large"
               data-theme="outline"
               data-text="sign_in_with"
               data-shape="rectangular"
               data-logo_alignment="left">
          </div>
        </div>
        
        <script>
          function getCookie(name) {
            const value = '; ' + document.cookie;
            const parts = value.split('; ' + name + '=');
            if (parts.length === 2) return parts.pop().split(';').shift();
          }
          
          async function handleCredentialResponse(response) {
            try {
              const csrfToken = getCookie('${AUTH_CONFIG.csrf.cookieName}');
              
              const res = await fetch('/api/auth/google-login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-csrf-token': csrfToken
                },
                body: JSON.stringify({ credential: response.credential }),
                credentials: 'same-origin'
              });
              
              const data = await res.json();
              
              if (res.ok && data.success) {
                // Close popup and reload parent
                if (window.opener) {
                  // Notify parent window before closing
                  window.opener.postMessage({ type: 'auth-success' }, '*');
                  // Small delay to ensure message is sent
                  setTimeout(() => window.close(), 100);
                } else {
                  window.location.href = '/';
                }
              } else {
                alert('Login failed: ' + (data.error || 'Unknown error'));
              }
            } catch (error) {
              alert('Login error: ' + error.message);
            }
          }
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }
  
  try {
    // Verify CSRF token
    const cookies = cookie.parse(req.headers.cookie || '');
    const csrfCookie = cookies[AUTH_CONFIG.csrf.cookieName];
    const csrfHeader = req.headers['x-csrf-token'];
    
    if (!validateCSRFToken(csrfCookie, csrfHeader)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'No credential provided' });
    }
    
    // Verify the Google ID token
    const profile = await verifyGoogleToken(credential);
    
    // Find or create user
    const user = await findOrCreateUser(profile);
    
    // Generate session token
    const { token } = generateSessionToken(user);
    
    // Set session cookie with explicit domain for dev environments
    const cookieOptions = {
      ...AUTH_CONFIG.jwt.cookieOptions,
      path: '/',
      // Remove domain restriction for better compatibility
      domain: undefined
    };
    
    res.setHeader('Set-Cookie', cookie.serialize(
      AUTH_CONFIG.jwt.cookieName,
      token,
      cookieOptions
    ));
    
    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider
      }
    });
    
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(401).json({ error: error.message });
  }
}