import { sql } from '../lib/database.js';
import { getConfig } from '../lib/config.js';

export default async function handler(req, res) {
  try {
    const { team_id } = req.query;
    const config = getConfig();
    
    let rows;
    
    if (team_id) {
      const result = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed' 
          AND slack_team_id = ${team_id}
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
            --card-bg: #ffffff;
            --card-border: #d1fae5;
          }
          
          body { 
            font-family: 'Instrument Sans', -apple-system, sans-serif; 
            max-width: 1200px; margin: 0 auto; padding: 20px; 
            background: var(--muted); color: var(--foreground);
          }
          h1 { font-family: 'Hedvig Letters Serif', serif; color: var(--secondary); margin-bottom: 10px; }
          .header { 
            background: var(--card-bg); padding: 20px; border-radius: 12px; margin-bottom: 20px; 
            box-shadow: 0 2px 8px rgba(0, 204, 136, 0.1); border: 1px solid var(--card-border);
          }
          .stats { display: flex; gap: 20px; margin-top: 15px; }
          .stat { 
            background: var(--muted); padding: 10px 15px; border-radius: 8px; 
            border: 1px solid var(--border);
          }
          .decisions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .decision { 
            background: var(--card-bg); 
            border: 1px solid var(--card-border); 
            padding: 24px; 
            border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0, 204, 136, 0.1);
            transition: all 0.3s ease;
            position: relative;
            cursor: pointer;
            overflow: hidden;
            height: 120px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .decision.expanded {
            height: auto;
            grid-column: 1 / -1;
          }
          .decision:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 24px rgba(0, 204, 136, 0.15); 
            border-color: var(--primary);
          }
          .decision h3 { 
            font-family: 'Hedvig Letters Serif', serif; 
            margin: 0; 
            color: var(--secondary); 
            font-size: 1.25rem;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .decision-maker {
            color: var(--muted-foreground);
            font-size: 14px;
            margin-top: auto;
          }
          .decision-details {
            display: none;
            margin-top: 20px;
          }
          .decision.expanded .decision-details {
            display: block;
          }
          .decision.expanded h3 {
            overflow: visible;
            text-overflow: clip;
            -webkit-line-clamp: unset;
          }
          .meta { 
            display: flex; gap: 15px; color: var(--muted-foreground); font-size: 14px; margin: 15px 0;
            flex-wrap: wrap;
          }
          .meta span { 
            display: flex; align-items: center; gap: 5px; 
            background: var(--muted); padding: 4px 8px; border-radius: 6px;
            border: 1px solid var(--border);
          }
          .priority-critical { background: #fef2f2; color: #dc2626; font-weight: bold; border-color: #fecaca; }
          .priority-high { background: #fff7ed; color: var(--accent); border-color: #fed7aa; }
          .priority-medium { background: #fefce8; color: #ca8a04; border-color: #fef3c7; }
          .priority-low { background: var(--muted); color: var(--primary); border-color: var(--border); }
          .parameters { 
            background: var(--muted); padding: 15px; border-radius: 8px; margin: 15px 0;
            border-left: 4px solid var(--primary); border: 1px solid var(--border);
          }
          .witnesses { color: var(--muted-foreground); font-size: 14px; margin-top: 15px; }
          .empty { text-align: center; padding: 60px 20px; color: var(--muted-foreground); }
          .nav { text-align: center; margin-bottom: 20px; }
          .thread-modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,59,27,0.5); z-index: 1000; overflow-y: auto;
          }
          .thread-content {
            background: var(--card-bg); margin: 20px auto; max-width: 800px; border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 204, 136, 0.15); position: relative;
            border: 1px solid var(--card-border);
          }
          .thread-header {
            padding: 20px; border-bottom: 1px solid var(--border); background: var(--muted);
            border-radius: 12px 12px 0 0;
          }
          .thread-body {
            padding: 20px; max-height: 60vh; overflow-y: auto;
          }
          .thread-email {
            background: var(--muted); padding: 15px; border-radius: 8px; margin: 10px 0;
            border-left: 4px solid var(--primary); font-family: monospace; white-space: pre-wrap;
            line-height: 1.4; border: 1px solid var(--border);
          }
          .close-btn {
            position: absolute; top: 15px; right: 20px; background: none; border: none;
            font-size: 24px; cursor: pointer; color: var(--muted-foreground);
          }
          .close-btn:hover { color: var(--foreground); }
          .view-thread-btn {
            background: var(--primary); color: white; border: none; padding: 8px 16px;
            border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 10px;
            transition: background 0.2s;
          }
          .view-thread-btn:hover { background: var(--secondary); }
          .decision .export-button {
            display: none;
          }
          .decision.expanded .export-button {
            display: block;
            position: absolute;
            top: 20px;
            right: 20px;
            background: var(--muted-foreground);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }
          .export-button:hover { background: var(--secondary); }
          .export-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 4px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 204, 136, 0.15);
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s;
            z-index: 10;
          }
          .export-button:hover .export-dropdown,
          .export-dropdown:hover {
            opacity: 1;
            visibility: visible;
          }
          .export-option {
            display: block;
            padding: 10px 16px;
            color: var(--foreground);
            text-decoration: none;
            white-space: nowrap;
            transition: background 0.2s;
          }
          .export-option:hover {
            background: var(--muted);
          }
          .nav a { 
            background: var(--primary); color: white; padding: 10px 20px; 
            text-decoration: none; border-radius: 8px; margin: 0 10px;
            display: inline-block; transition: background 0.2s;
          }
          .nav a:hover { background: var(--secondary); }
          @media (max-width: 768px) {
            .meta { flex-direction: column; gap: 8px; }
            .stats { flex-direction: column; gap: 10px; }
            .decisions-grid {
              grid-template-columns: 1fr;
            }
            .decision {
              height: 100px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Decision Log ${config.isProduction ? '' : `(${config.environment})`}</h1>
          ${!config.isProduction ? `
            <div style="background: #fff3cd; border: 1px solid #ffeebb; padding: 10px; margin: 10px 0; border-radius: 8px;">
              <strong>⚠️ ${config.environment.toUpperCase()} Environment</strong> - 
              Using email: <code>${config.inboundEmail}</code>
            </div>
          ` : ''}
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
            <h2 style="font-family: 'Hedvig Letters Serif', serif;">No confirmed decisions yet</h2>
            <p>Send an email with a decision and CC <strong>${config.inboundEmail}</strong> or install the Slack bot to get started!</p>
            <p><a href="/api/slack-install-page" style="color: var(--primary);">📱 Install Slack Bot</a></p>
          </div>
        ` : `
          <div class="decisions-grid">
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
            <div class="decision" data-id="${decision.id}">
              <h3>${decision.decision_summary}</h3>
              <div class="decision-maker">
                <strong>${decision.decision_maker}</strong>
              </div>
              
              <div class="decision-details">
                <button class="export-button" onclick="event.stopPropagation();">
                  Export
                  <div class="export-dropdown">
                    <a href="#" class="export-option" onclick="event.preventDefault(); exportToPDF(${decision.id}); return false;">📄 Export to PDF</a>
                  </div>
                </button>
                
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
                  ${decision.raw_thread ? '<button class="view-thread-btn" onclick="event.stopPropagation(); showThread(' + decision.id + ')">📧 View Email Thread</button>' : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
          </div>
        `}
        
        <!-- Thread Modal -->
        <div id="threadModal" class="thread-modal">
          <div class="thread-content">
            <button class="close-btn" onclick="closeThread()">&times;</button>
            <div class="thread-header">
              <h2 id="threadTitle" style="font-family: 'Hedvig Letters Serif', serif;">Email Thread</h2>
              <div id="threadMeta"></div>
            </div>
            <div class="thread-body">
              <div id="threadContent">Loading...</div>
            </div>
          </div>
        </div>
        
        <script>
          // Use event delegation on the parent container
          document.addEventListener('click', function(event) {
            // Check if the clicked element or its parent is a decision tile
            const decision = event.target.closest('.decision');
            if (!decision) return;
            
            // Don't toggle if clicking on buttons, links, or elements inside .decision-details
            if (event.target.closest('button') || 
                event.target.closest('a') || 
                event.target.closest('.decision-details')) {
              return;
            }
            
            // Toggle the clicked decision
            const allDecisions = document.querySelectorAll('.decision');
            
            // If clicking on an already expanded decision, just collapse it
            if (decision.classList.contains('expanded')) {
              decision.classList.remove('expanded');
              return;
            }
            
            // Collapse all other decisions
            allDecisions.forEach(d => {
              d.classList.remove('expanded');
            });
            
            // Expand the clicked decision
            decision.classList.add('expanded');
          });
          
          async function showThread(decisionId) {
            const modal = document.getElementById('threadModal');
            const title = document.getElementById('threadTitle');
            const meta = document.getElementById('threadMeta');
            const content = document.getElementById('threadContent');
            
            modal.style.display = 'block';
            content.innerHTML = 'Loading thread...';
            
            try {
              const response = await fetch('/api/decision-thread?id=' + decisionId);
              const decision = await response.json();
              
              if (response.ok) {
                title.textContent = decision.decision_summary;
                meta.innerHTML = '<div style="color: var(--muted-foreground); font-size: 14px; margin-top: 10px;">' +
                  '<strong>From:</strong> ' + decision.decision_maker + '<br>' +
                  '<strong>Date:</strong> ' + new Date(decision.decision_date).toLocaleString() + '<br>' +
                  '<strong>Topic:</strong> ' + decision.topic + ' | <strong>Type:</strong> ' + decision.decision_type + '<br>' +
                  '<strong>Priority:</strong> ' + decision.priority + ' | <strong>Impact:</strong> ' + decision.impact_scope +
                  '</div>';
                
                if (decision.raw_thread) {
                  const emailContainer = document.createElement('div');
                  emailContainer.className = 'thread-email';
                  emailContainer.textContent = decision.raw_thread;
                  content.innerHTML = '';
                  content.appendChild(emailContainer);
                } else {
                  content.innerHTML = '<p style="color: var(--muted-foreground); font-style: italic;">No email thread available for this decision.</p>';
                }
              } else {
                content.innerHTML = '<p style="color: #dc2626;">Error loading thread: ' + decision.error + '</p>';
              }
            } catch (error) {
              content.innerHTML = '<p style="color: #dc2626;">Error loading thread: ' + error.message + '</p>';
            }
          }
          
          function closeThread() {
            document.getElementById('threadModal').style.display = 'none';
          }
          
          document.getElementById('threadModal').addEventListener('click', function(e) {
            if (e.target === this) {
              closeThread();
            }
          });
          
          document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
              closeThread();
            }
          });
          
          async function exportToPDF(decisionId) {
            try {
              const response = await fetch('/api/decision-thread?id=' + decisionId);
              const decision = await response.json();
              
              if (response.ok) {
                const printWindow = window.open('', '_blank');
                const printContent = '<!DOCTYPE html><html><head><title>' + decision.decision_summary + '</title>' +
                  '<style>@import url(\'https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Instrument+Sans:wght@400;500;600;700&display=swap\');' +
                  'body { font-family: \'Instrument Sans\', -apple-system, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }' +
                  'h1 { font-family: \'Hedvig Letters Serif\', serif; color: #003B1B; border-bottom: 2px solid #d1fae5; padding-bottom: 10px; }' +
                  '.meta { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; }' +
                  '.section { margin: 20px 0; } .section h3 { color: #003B1B; margin-bottom: 10px; }' +
                  '.parameters { background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #00CC88; }' +
                  '.witnesses { color: #16a34a; margin-top: 20px; } @media print { body { padding: 0; } }</style>' +
                  '</head><body><h1>' + decision.decision_summary + '</h1>' +
                  '<div class="meta"><strong>Date:</strong> ' + new Date(decision.decision_date).toLocaleDateString() + '<br>' +
                  '<strong>Topic:</strong> ' + decision.topic + '<br><strong>Type:</strong> ' + decision.decision_type + '<br>' +
                  '<strong>Priority:</strong> ' + decision.priority + '<br><strong>Impact Scope:</strong> ' + decision.impact_scope + '<br>' +
                  (decision.deadline ? '<strong>Deadline:</strong> ' + new Date(decision.deadline).toLocaleDateString() + '<br>' : '') +
                  '</div>' +
                  (decision.parsed_context && decision.parsed_context.key_points ? 
                    '<div class="section"><h3>Key Points</h3><ul>' + 
                    decision.parsed_context.key_points.map(function(point) { return '<li>' + point + '</li>'; }).join('') + 
                    '</ul></div>' : '') +
                  (decision.parameters && Object.keys(decision.parameters).length > 0 ? 
                    '<div class="section"><h3>Parameters</h3><div class="parameters">' +
                    Object.entries(decision.parameters).map(function(entry) { return '<strong>' + entry[0] + ':</strong> ' + entry[1] + '<br>'; }).join('') +
                    '</div></div>' : '') +
                  '<div class="witnesses"><strong>Decision Maker:</strong> ' + decision.decision_maker + '<br>' +
                  (decision.witnesses && decision.witnesses.length > 0 ? '<strong>Witnesses:</strong> ' + decision.witnesses.join(', ') + '<br>' : '') +
                  '<strong>Confirmed:</strong> ' + new Date(decision.confirmed_at).toLocaleString() + '</div>' +
                  (decision.raw_thread ? '<div class="section"><h3>Email Thread</h3><pre style="white-space: pre-wrap; background: #f0fdf4; padding: 15px; border-radius: 8px;">' + decision.raw_thread + '</pre></div>' : '') +
                  '</body></html>';
                
                printWindow.document.write(printContent);
                printWindow.document.close();
                printWindow.onload = function() {
                  printWindow.print();
                };
              } else {
                alert('Error loading decision data');
              }
            } catch (error) {
              alert('Error exporting to PDF: ' + error.message);
            }
          }
        </script>
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
