import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Invalid confirmation link');
  }
  
  try {
    const result = await sql`
      UPDATE decisions 
      SET status = 'confirmed', confirmed_at = NOW() 
      WHERE confirmation_token = ${token} AND status = 'pending_confirmation'
      RETURNING *
    `;
    
    if (result.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Decision Not Found</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Instrument Sans', -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            h1 { font-family: 'Hedvig Letters Serif', serif; }
            .error { background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Decision Not Found</h1>
            <p>This decision was not found or has already been confirmed.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    const decision = result.rows[0];
    
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decision Confirmed</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
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
            body { font-family: 'Instrument Sans', -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: var(--muted); color: var(--foreground); }
            h1, h2 { font-family: 'Hedvig Letters Serif', serif; }
            .success { background: var(--primary); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .details { background: var(--background); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid var(--border); }
            .button { background: var(--secondary); color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 5px; transition: background 0.2s; font-weight: 500; }
            .button:hover { background: var(--accent); }
          </style>
      </head>
      <body>
        <div class="success">
          <h1>✓ Decision Confirmed</h1>
        </div>
        
        <div class="details">
          <h2>${decision.decision_summary}</h2>
          <p><strong>Topic:</strong> ${decision.topic}</p>
          <p><strong>Type:</strong> ${decision.decision_type}</p>
          <p><strong>Priority:</strong> ${decision.priority}</p>
          <p><strong>Impact:</strong> ${decision.impact_scope}</p>
          <p><strong>Confirmed at:</strong> <span id="confirmed-time">${new Date().toISOString()}</span></p>
        </div>
        
        <p>This decision has been added to your decision log.</p>
        <div style="text-align: center;">
          <a href="/api/index" class="button">📋 View All Decisions</a>
        </div>
        
        <script>
          // Convert UTC timestamp to user's local timezone
          document.addEventListener('DOMContentLoaded', function() {
            const timeElement = document.getElementById('confirmed-time');
            if (timeElement) {
              const utcTime = timeElement.textContent;
              const localTime = new Date(utcTime).toLocaleString();
              timeElement.textContent = localTime;
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Instrument Sans', -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          h1 { font-family: 'Hedvig Letters Serif', serif; }
          .error { background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Error</h1>
          <p>There was an error confirming your decision. Please try again.</p>
        </div>
      </body>
      </html>
    `);
  }
}
