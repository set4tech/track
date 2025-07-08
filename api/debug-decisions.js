import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // Get all recent decisions (both pending and confirmed)
    const allDecisions = await sql`
      SELECT id, decision_summary, status, decision_maker, created_at, confirmed_at, topic, priority, decision_type
      FROM decisions 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    // Get pending decisions
    const pendingDecisions = await sql`
      SELECT id, decision_summary, decision_maker, created_at, topic
      FROM decisions 
      WHERE status = 'pending_confirmation'
      ORDER BY created_at DESC
    `;
    
    // Get confirmed decisions
    const confirmedDecisions = await sql`
      SELECT id, decision_summary, decision_maker, confirmed_at, topic
      FROM decisions 
      WHERE status = 'confirmed'
      ORDER BY confirmed_at DESC
    `;

    const stats = {
      total: allDecisions.rows.length,
      pending: pendingDecisions.rows.length,
      confirmed: confirmedDecisions.rows.length
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decision Tracker Debug</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat { background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #333; }
          .stat-label { color: #666; font-size: 14px; }
          .section { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .decision { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #3b82f6; }
          .pending { border-left-color: #f59e0b; }
          .confirmed { border-left-color: #10b981; }
          .timestamp { color: #666; font-size: 12px; }
          .test-section { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; }
          pre { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>🔧 Decision Tracker Debug Dashboard</h1>
        <p><strong>Last updated:</strong> ${new Date().toLocaleString()}</p>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">Total Decisions</div>
          </div>
          <div class="stat">
            <div class="stat-number">${stats.pending}</div>
            <div class="stat-label">Pending Confirmation</div>
          </div>
          <div class="stat">
            <div class="stat-number">${stats.confirmed}</div>
            <div class="stat-label">Confirmed</div>
          </div>
        </div>

        <div class="test-section">
          <h2>🧪 Test Email System</h2>
          <p>Use this curl command to test the email system:</p>
          <pre>curl -X POST "https://api.sendgrid.com/v3/mail/send" \\
  -H "Authorization: Bearer $SENDGRID_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "personalizations": [{
      "to": [{"email": "test@example.com"}],
      "cc": [{"email": "decisions@bot.set4.io"}]
    }],
    "from": {"email": "will@set4.io"},
    "subject": "Test Decision",
    "content": [{"type": "text/plain", "value": "We decided to use React for the frontend project"}]
  }'</pre>
          <p><strong>Expected flow:</strong> Email → SendGrid → Webhook → OpenAI → Database → Confirmation Email</p>
        </div>

        <div class="section">
          <h2>📋 Recent Decisions (All)</h2>
          ${allDecisions.rows.length === 0 ? '<p>No decisions found in database</p>' : ''}
          ${allDecisions.rows.map(d => `
            <div class="decision ${d.status === 'confirmed' ? 'confirmed' : 'pending'}">
              <strong>${d.decision_summary}</strong><br>
              <span style="color: ${d.status === 'confirmed' ? '#10b981' : '#f59e0b'};">●</span> ${d.status.toUpperCase()}<br>
              From: ${d.decision_maker}<br>
              Topic: ${d.topic} | Type: ${d.decision_type} | Priority: ${d.priority}<br>
              <div class="timestamp">
                Created: ${new Date(d.created_at).toLocaleString()}
                ${d.confirmed_at ? ` | Confirmed: ${new Date(d.confirmed_at).toLocaleString()}` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h2>⏳ Pending Confirmations</h2>
          ${pendingDecisions.rows.length === 0 ? '<p>No pending decisions</p>' : ''}
          ${pendingDecisions.rows.map(d => `
            <div class="decision pending">
              <strong>${d.decision_summary}</strong><br>
              From: ${d.decision_maker} | Topic: ${d.topic}<br>
              <div class="timestamp">Created: ${new Date(d.created_at).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="/api/decisions-ui" class="button">📋 View Decision Log</a>
          <a href="/api/debug-decisions" class="button">🔄 Refresh Debug</a>
        </div>

        <script>
          // Auto-refresh every 30 seconds
          setTimeout(() => window.location.reload(), 30000);
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
