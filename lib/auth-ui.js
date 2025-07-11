import { AUTH_CONFIG } from './config.js';

// Generate auth HTML for login page
export function generateAuthHTML(csrfToken) {
  return `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
      <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid var(--border);">
        <h3 style="margin: 0 0 15px 0; font-family: 'Hedvig Letters Serif', serif; color: var(--secondary);">Sign In</h3>
        
        ${
          AUTH_CONFIG.google.clientId
            ? `
          <button class="auth-signin-btn" onclick="signInWithGoogle()" style="
            display: flex; align-items: center; gap: 10px;
            width: 100%; padding: 12px 16px; margin-bottom: 12px;
            background: white; border: 1px solid #dadce0; border-radius: 8px;
            cursor: pointer; font-size: 14px; color: #3c4043;
            transition: all 0.3s; font-weight: 500;
          " onmouseover="this.style.background='#f8f9fa'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.background='white'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in
          </button>
        `
            : ''
        }
        
        ${
          AUTH_CONFIG.microsoft.clientId
            ? `
          <button class="auth-signin-btn" onclick="signInWithMicrosoft()" style="
            display: flex; align-items: center; gap: 10px;
            width: 100%; padding: 12px 16px;
            background: white; border: 1px solid #8c8c8c; border-radius: 8px;
            cursor: pointer; font-size: 14px; color: #5e5e5e;
            transition: all 0.3s; font-weight: 500;
          " onmouseover="this.style.background='#f8f9fa'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.background='white'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <svg width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft
          </button>
        `
            : ''
        }
        
        ${
          !AUTH_CONFIG.google.clientId && !AUTH_CONFIG.microsoft.clientId
            ? `
          <p style="color: #dc2626; font-size: 14px; margin: 0;">
            No authentication providers configured. Please set up Google or Microsoft OAuth.
          </p>
        `
            : ''
        }
      </div>
    </div>
    
    <script>
      // Set CSRF token cookie - only use secure flag if on HTTPS
      const isSecure = window.location.protocol === 'https:';
      document.cookie = '${AUTH_CONFIG.csrf.cookieName}=${csrfToken}; path=/; samesite=lax' + (isSecure ? '; secure' : '');
      
      // Listen for auth success messages
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'auth-success') {
          console.log('Authentication successful, reloading page...');
          window.location.reload();
        }
      });
      
      function signInWithGoogle() {
        const width = 500;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const authWindow = window.open(
          '/api/auth/google-login',
          'GoogleAuth',
          \`width=\${width},height=\${height},left=\${left},top=\${top}\`
        );
        
        // Check if auth window closed
        const checkClosed = setInterval(() => {
          if (authWindow && authWindow.closed) {
            clearInterval(checkClosed);
            console.log('Auth popup closed, reloading page...');
            // Reload the page to check auth status
            window.location.reload();
          }
        }, 1000);
      }
      
      function signInWithMicrosoft() {
        const width = 500;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const authWindow = window.open(
          '/api/auth/microsoft-login',
          'MicrosoftAuth',
          \`width=\${width},height=\${height},left=\${left},top=\${top}\`
        );
        
        // Check if auth window closed
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // Reload the page to check auth status
            window.location.reload();
          }
        }, 1000);
      }
    </script>
  `;
}

// Generate user menu HTML for authenticated users
export function generateUserMenuHTML(user) {
  return `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
      <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${
            user.picture
              ? `
            <img src="${user.picture}" alt="${user.name}" style="width: 32px; height: 32px; border-radius: 50%;">
          `
              : `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
              ${user.name?.charAt(0) || user.email?.charAt(0) || '?'}
            </div>
          `
          }
          <div>
            <div style="font-weight: 500; color: var(--foreground); font-size: 14px;">${user.name || user.email}</div>
          </div>
          <button onclick="signOut()" style="
            margin-left: 10px; padding: 6px 12px;
            background: var(--muted); border: 1px solid var(--border); border-radius: 6px;
            cursor: pointer; font-size: 12px; color: var(--foreground);
            transition: background 0.2s;
          " onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--muted)'">
            Sign Out
          </button>
        </div>
      </div>
    </div>
    
    <script>
      async function signOut() {
        try {
          // Get CSRF token from cookie
          const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('${AUTH_CONFIG.csrf.cookieName}='))
            ?.split('=')[1];
          
          console.log('Sign out debug:', {
            cookieName: '${AUTH_CONFIG.csrf.cookieName}',
            csrfToken: csrfToken ? csrfToken.substring(0, 10) + '...' : 'undefined',
            allCookies: document.cookie
          });
          
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'x-csrf-token': csrfToken
            }
          });
          
          if (response.ok) {
            window.location.reload();
          }
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
    </script>
  `;
}

// Generate integrated auth section for main UI
export function generateIntegratedAuthHTML(user, csrfToken) {
  if (user) {
    // Authenticated user - show compact account info
    return `
      <div style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
        ${
          user.picture
            ? `
          <img src="${user.picture}" alt="${user.name}" style="width: 24px; height: 24px; border-radius: 50%;">
        `
            : `
          <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
            ${user.name?.charAt(0) || user.email?.charAt(0) || '?'}
          </div>
        `
        }
        <span style="color: var(--fg); font-weight: 700;">${user.name || user.email}</span>
        <button onclick="signOut()" style="
          background: var(--bg);
          border: 4px solid var(--fg);
          width: 80px;
          height: 40px;
          border-radius: 0;
          cursor: pointer;
          transition: transform 0.15s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--fg);
          font-weight: 700;
          z-index: 10;
          position: relative;
          font-size: 12px;
        " onmouseover="this.style.background='var(--green)'; this.style.color='var(--bg)'; this.style.borderColor='var(--green)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.background='var(--bg)'; this.style.color='var(--fg)'; this.style.borderColor='var(--fg)'; this.style.transform='translateY(0)'">
            Sign Out
        </button>
      </div>
      
      <script>
        async function signOut() {
          try {
            const csrfToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('${AUTH_CONFIG.csrf.cookieName}='))
              ?.split('=')[1];
            
            console.log('Sign out debug:', {
              cookieName: '${AUTH_CONFIG.csrf.cookieName}',
              csrfToken: csrfToken ? csrfToken.substring(0, 10) + '...' : 'undefined',
              allCookies: document.cookie
            });
            
            const response = await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'same-origin',
              headers: {
                'x-csrf-token': csrfToken
              }
            });
            
            if (response.ok) {
              window.location.reload();
            }
          } catch (error) {
            console.error('Logout error:', error);
          }
        }
      </script>
    `;
  } else {
    // Not authenticated - show sign in options
    return `
      <div style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
        ${
          AUTH_CONFIG.google.clientId
            ? `
          <button onclick="signInWithGoogle()" style="
            display: flex; align-items: center; gap: 6px;
            padding: 6px 12px;
            background: white; border: 1px solid var(--border); border-radius: 6px;
            cursor: pointer; font-size: 13px; color: var(--foreground);
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='var(--foreground)'; this.style.background='var(--muted)'" onmouseout="this.style.borderColor='var(--border)'; this.style.background='white'">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in
          </button>
        `
            : ''
        }
        
        ${
          AUTH_CONFIG.microsoft.clientId
            ? `
          <button onclick="signInWithMicrosoft()" style="
            display: flex; align-items: center; gap: 6px;
            padding: 6px 12px;
            background: white; border: 1px solid var(--border); border-radius: 6px;
            cursor: pointer; font-size: 13px; color: var(--foreground);
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='var(--foreground)'; this.style.background='var(--muted)'" onmouseout="this.style.borderColor='var(--border)'; this.style.background='white'">
            <svg width="14" height="14" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in
          </button>
        `
            : ''
        }
        
        ${
          !AUTH_CONFIG.google.clientId && !AUTH_CONFIG.microsoft.clientId
            ? `
          <span style="color: var(--muted-foreground); font-size: 13px;">No auth providers configured</span>
        `
            : ''
        }
      </div>
      
      <script>
        // Set CSRF token cookie - only use secure flag if on HTTPS
        const isSecure = window.location.protocol === 'https:';
        document.cookie = '${AUTH_CONFIG.csrf.cookieName}=${csrfToken}; path=/; samesite=lax' + (isSecure ? '; secure' : '');
        
        // Listen for auth success messages
        window.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'auth-success') {
            console.log('Authentication successful, reloading page...');
            window.location.reload();
          }
        });
        
        function signInWithGoogle() {
          const width = 500;
          const height = 600;
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;
          
          const authWindow = window.open(
            '/api/auth/google-login',
            'GoogleAuth',
            \`width=\${width},height=\${height},left=\${left},top=\${top}\`
          );
          
          // Check if auth window closed
          const checkClosed = setInterval(() => {
            if (authWindow && authWindow.closed) {
              clearInterval(checkClosed);
              console.log('Auth popup closed, reloading page...');
              window.location.reload();
            }
          }, 1000);
        }
        
        function signInWithMicrosoft() {
          const width = 500;
          const height = 600;
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;
          
          const authWindow = window.open(
            '/api/auth/microsoft-login',
            'MicrosoftAuth',
            \`width=\${width},height=\${height},left=\${left},top=\${top}\`
          );
          
          // Check if auth window closed
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkClosed);
              window.location.reload();
            }
          }, 1000);
        }
      </script>
    `;
  }
}
