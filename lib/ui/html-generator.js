import { styles } from './styles.js';
import { generateClientScripts } from './client-scripts.js';

export function generateDecisionHTML({
  config,
  auth,
  csrfToken,
  decisionsWithTags,
  availableTags,
  totalDecisions,
  tagIds,
  filterMode,
  generateIntegratedAuthHTML,
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Your AI Paperwork Assistant</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Hedvig+Letters+Serif:opsz@12..24&display=swap" rel="stylesheet">
      <style>${styles}</style>
    </head>
    <body>
      <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <img src="/set4-logo.svg" alt="Set4" style="height: 40px; width: auto;">
            <span style="font-size: 20px; color: #888; font-weight: 400;">track</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${generateIntegratedAuthHTML(auth.authenticated ? auth.user : null, csrfToken)}
            <button class="help-button" onclick="showHelp()" title="How it works">
              <span style="font-size: 20px;">?</span>
            </button>
          </div>
        </div>
        <p style="margin: 10px 0; font-size: 14px; color: #666;">cc decisions@bot.set4.io</p>
        <div class="stats">
          <div class="stat">
            <strong>${decisionsWithTags.length}</strong> confirmed decisions
          </div>
          <div class="stat">
            <strong>${decisionsWithTags.filter((d) => d.priority === 'critical').length}</strong> critical
          </div>
          <div class="stat">
            <strong>${decisionsWithTags.filter((d) => d.priority === 'high').length}</strong> high priority
          </div>
          <div class="stat">
            <strong>${new Set(decisionsWithTags.map((d) => d.decision_maker)).size}</strong> decision makers
          </div>
        </div>
      </div>
      
      ${
        auth.authenticated && availableTags.length > 0
          ? `
        <div class="filter-section minimized" id="filterSection">
          <div class="filter-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer;" onclick="toggleFilters()">
            <div class="filter-title">Filters ${tagIds.length > 0 ? `(${tagIds.length})` : ''}</div>
            <div class="filter-toggle" id="filterToggle" style="font-size: 18px; transition: transform 0.2s;">▼</div>
          </div>
          <div class="filter-content" id="filterContent" style="display: none;">
            <div class="filter-controls" style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
              <label style="font-size: 14px; display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="filter_mode" value="any" checked onchange="updateFilterMode(this.value)">
                Match Any
              </label>
              <label style="font-size: 14px; display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="filter_mode" value="all" onchange="updateFilterMode(this.value)">
                Match All
              </label>
              <button onclick="clearAllFilters()" style="background: var(--fg); color: var(--bg); border: 4px solid var(--fg); padding: 6px 12px; font-size: 14px; cursor: pointer; font-weight: 700; transition: all 0.15s ease-in-out;" onmouseover="this.style.background='var(--green)'; this.style.borderColor='var(--green)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--fg)'; this.style.borderColor='var(--fg)'; this.style.transform='translateY(0)'">
                Clear All
              </button>
            </div>
            <div class="tag-filters" id="tagFilters">
              ${availableTags
                .map((tag) => {
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
                })
                .join('')}
            </div>
            <div id="activeFilters" style="margin-top: 10px; font-size: 14px; color: var(--muted-foreground);">
              ${
                tagIds.length === 0
                  ? `Showing all ${totalDecisions} decisions`
                  : `Showing ${decisionsWithTags.length} of ${totalDecisions} decisions with ${filterMode === 'all' ? 'all of' : 'any of'}: <strong>${tagIds
                      .map((id) => {
                        const tag = availableTags.find((t) => t.id == id);
                        return tag ? tag.name : id;
                      })
                      .join(', ')}</strong>`
              }
            </div>
          </div>
        </div>
      `
          : ''
      }
      
      ${
        !auth.authenticated
          ? `
        <div class="empty">
          <h2>Please sign in to view decisions</h2>
          <p>Sign in with your Google or Microsoft account to access your decision log.</p>
        </div>
      `
          : decisionsWithTags.length === 0
            ? `
        <div class="empty">
          <h2 style="font-family: 'Hedvig Letters Serif', serif;">No confirmed decisions yet</h2>
          <p>Send an email with a decision and CC <strong>${config.inboundEmail}</strong> or install the Slack bot to get started!</p>
          <p><a href="/api/slack-install-page" style="color: var(--primary);">📱 Install Slack Bot</a></p>
        </div>
      `
            : ''
      }
      
      ${
        auth.authenticated
          ? `
        <div class="decisions-grid">
          ${decisionsWithTags
            .map((decision) => {
              let params = {};
              let parsedContext = {};
              try {
                params =
                  typeof decision.parameters === 'string'
                    ? JSON.parse(decision.parameters)
                    : decision.parameters || {};
                parsedContext =
                  typeof decision.parsed_context === 'string'
                    ? JSON.parse(decision.parsed_context)
                    : decision.parsed_context || {};
              } catch (e) {
                console.error('JSON parse error:', e);
              }
              const witnesses = decision.witnesses || [];

              return `
          <div class="decision" data-id="${decision.id}">
            <button class="remove-button" onclick="event.stopPropagation(); removeDecision(${decision.id})" title="Remove decision">−</button>
            <h3>${decision.decision_summary}</h3>
            <div class="decision-maker">
              <strong>${decision.decision_maker}</strong>
            </div>
            ${
              decision.tags && decision.tags.length > 0
                ? `
              <div class="decision-tags">
                ${decision.tags
                  .map(
                    (tag) => `
                  <span class="decision-tag">${tag.name}</span>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
            
            <div class="decision-details">
              <button class="export-button" onclick="event.stopPropagation();">
                Export
                <div class="export-dropdown">
                  <a href="#" class="export-option" onclick="event.preventDefault(); exportToPDF(${decision.id}); return false;">📄 to PDF</a>
                </div>
              </button>
              
              <div class="meta">
                <span>📅 <span class="date-field" data-date="${decision.decision_date}">${new Date(decision.decision_date).toLocaleDateString()}</span></span>
                <span>🏷️ ${decision.topic}</span>
                <span>📊 ${decision.decision_type}</span>
                <span class="priority-${decision.priority}">⚡ ${decision.priority}</span>
                <span>🎯 ${decision.impact_scope}</span>
                ${decision.deadline ? `<span>⏰ <span class="date-field" data-date="${decision.deadline}">${new Date(decision.deadline).toLocaleDateString()}</span></span>` : ''}
              </div>
              
              ${
                parsedContext.key_points && parsedContext.key_points.length > 0
                  ? `
                <div class="parameters">
                  <strong>Key Points:</strong>
                  <ul style="margin: 10px 0 0 0;">
                    ${parsedContext.key_points.map((point) => `<li>${point}</li>`).join('')}
                  </ul>
                </div>
              `
                  : ''
              }
              
              ${(() => {
                const nonNullParams = Object.entries(params).filter(
                  ([_k, v]) => v !== null && v !== undefined && v !== ''
                );
                return nonNullParams.length > 0
                  ? `
                  <div class="parameters">
                    <strong>Parameters:</strong>
                    ${nonNullParams.map(([k, v]) => `<br>• <strong>${k}:</strong> ${v}`).join('')}
                  </div>
                `
                  : '';
              })()}
              
              <div class="decision-made-with">
                <strong>Decision Maker:</strong> ${decision.decision_maker}<br>
                ${witnesses.length > 0 ? `<strong>Decision made with:</strong> ${witnesses.join(', ')}` : 'No one else involved'}
                <br><small>Confirmed: <span class="datetime-field" data-date="${decision.confirmed_at}">${new Date(decision.confirmed_at).toLocaleString()}</span></small>
                ${decision.raw_thread ? `<button class="view-thread-btn" onclick="event.stopPropagation(); showThread(${decision.id})">📧 View Email Thread</button>` : ''}
              </div>
            </div>
          </div>
        `;
            })
            .join('')}
        </div>
      `
          : ''
      }
      
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
      
      <!-- Help Modal -->
      <div id="helpModal" class="help-modal">
        <div class="help-content">
          <button class="close-btn" onclick="closeHelp()">&times;</button>
          <div class="help-header">
            <h2 style="font-family: 'Hedvig Letters Serif', serif;">How Your AI Paperwork Assistant Works</h2>
          </div>
          <div class="help-body">
            <div class="help-section">
              <h3>📧 Making Decisions via Email</h3>
              <p>Simply send or CC <strong>${config.inboundEmail}</strong> when you make a decision in an email conversation. Our AI will:</p>
              <ul>
                <li>Automatically extract the decision from your email thread</li>
                <li>Identify key details like priority, deadline, and impact scope</li>
                <li>Send you a confirmation email to verify the decision</li>
                <li>Log it with all the relevant metadata and participants</li>
              </ul>
              
              <div class="help-example">
                To: team@company.com<br>
                CC: ${config.inboundEmail}<br>
                Subject: Project Timeline Decision<br><br>
                After reviewing our options, we've decided to extend the project deadline by 2 weeks to ensure quality delivery.
              </div>
            </div>
            
            <div class="help-section">
              <h3>🤖 What Gets Extracted</h3>
              <p>Our AI automatically identifies and logs:</p>
              <ul>
                <li><strong>Decision Summary</strong> - A clear statement of what was decided</li>
                <li><strong>Decision Maker</strong> - Who made the decision</li>
                <li><strong>Decision made with</strong> - Everyone included in the email thread</li>
                <li><strong>Priority Level</strong> - Critical, High, Medium, or Low</li>
                <li><strong>Impact Scope</strong> - Team, Department, or Organization-wide</li>
                <li><strong>Key Points</strong> - Important details and context</li>
                <li><strong>Deadlines</strong> - Any mentioned dates or timelines</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h3>✅ Confirmation Process</h3>
              <p>After detecting a decision, we'll send you a confirmation email with:</p>
              <ul>
                <li>A summary of the extracted decision</li>
                <li>All the identified metadata</li>
                <li>A simple "Confirm Decision" button</li>
                <li>Option to ignore if it's not actually a decision</li>
              </ul>
              <p>Only confirmed decisions are stored in your log.</p>
            </div>
            
            <div class="help-section">
              <h3>🔍 Viewing & Managing Decisions</h3>
              <p>Once confirmed, your decisions appear in this dashboard where you can:</p>
              <ul>
                <li>Search and filter by tags, priority, or date</li>
                <li>View full email threads for context</li>
                <li>Export decisions to PDF for documentation</li>
                <li>Track decision patterns and accountability</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h3>💡 Best Practices</h3>
              <ul>
                <li>Be clear and explicit when stating decisions in emails</li>
                <li>Include relevant stakeholders in the CC field</li>
                <li>Mention deadlines and priorities when applicable</li>
                <li>Use phrases like "we decided", "the decision is", "we will proceed with"</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h3>🔒 Privacy & Security</h3>
              <p>Your data is secure:</p>
              <ul>
                <li>Only you can see your decisions</li>
                <li>Email content is encrypted in transit and at rest</li>
                <li>You can delete decisions at any time</li>
                <li>We never share your data with third parties</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        ${generateClientScripts(totalDecisions, decisionsWithTags)}
      </script>
    </body>
    </html>
  `;

  return html;
}
