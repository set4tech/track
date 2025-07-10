import { sql } from '../lib/database.js';
import { getConfig } from '../lib/config.js';
import { getTagsForDecision } from '../lib/tag-extractor.js';
import { requireAuth } from '../lib/auth.js';
import { generateAuthHTML, generateUserMenuHTML } from '../lib/auth-ui.js';
import { generateCSRFToken } from '../lib/auth.js';
import cookie from 'cookie';

export default async function handler(req, res) {
  try {
    const { team_id, tags, filter_mode = 'any' } = req.query;
    const config = getConfig();
    
    // Check authentication
    const auth = await requireAuth(req, res);
    
    // Generate CSRF token for auth forms
    const csrfToken = generateCSRFToken();
    
    // Parse tags from query string (can be comma-separated or array)
    const tagIds = tags ? (Array.isArray(tags) ? tags : tags.split(',')).map(id => parseInt(id, 10)) : [];
    
    let rows;
    
    // Only show decisions if authenticated
    if (!auth.authenticated) {
      rows = [];
    } else if (tagIds.length > 0) {
      
      // Filter by multiple tags
      if (filter_mode === 'all') {
        // AND logic - decisions must have ALL selected tags
        const result = team_id ? 
          await sql`
            SELECT d.* 
            FROM decisions d
            WHERE d.status = 'confirmed'
              AND d.slack_team_id = ${team_id}
              AND d.id IN (
                SELECT dt.decision_id
                FROM decision_tags dt
                WHERE dt.tag_id = ANY(${tagIds})
                GROUP BY dt.decision_id
                HAVING COUNT(DISTINCT dt.tag_id) = ${tagIds.length}
              )
            ORDER BY d.confirmed_at DESC
          ` :
          await sql`
            SELECT d.* 
            FROM decisions d
            WHERE d.status = 'confirmed'
              AND (d.user_id = ${auth.user.id} OR d.created_by_email = ${auth.user.email} OR d.decision_maker = ${auth.user.email})
              AND d.id IN (
                SELECT dt.decision_id
                FROM decision_tags dt
                WHERE dt.tag_id = ANY(${tagIds})
                GROUP BY dt.decision_id
                HAVING COUNT(DISTINCT dt.tag_id) = ${tagIds.length}
              )
            ORDER BY d.confirmed_at DESC
          `;
        rows = result.rows;
      } else {
        // OR logic (default) - decisions with ANY of the selected tags
        const result = team_id ?
          await sql`
            SELECT DISTINCT d.* 
            FROM decisions d
            JOIN decision_tags dt ON d.id = dt.decision_id
            WHERE d.status = 'confirmed' 
              AND dt.tag_id = ANY(${tagIds})
              AND d.slack_team_id = ${team_id}
            ORDER BY d.confirmed_at DESC
          ` :
          await sql`
            SELECT DISTINCT d.* 
            FROM decisions d
            JOIN decision_tags dt ON d.id = dt.decision_id
            WHERE d.status = 'confirmed' 
              AND dt.tag_id = ANY(${tagIds})
              AND (d.user_id = ${auth.user.id} OR d.created_by_email = ${auth.user.email} OR d.decision_maker = ${auth.user.email})
            ORDER BY d.confirmed_at DESC
          `;
        rows = result.rows;
      }
    } else if (team_id) {
      const result = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed' 
          AND slack_team_id = ${team_id}
        ORDER BY confirmed_at DESC
      `;
      rows = result.rows;
    } else {
      // Show user's decisions or all decisions based on email
      const result = await sql`
        SELECT * FROM decisions 
        WHERE status = 'confirmed'
          AND (user_id = ${auth.user.id} OR created_by_email = ${auth.user.email} OR decision_maker = ${auth.user.email})
        ORDER BY confirmed_at DESC
      `;
      rows = result.rows;
    }
    
    // Fetch tags for each decision
    const decisionsWithTags = await Promise.all(
      rows.map(async (decision) => {
        const tags = await getTagsForDecision(decision.id);
        return {
          ...decision,
          tags
        };
      })
    );
    
    // Get all available tags for the filter
    const allTagsResult = await sql`
      SELECT 
        t.id, 
        t.name, 
        t.description, 
        COUNT(DISTINCT dt.decision_id) as decision_count
      FROM tags t
      LEFT JOIN decision_tags dt ON t.id = dt.tag_id
      GROUP BY t.id, t.name, t.description
      HAVING COUNT(DISTINCT dt.decision_id) > 0
      ORDER BY decision_count DESC, t.name ASC
    `;
    const availableTags = allTagsResult.rows;
    
    // Get total count of all decisions for display
    const totalDecisionsResult = await sql`
      SELECT COUNT(*) as total FROM decisions WHERE status = 'confirmed'
    `;
    const totalDecisions = totalDecisionsResult.rows[0].total;
    
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
            position: relative;
            cursor: pointer;
            overflow: hidden;
            height: auto;
            min-height: 140px;
            display: flex;
            flex-direction: column;
          }
          .decision.expanded {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 800px;
            height: auto;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .decision:hover:not(.expanded) { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 24px rgba(0, 204, 136, 0.15); 
            border-color: var(--primary);
          }
          .overlay-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: none;
          }
          .overlay-backdrop.active {
            display: block;
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
            bottom: 20px;
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
          .remove-button {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ef4444;
            color: white;
            border: none;
            padding: 4px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            opacity: 0;
            transition: all 0.2s;
          }
          .decision:hover .remove-button {
            opacity: 1;
          }
          .remove-button:hover {
            background: #dc2626;
            transform: scale(1.05);
          }
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
          .filter-section {
            background: var(--card-bg);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0, 204, 136, 0.1);
            border: 1px solid var(--card-border);
          }
          .filter-title {
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--secondary);
          }
          .tag-filters {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .tag-filter {
            background: var(--muted);
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            color: var(--foreground);
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-family: inherit;
          }
          .tag-filter:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
            transform: translateY(-1px);
          }
          .tag-filter.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
          }
          .tag-filter.selected {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
          }
          .tag-count {
            background: rgba(0, 0, 0, 0.1);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
          }
          .decision-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 10px;
          }
          .decision-tag {
            background: var(--muted);
            border: 1px solid var(--border);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            color: var(--muted-foreground);
          }
          @media (max-width: 768px) {
            .meta { flex-direction: column; gap: 8px; }
            .stats { flex-direction: column; gap: 10px; }
            .decisions-grid {
              grid-template-columns: 1fr;
            }
            .decision {
              min-height: 120px;
            }
            .tag-filters {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        ${auth.authenticated ? generateUserMenuHTML(auth.user) : generateAuthHTML(csrfToken)}
        
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
              <strong>${decisionsWithTags.length}</strong> confirmed decisions
            </div>
            <div class="stat">
              <strong>${decisionsWithTags.filter(d => d.priority === 'critical').length}</strong> critical
            </div>
            <div class="stat">
              <strong>${decisionsWithTags.filter(d => d.priority === 'high').length}</strong> high priority
            </div>
            <div class="stat">
              <strong>${new Set(decisionsWithTags.map(d => d.decision_maker)).size}</strong> decision makers
            </div>
          </div>
        </div>
        
        ${auth.authenticated && availableTags.length > 0 ? `
          <div class="filter-section">
            <div class="filter-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <div class="filter-title">Filter by Tags</div>
              <div class="filter-controls" style="display: flex; gap: 10px; align-items: center;">
                <label style="font-size: 14px; display: flex; align-items: center; gap: 5px;">
                  <input type="radio" name="filter_mode" value="any" checked onchange="updateFilterMode(this.value)">
                  Match Any
                </label>
                <label style="font-size: 14px; display: flex; align-items: center; gap: 5px;">
                  <input type="radio" name="filter_mode" value="all" onchange="updateFilterMode(this.value)">
                  Match All
                </label>
                <button onclick="clearAllFilters()" style="background: var(--muted-foreground); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 14px; cursor: pointer;">
                  Clear All
                </button>
              </div>
            </div>
            <div class="tag-filters" id="tagFilters">
              ${availableTags.map(tag => {
                const isSelected = tagIds.includes(tag.id);
                return `
                  <button 
                    class="tag-filter${isSelected ? ' selected' : ''}" 
                    data-tag-id="${tag.id}"
                    data-tag-name="${tag.name}"
                    onclick="toggleTag(this)">
                    ${tag.name}
                    <span class="tag-count">${tag.decision_count}</span>
                  </button>
                `;
              }).join('')}
            </div>
            <div id="activeFilters" style="margin-top: 10px; font-size: 14px; color: var(--muted-foreground);">
              ${tagIds.length === 0 ? 
                `Showing all ${totalDecisions} decisions` : 
                `Showing ${decisionsWithTags.length} decisions with ${filter_mode === 'all' ? 'all of' : 'any of'}: <strong>${tagIds.map(id => {
                  const tag = availableTags.find(t => t.id == id);
                  return tag ? tag.name : id;
                }).join(', ')}</strong>`
              }
            </div>
          </div>
        ` : ''}
        
        ${!auth.authenticated ? `
          <div class="empty">
            <h2>Please sign in to view decisions</h2>
            <p>Sign in with your Google or Microsoft account to access your decision log.</p>
          </div>
        ` : decisionsWithTags.length === 0 ? `
          <div class="empty">
            <h2 style="font-family: 'Hedvig Letters Serif', serif;">No confirmed decisions yet</h2>
            <p>Send an email with a decision and CC <strong>${config.inboundEmail}</strong> or install the Slack bot to get started!</p>
            <p><a href="/api/slack-install-page" style="color: var(--primary);">📱 Install Slack Bot</a></p>
          </div>
        ` : ''}
        
        ${auth.authenticated ? `
          <div class="decisions-grid">
            ${decisionsWithTags.map(decision => {
>>>>>>> origin/dev
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
              <button class="remove-button" onclick="event.stopPropagation(); removeDecision(${decision.id})" title="Remove decision">Delete</button>
              <h3>${decision.decision_summary}</h3>
              <div class="decision-maker">
                <strong>${decision.decision_maker}</strong>
              </div>
              ${decision.tags && decision.tags.length > 0 ? `
                <div class="decision-tags">
                  ${decision.tags.map(tag => `
                    <span class="decision-tag">${tag.name}</span>
                  `).join('')}
                </div>
              ` : ''}
              
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
        ` : ''}
        
        <!-- Overlay Backdrop -->
        <div id="overlayBackdrop" class="overlay-backdrop"></div>
        
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
          // Handle backdrop clicks
          function toggleBackdrop(show) {
            const backdrop = document.getElementById('overlayBackdrop');
            if (show) {
              backdrop.classList.add('active');
            } else {
              backdrop.classList.remove('active');
            }
          }
          
          // Use event delegation on the parent container
          document.addEventListener('click', function(event) {
            // Check if clicking the backdrop
            if (event.target.id === 'overlayBackdrop') {
              const expandedDecision = document.querySelector('.decision.expanded');
              if (expandedDecision) {
                expandedDecision.classList.remove('expanded');
                toggleBackdrop(false);
              }
              return;
            }
            
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
              toggleBackdrop(false);
              return;
            }
            
            // Collapse all other decisions
            allDecisions.forEach(d => {
              d.classList.remove('expanded');
            });
            
            // Expand the clicked decision
            decision.classList.add('expanded');
            toggleBackdrop(true);
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
          
          async function removeDecision(decisionId) {
            if (confirm('Are you sure you want to remove this decision? This action cannot be undone.')) {
              try {
                const response = await fetch('/api/delete-decision?id=' + decisionId, {
                  method: 'DELETE'
                });
                const result = await response.json();
                
                if (response.ok) {
                  const decisionElement = document.querySelector('.decision[data-id="' + decisionId + '"]');
                  if (decisionElement) {
                    // If the decision was expanded, clean up the UI state
                    if (decisionElement.classList.contains('expanded')) {
                      decisionElement.classList.remove('expanded');
                      toggleBackdrop(false);
                    }
                    
                    decisionElement.style.opacity = '0';
                    decisionElement.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                      decisionElement.remove();
                      
                      // If no decisions left, show empty state
                      const remainingDecisions = document.querySelectorAll('.decision');
                      if (remainingDecisions.length === 0) {
                        location.reload();
                      }
                    }, 300);
                  }
                } else {
                  alert('Error removing decision: ' + result.error);
                }
              } catch (error) {
                alert('Error removing decision: ' + error.message);
              }
            }
          }
          
          async function exportToPDF(decisionId) {
            try {
              const response = await fetch('/api/decision-thread?id=' + decisionId);
              const decision = await response.json();
              
              if (response.ok) {
                const printWindow = window.open('', '_blank');
                const printContent = '<!DOCTYPE html><html><head><title>' + decision.decision_summary + '</title>' +
                  '<style>@import url("https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Instrument+Sans:wght@400;500;600;700&display=swap");' +
                  'body { font-family: "Instrument Sans", -apple-system, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }' +
                  'h1 { font-family: "Hedvig Letters Serif", serif; color: #003B1B; border-bottom: 2px solid #d1fae5; padding-bottom: 10px; }' +
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
          
          // Multi-tag filtering functionality
          let selectedTags = [];
          let filterMode = 'any';
          
          // Initialize from URL params
          function initializeFilters() {
            const urlParams = new URLSearchParams(window.location.search);
            const tags = urlParams.get('tags');
            filterMode = urlParams.get('filter_mode') || 'any';
            
            if (tags) {
              selectedTags = tags.split(',');
              
              // Mark selected tags
              selectedTags.forEach(tagId => {
                const button = document.querySelector(\`.tag-filter[data-tag-id="\${tagId}"]\`);
                if (button) {
                  button.classList.add('selected');
                }
              });
            }
            
            // Set filter mode radio
            const radio = document.querySelector(\`input[name="filter_mode"][value="\${filterMode}"]\`);
            if (radio) radio.checked = true;
            
            updateActiveFiltersDisplay();
          }
          
          function toggleTag(button) {
            const tagId = button.dataset.tagId;
            const index = selectedTags.indexOf(tagId);
            
            if (index > -1) {
              selectedTags.splice(index, 1);
              button.classList.remove('selected');
            } else {
              selectedTags.push(tagId);
              button.classList.add('selected');
            }
            
            applyFilters();
          }
          
          function updateFilterMode(mode) {
            filterMode = mode;
            if (selectedTags.length > 0) {
              applyFilters();
            }
          }
          
          function clearAllFilters() {
            selectedTags = [];
            document.querySelectorAll('.tag-filter').forEach(btn => {
              btn.classList.remove('selected');
            });
            window.location.href = '/api/index';
          }
          
          function applyFilters() {
            const params = new URLSearchParams();
            
            if (selectedTags.length > 0) {
              params.append('tags', selectedTags.join(','));
              params.append('filter_mode', filterMode);
            }
            
            const queryString = params.toString();
            const newUrl = queryString ? \`/api/index?\${queryString}\` : '/api/index';
            window.location.href = newUrl;
          }
          
          function updateActiveFiltersDisplay() {
            const container = document.getElementById('activeFilters');
            if (!container) return;
            
            if (selectedTags.length === 0) {
              container.innerHTML = 'Showing all ${totalDecisions} decisions';
            } else {
              const tagNames = selectedTags.map(id => {
                const button = document.querySelector(\`.tag-filter[data-tag-id="\${id}"]\`);
                return button ? button.dataset.tagName : id;
              });
              
              const modeText = filterMode === 'all' ? 'all of' : 'any of';
              const currentCount = ${decisionsWithTags.length};
              container.innerHTML = \`Showing \${currentCount} decisions with \${modeText}: <strong>\${tagNames.join(', ')}</strong>\`;
            }
          }
          
          // Initialize on page load
          document.addEventListener('DOMContentLoaded', initializeFilters);
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
