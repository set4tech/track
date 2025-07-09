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
        <style>
            :root {
                --primary: #00CC88;
                --secondary: #003B1B;
                --tertiary: #BBE835;
                --accent: #ED6506;
                --background: #ffffff;
                --foreground: #003B1B;
                --muted: #f0fdf4;
                --muted-foreground: #16a34a;
                --border: #d1fae5;
            }
            
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                max-width: 600px; margin: 50px auto; padding: 20px; 
                background: var(--muted); color: var(--foreground); text-align: center;
            }
            .header { 
                background: var(--background); padding: 40px; border-radius: 12px; margin-bottom: 20px; 
                box-shadow: 0 2px 8px rgba(0, 204, 136, 0.1); border: 1px solid var(--border);
            }
            .install-btn { 
                background: var(--secondary); color: white; padding: 15px 30px; 
                text-decoration: none; border-radius: 8px; display: inline-block;
                font-weight: bold; margin: 20px 0; transition: all 0.3s;
            }
            .install-btn:hover { 
                background: var(--accent); 
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(237, 101, 6, 0.3);
            }
            .features { text-align: left; margin: 20px 0; }
            .feature { margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📋 Decision Tracker for Slack</h1>
            <p>Automatically track and organize team decisions in Slack</p>
            <p><small>Join thousands of teams already using Decision Tracker</small></p>
            
            <a href="https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=channels:history,chat:write,commands,users:read&redirect_uri=${encodeURIComponent(redirectUri)}" class="install-btn">
                Add to Slack
            </a>
            
            <div class="features">
                <h3>Features:</h3>
                <div class="feature">🤖 <strong>Automatic Detection:</strong> Detects decisions in your messages</div>
                <div class="feature">✅ <strong>Confirmation Flow:</strong> Confirms decisions before logging</div>
                <div class="feature">🔍 <strong>Search & Query:</strong> Use /decisions to find past decisions</div>
                <div class="feature">🔒 <strong>Private:</strong> Your data stays in your workspace</div>
            </div>
            
            <p><small>After installation, use <code>/decisions help</code> to get started!</small></p>
        </div>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
