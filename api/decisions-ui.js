import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  try {
    const { team_id } = req.query;
    
    let rows;
    
    if (team_id) {
      const result = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed' AND slack_team_id = ${team_id}
        ORDER BY confirmed_at DESC
      `;
      rows = result.rows;
    } else {
      const result = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed'
        ORDER BY confirmed_at DESC
      `;
      rows = result.rows;
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decision Log</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 1200px; margin: 0 auto; padding: 20px; 
            background: #f8fafc; color: #1e293b;
          }
          h1 { color: #0f172a; margin-bottom: 10px; }
          .header { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .stats { display: flex; gap: 20px; margin-top: 15px; }
          .stat { background: #f1f5f9; padding: 10px 15px; border-radius: 8px; }
          .decision { 
            background: white; border: 1px solid #e2e8f0; padding: 24px; margin: 16px 0; 
            border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .decision:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .decision h3 { margin-top: 0; color: #0f172a; font-size: 1.25rem; }
          .meta { 
            display: flex; gap: 15px; color: #64748b; font-size: 14px; margin: 15px 0;
            flex-wrap: wrap;
          }
          .meta span { 
            display: flex; align-items: center; gap: 5px; 
            background: #f8fafc; padding: 4px 8px; border-radius: 6px;
          }
          .priority-critical { background: #fef2f2; color: #dc2626; font-weight: bold; }
          .priority-high { background: #fff7ed; color: #ea580c; }
          .priority-medium { background: #fefce8; color: #ca8a04; }
          .priority-low { background: #f0fdf4; color: #16a34a; }
          .parameters { 
            background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;
            border-left: 4px solid #3b82f6;
          }
          .witnesses { color: #64748b; font-size: 14px; margin-top: 15px; }
          .empty { text-align: center; padding: 60px 20px; color: #64748b; }
          .nav { text-align: center; margin-bottom: 20px; }
          .nav a { 
            background: #3b82f6; color: white; padding: 10px 20px; 
            text-decoration: none; border-radius: 8px; margin: 0 10px;
            display: inline-block;
          }
          .nav a:hover { background: #2563eb; }
          @media (max-width: 768px) {
            .meta { flex-direction: column; gap: 8px; }
            .stats { flex-direction: column; gap: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="nav">
          <a href="/api/debug">🔧 Debug</a>
        </div>
        
        <div class="header">
          <h1>📋 Decision Log</h1>
          <div class="stats">
            <div class="stat">
              <strong>${rows.length}</strong> confirmed decisions
            </div>
            <div class="stat">
              <strong>${rows.filter(d => d.priority === 'critical').length}</strong> critical
            </div>
            <div class="stat">
              <strong>${rows.filter(d => d.priority === 'high').length}</strong> high priority
            </div>
            <div class="stat">
              <strong>${new Set(rows.map(d => d.decision_maker)).size}</strong> decision makers
            </div>
          </div>
        </div>
        
        ${rows.length === 0 ? `
          <div class="empty">
            <h2>No confirmed decisions yet</h2>
            <p>Send an email with a decision and CC <strong>decisions@bot.set4.io</strong> or install the Slack bot to get started!</p>
            <p><a href="/api/slack-install-page">📱 Install Slack Bot</a></p>
          </div>
        ` : ''}
        
        ${rows.map(decision => {
          let params = {};
          let parsedContext = {};
          try {
            params = typeof decision.parameters === 'string' ? JSON.parse(decision.parameters) : decision.parameters || {};
            parsedContext = typeof decision.parsed_context === 'string' ? JSON.parse(decision.parsed_context) : decision.parsed_context || {};
          } catch (e) {
            console.error('JSON parse error:', e);
          }
          const witnesses = decision.witnesses || [];
          
          return `
            <div class="decision">
              <h3>${decision.decision_summary}</h3>
              
              <div class="meta">
                <span>📅 ${new Date(decision.decision_date).toLocaleDateString()}</span>
                <span>🏷️ ${decision.topic}</span>
                <span>📊 ${decision.decision_type}</span>
                <span class="priority-${decision.priority}">⚡ ${decision.priority}</span>
                <span>🎯 ${decision.impact_scope}</span>
                ${decision.deadline ? `<span>⏰ ${new Date(decision.deadline).toLocaleDateString()}</span>` : ''}
              </div>
              
              ${parsedContext.key_points && parsedContext.key_points.length > 0 ? `
                <div class="parameters">
                  <strong>Key Points:</strong>
                  <ul style="margin: 10px 0 0 0;">
                    ${parsedContext.key_points.map(point => `<li>${point}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              ${Object.keys(params).length > 0 ? `
                <div class="parameters">
                  <strong>Parameters:</strong>
                  ${Object.entries(params).map(([k,v]) => `<br>• <strong>${k}:</strong> ${v}`).join('')}
                </div>
              ` : ''}
              
              <div class="witnesses">
                <strong>Decision Maker:</strong> ${decision.decision_maker}<br>
                ${witnesses.length > 0 ? `<strong>Witnesses:</strong> ${witnesses.join(', ')}` : 'No witnesses'}
                <br><small>Confirmed: ${new Date(decision.confirmed_at).toLocaleString()}</small>
              </div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('UI error:', error);
    res.status(500).json({ error: error.message });
  }
}
