import { generateCSRFToken } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Generate CSRF token for the page
  const csrfToken = generateCSRFToken();

  // Serve the Gmail setup HTML page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Setup Gmail Sync - Decision Tracker</title>
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Hedvig+Letters+Serif:opsz@12..24&display=swap" rel="stylesheet">
<style>
:root{
  --green:#00CC88;
  --dark-green:#003B1B;
  --lime:#BBE835;
  --orange:#ED6506;
  --bg:#ffffff;
  --fg:#000000;
}

*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:'Space Mono',monospace;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}

body {
  background-color: #FAFAF8;
  background-image: 
    linear-gradient(#F5F5F2 1px, transparent 1px),
    linear-gradient(90deg, #F5F5F2 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: -1px -1px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E");
  opacity: 0.4;
  pointer-events: none;
  z-index: -1;
}

.container {
  background: white;
  border: 4px solid var(--fg);
  box-shadow: 12px 12px 0 var(--fg);
  padding: 3rem;
  max-width: 600px;
  margin: 2rem;
  text-align: center;
}

h1 {
  font-family: 'Hedvig Letters Serif', serif;
  font-size: 2.5rem;
  margin: 0 0 2rem 0;
  font-weight: 400;
}

.sync-option {
  background: var(--lime);
  border: 4px solid var(--fg);
  padding: 2rem;
  margin: 2rem 0;
  text-align: left;
}

.sync-option h2 {
  font-family: 'Hedvig Letters Serif', serif;
  font-size: 1.8rem;
  margin: 0 0 1rem 0;
  font-weight: 400;
}

.sync-option p {
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
}

.benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
}

.benefits li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.benefits li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--dark-green);
  font-weight: 700;
}

.btn {
  background: var(--fg);
  color: var(--bg);
  padding: 1.2rem 2.4rem;
  font-weight: 700;
  border: 4px solid var(--fg);
  transition: transform .15s ease-in-out;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-size: 1.1rem;
  text-decoration: none;
  font-family: inherit;
}

.btn:hover {
  background: var(--green);
  color: var(--bg);
  border-color: var(--green);
  transform: translateY(-4px);
}

.skip-link {
  color: var(--fg);
  text-decoration: none;
  border-bottom: 2px solid var(--fg);
  padding-bottom: 2px;
  transition: border-color 0.2s;
  font-size: 0.95rem;
}

.skip-link:hover {
  border-color: var(--green);
  color: var(--green);
}

.loading {
  display: none;
  margin: 2rem 0;
}

.loading.show {
  display: block;
}

.spinner {
  border: 3px solid var(--fg);
  border-top: 3px solid var(--green);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: var(--orange);
  margin: 1rem 0;
  padding: 1rem;
  border: 2px solid var(--orange);
  background: #FFF5F5;
  display: none;
}

.error.show {
  display: block;
}
</style>
</head>
<body>

<div class="container">
  <h1>Welcome to Decision Tracker!</h1>
  
  <div class="sync-option">
    <h2>Set up automatic email forwarding</h2>
    <p>Let's connect your Gmail to automatically forward decision emails. This will:</p>
    
    <ul class="benefits">
      <li>Create a Gmail filter for emails where you're CC'd</li>
      <li>Automatically forward them to decisions@bot.set4.io</li>
      <li>Extract decisions automatically using AI</li>
      <li>No manual forwarding needed going forward</li>
    </ul>
  </div>
  
  <button class="btn" onclick="startGmailSync()">
    Connect Gmail & Set Up Forwarding
  </button>
  
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <p>Connecting to Gmail...</p>
  </div>
  
  <div class="error" id="error"></div>
  
  <p style="margin-top: 2rem;">
    <a href="/api/app" class="skip-link">Skip for now →</a>
  </p>
</div>

<script>
// Set CSRF token cookie - only use secure flag if on HTTPS
const isSecure = window.location.protocol === 'https:';
document.cookie = 'track1_csrf=${csrfToken}; path=/; samesite=lax' + (isSecure ? '; secure' : '');

function startGmailSync() {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  
  loading.classList.add('show');
  error.classList.remove('show');
  
  // Open Gmail OAuth in a popup
  const width = 500;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  const authWindow = window.open(
    '/api/auth/gmail-oauth?sync_after_auth=true&sync_period=month',
    'GmailAuth',
    \`width=\${width},height=\${height},left=\${left},top=\${top}\`
  );
  
  // Listen for auth completion
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'gmail-auth-success') {
      console.log('Gmail authentication successful');
      
      // Auth successful, the backend will handle the sync
      loading.innerHTML = '<div class="spinner"></div><p>Gmail connected! Setting up forwarding...</p>';
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/api/app?gmail_syncing=true';
      }, 1500);
    } else if (event.data && event.data.type === 'gmail-auth-error') {
      console.error('Gmail authentication failed:', event.data.error);
      loading.classList.remove('show');
      
      let errorMessage = event.data.message || 'Gmail connection failed';
      if (event.data.error === 'invalid_request') {
        errorMessage += '. Your email may not be added as a test user. Please contact your administrator.';
      }
      
      error.textContent = errorMessage;
      error.classList.add('show');
    }
  });
  
  // Check if auth window closed
  const checkClosed = setInterval(() => {
    try {
      if (authWindow && authWindow.closed) {
        clearInterval(checkClosed);
        loading.classList.remove('show');
      
      // Check if we got the success message
      // If not, show an error
      setTimeout(() => {
        if (loading.classList.contains('show')) {
          loading.classList.remove('show');
          error.textContent = 'Gmail connection was cancelled. Please try again.';
          error.classList.add('show');
        }
      }, 500);
    }
    } catch (e) {
      // Ignore COOP errors when checking if window is closed
    }
  }, 1000);
}
</script>

</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
