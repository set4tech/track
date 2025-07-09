import { generateCSRFToken } from './auth.js';
import { AUTH_CONFIG } from './config.js';

export function generateAuthHTML(csrfToken) {
  return `
    <div id="auth-container" class="auth-section">
      <h2>Sign In</h2>
      
      <!-- Google Sign-In -->
      <div id="g_id_onload"
           data-client_id="${AUTH_CONFIG.google.clientId}"
           data-callback="handleGoogleSignIn"
           data-auto_prompt="false">
      </div>
      <div class="g_id_signin" 
           data-type="standard"
           data-size="large"
           data-theme="outline"
           data-text="sign_in_with"
           data-shape="rectangular">
      </div>
      
      <!-- Microsoft Sign-In -->
      <button id="microsoft-signin-btn" class="ms-signin-btn">
        Sign in with Microsoft
      </button>
      
      <!-- CSRF Token -->
      <input type="hidden" id="csrf-token" value="${csrfToken}">
      
      <script src="https://accounts.google.com/gsi/client" async defer></script>
      <script>
        // Set CSRF cookie
        document.cookie = "${AUTH_CONFIG.csrf.cookieName}=${csrfToken}; SameSite=Lax; Secure";
        
        // Google Sign-In callback
        window.handleGoogleSignIn = async function(response) {
          try {
            const csrfToken = document.getElementById('csrf-token').value;
            
            const result = await fetch('/api/auth/google-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                '${AUTH_CONFIG.csrf.headerName}': csrfToken
              },
              body: JSON.stringify({
                credential: response.credential
              })
            });
            
            const data = await result.json();
            
            if (data.success) {
              // Redirect or update UI
              window.location.reload();
            } else {
              alert('Login failed: ' + data.message);
            }
          } catch (error) {
            console.error('Login error:', error);
            alert('Login failed');
          }
        };
        
        // Microsoft Sign-In setup
        import('https://alcdn.msauth.net/browser/2.0/js/msal-browser.min.js').then(() => {
          const msalConfig = {
            auth: {
              clientId: "${AUTH_CONFIG.microsoft.clientId}",
              authority: "https://login.microsoftonline.com/${AUTH_CONFIG.microsoft.tenantId}",
              redirectUri: window.location.origin
            }
          };
          
          const msalInstance = new msal.PublicClientApplication(msalConfig);
          
          document.getElementById('microsoft-signin-btn').addEventListener('click', async () => {
            try {
              const loginResponse = await msalInstance.loginPopup({
                scopes: ["openid", "profile", "email"]
              });
              
              const csrfToken = document.getElementById('csrf-token').value;
              
              const result = await fetch('/api/auth/microsoft-login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  '${AUTH_CONFIG.csrf.headerName}': csrfToken
                },
                body: JSON.stringify({
                  idToken: loginResponse.idToken
                })
              });
              
              const data = await result.json();
              
              if (data.success) {
                window.location.reload();
              } else {
                alert('Login failed: ' + data.message);
              }
            } catch (error) {
              console.error('Microsoft login error:', error);
              alert('Login failed');
            }
          });
        });
      </script>
      
      <style>
        .auth-section {
          max-width: 400px;
          margin: 2rem auto;
          padding: 2rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }
        
        .auth-section h2 {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        .g_id_signin {
          margin: 1rem auto;
          display: flex;
          justify-content: center;
        }
        
        .ms-signin-btn {
          display: block;
          width: 100%;
          padding: 0.75rem;
          margin-top: 1rem;
          background: #0078d4;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .ms-signin-btn:hover {
          background: #106ebe;
        }
      </style>
    </div>
  `;
}

export function generateUserMenuHTML(user) {
  return `
    <div class="user-menu">
      ${user.picture ? `<img src="${user.picture}" alt="${user.name}" class="user-avatar">` : ''}
      <span class="user-name">${user.name || user.email}</span>
      <button onclick="logout()" class="logout-btn">Sign Out</button>
    </div>
    
    <script>
      async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
      }
    </script>
    
    <style>
      .user-menu {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem;
        background: #f0f0f0;
        border-radius: 4px;
      }
      
      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }
      
      .logout-btn {
        padding: 0.25rem 0.75rem;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
      }
      
      .logout-btn:hover {
        background: #c82333;
      }
    </style>
  `;
}