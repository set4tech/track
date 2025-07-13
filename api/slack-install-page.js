export default async function handler(req, res) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${req.headers.origin || 'https://track-set4.vercel.app'}/api/slack/install`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Slack Client ID not configured' });
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Install Decision Tracker for Slack</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Hedvig+Letters+Serif:opsz@12..24&display=swap" rel="stylesheet">
        <style>
            :root {
                --green: #00CC88;
                --dark-green: #003B1B;
                --lime: #BBE835;
                --orange: #ED6506;
                --bg: #ffffff;
                --fg: #000000;
            }
            
            * { box-sizing: border-box; }
            body { 
                font-family: 'Space Mono', monospace; 
                max-width: 600px; margin: 50px auto; padding: 20px; 
                background: var(--bg); color: var(--fg); text-align: center;
                font-size: 16px; line-height: 1.5;
                -webkit-font-smoothing: antialiased;
            }
            h1, h3 { font-family: 'Hedvig Letters Serif', serif; font-weight: 400; }
            .header { 
                background: var(--bg); padding: 40px; margin-bottom: 20px; 
                border: 4px solid var(--fg);
            }
            .install-btn { 
                background: var(--fg); color: var(--bg);
                padding: 1.2rem 2.4rem; font-size: 1.1rem;
                text-decoration: none; display: inline-flex; align-items: center;
                gap: 0.5rem;
                font-weight: 700; margin: 20px 0; transition: transform 0.15s ease-in-out;
                border: 4px solid var(--fg);
            }
            .install-btn:hover { 
                background: var(--green); color: var(--bg); 
                border-color: var(--green); transform: translateY(-4px);
            }
            .slack-logo {
                width: 20px;
                height: 20px;
            }
            a { color: inherit; text-decoration: none; }
            a:focus-visible { outline: 2px dashed var(--orange); outline-offset: 2px; }
            .features { text-align: left; margin: 20px 0; }
            .feature { margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Decision Tracker for Slack</h1>
            <p>Automatically track and organize team decisions in Slack</p>
            <p><small>Join thousands of teams already using Decision Tracker</small></p>
            
            <a href="https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=channels:history,chat:write,commands,users:read&redirect_uri=${encodeURIComponent(redirectUri)}" class="install-btn">
                <svg class="slack-logo" viewBox="0 0 122.8 122.8" fill="currentColor">
                    <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"/>
                    <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"/>
                    <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"/>
                    <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"/>
                </svg>
                Add to Slack
            </a>
            
            <div class="features">
                <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Features:</h3>
                <div class="feature"><strong>Automatic Detection:</strong> Detects decisions in your messages</div>
                <div class="feature"><strong>Confirmation Flow:</strong> Confirms decisions before logging</div>
                <div class="feature"><strong>Search & Query:</strong> Use /decisions to find past decisions</div>
                <div class="feature"><strong>Private:</strong> Your data stays in your workspace</div>
            </div>
            
            <p><small>After installation, use <code>/decisions help</code> to get started!</small></p>
        </div>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
