import {
  verifyMicrosoftToken,
  findOrCreateUser,
  generateSessionToken,
  validateCSRFToken,
} from '../../lib/auth.js';
import { AUTH_CONFIG } from '../../lib/config.js';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // GET request - show Microsoft OAuth page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sign in with Microsoft</title>
        <script src="https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js"></script>
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
          .sign-in-btn {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 24px; font-size: 16px; font-weight: 700;
            background: #ffffff; border: 4px solid #000000;
            cursor: pointer; color: #000000;
            transition: transform 0.15s ease-in-out;
            margin: 0 auto;
          }
          .sign-in-btn:hover {
            transform: translateY(-4px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Sign in with Microsoft</h2>
          <button onclick="signIn()" class="sign-in-btn">
            <svg width="20" height="20" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft
          </button>
          <div id="error" style="color: #dc2626; margin-top: 20px;"></div>
        </div>
        
        <script>
          const msalConfig = {
            auth: {
              clientId: '${AUTH_CONFIG.microsoft.clientId}',
              authority: 'https://login.microsoftonline.com/${AUTH_CONFIG.microsoft.tenantId}',
              redirectUri: window.location.origin + '/api/auth/microsoft-login'
            }
          };
          
          const msalInstance = new msal.PublicClientApplication(msalConfig);
          
          function getCookie(name) {
            const value = '; ' + document.cookie;
            const parts = value.split('; ' + name + '=');
            if (parts.length === 2) return parts.pop().split(';').shift();
          }
          
          async function signIn() {
            try {
              const loginRequest = {
                scopes: ['openid', 'profile', 'email']
              };
              
              const result = await msalInstance.loginPopup(loginRequest);
              
              if (result.idToken) {
                const csrfToken = getCookie('${AUTH_CONFIG.csrf.cookieName}');
                
                const res = await fetch('/api/auth/microsoft-login', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                  },
                  body: JSON.stringify({ idToken: result.idToken }),
                  credentials: 'same-origin'
                });
                
                const data = await res.json();
                
                if (res.ok && data.success) {
                  // Close popup and reload parent
                  if (window.opener) {
                    window.opener.postMessage({ type: 'auth-success', isNewUser: data.isNewUser }, '*');
                    setTimeout(() => window.close(), 100);
                  } else {
                    window.location.href = data.isNewUser ? '/api/gmail-setup' : '/api/app';
                  }
                } else {
                  document.getElementById('error').textContent = 'Login failed: ' + (data.error || 'Unknown error');
                }
              }
            } catch (error) {
              console.error('Login error:', error);
              document.getElementById('error').textContent = 'Login error: ' + error.message;
            }
          }
          
          // Initialize MSAL
          msalInstance.initialize().then(() => {
            // Check if returning from redirect
            msalInstance.handleRedirectPromise().then((result) => {
              if (result && result.idToken) {
                // Handle redirect response
                signIn();
              }
            });
          });
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

    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'No ID token provided' });
    }

    // Verify the Microsoft ID token
    const profile = await verifyMicrosoftToken(idToken);

    // Find or create user
    const user = await findOrCreateUser(profile);

    // Override for will@set4.io to always show onboarding
    if (user.email === 'will@set4.io') {
      user.isNewUser = true;
    }

    // Generate session token
    const { token } = generateSessionToken(user);

    // Set session cookie with proper options for development
    const cookieOptions = {
      ...AUTH_CONFIG.jwt.cookieOptions,
      path: '/',
    };

    // In development, ensure secure is false so the cookie works without HTTPS
    if (process.env.NODE_ENV !== 'production') {
      cookieOptions.secure = false;
    }

    res.setHeader('Set-Cookie', cookie.serialize(AUTH_CONFIG.jwt.cookieName, token, cookieOptions));

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
      isNewUser: user.isNewUser,
    });
  } catch (error) {
    console.error('Microsoft login error:', error);
    return res.status(401).json({ error: error.message });
  }
}
