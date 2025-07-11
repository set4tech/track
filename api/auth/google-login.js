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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Hedvig+Letters+Serif:opsz@12..24&display=swap" rel="stylesheet">
        <style>
        * { box-sizing: border-box; }
        body { 
          display: flex; align-items: center; justify-content: center; 
          height: 100vh; margin: 0; 
          font-family: 'Space Mono', monospace; 
          background: #ffffff; color: #000000;
          font-size: 16px; line-height: 1.5;
        }
        h2 { 
          font-family: 'Hedvig Letters Serif', serif; 
          font-weight: 400; 
          font-size: 2rem;
          margin-bottom: 2rem;
        }
        .container {
          text-align: center;
          padding: 2rem;
          border: 4px solid #000000;
          background: #ffffff;
        }
      </style>
      </head>
      <body>
        <div class="container">
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
    
    // In development, ensure secure is false so the cookie works without HTTPS
    if (process.env.NODE_ENV !== 'production') {
      cookieOptions.secure = false;
    }
    
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