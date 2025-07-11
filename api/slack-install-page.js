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
                background: var(--fg); color: var(--bg); padding: 15px 30px; 
                text-decoration: none; display: inline-block;
                font-weight: 700; margin: 20px 0; transition: transform 0.15s ease-in-out;
                border: 4px solid var(--fg);
            }
            .install-btn:hover { 
                transform: translateY(-4px);
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
