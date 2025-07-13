import { styles } from './styles.js';
import { generateClientScripts } from './client-scripts.js';

// Generate a consistent color for a decision maker based on their name
function getDecisionMakerColor(name) {
  // Define color palette from your design system
  const colors = [
    '#2D5A2D', // dark grey-green (was light green #00CC88)
    '#003B1B', // dark-green
    '#BBE835', // lime
    '#ED6506', // orange
    '#006644', // green-dark
  ];

  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use hash to select from color palette
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

export function generateDecisionHTML({
  config,
  auth,
  csrfToken,
  decisionsWithTags,
  availableTags,
  totalDecisions,
  tagIds,
  generateIntegratedAuthHTML,
  gmailSyncing = false,
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
          <div style="display: flex; align-items: center; gap: 4px;">
            <a href="/api/app" onclick="clearAllFilters(); return false;" style="display: flex; align-items: center; cursor: pointer;" title="Reset all filters">
              <img src="/set4-logo.svg" alt="Set4" style="height: 40px; width: auto;">
            </a>
            <span style="font-size: 20px; color: #888; font-weight: 400; margin-left: -2px;">bot</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${generateIntegratedAuthHTML(auth.authenticated ? auth.user : null, csrfToken)}
            <button class="help-button" onclick="showHelp()" title="How it works">
              <span style="font-size: 20px;">?</span>
            </button>
          </div>
        </div>
        <p style="margin: 10px 0; font-size: 14px; color: #666;">cc me@bot.set4.io</p>
      </div>
      
      ${
        gmailSyncing
          ? `
        <div style="background: #BBE835; border: 3px solid #003B1B; padding: 1.5rem; margin: 1rem 0; text-align: center; font-weight: 600;">
          <div style="display: inline-block; border: 3px solid #003B1B; border-top: 3px solid transparent; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; margin-right: 0.5rem; vertical-align: middle;"></div>
          Gmail is syncing your decisions from the last month... This may take a few minutes.
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </div>
      `
          : ''
      }
      
      ${
        auth.authenticated && availableTags.length > 0 && decisionsWithTags.length > 0
          ? `
        <div id="floatingTags" class="floating-tags">
          ${availableTags
            .map(
              (tag) => `
            <button
              class="tag-filter${tagIds.includes(tag.id) ? ' selected' : ''}"
              data-tag-id="${tag.id}"
              data-tag-name="${tag.name}"
              onclick="toggleTag(this)"
              aria-pressed="${tagIds.includes(tag.id)}">
                ${tag.name}
                <span class="tag-count">${tag.decision_count}</span>
            </button>
          `
            )
            .join('')}
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
        <div class="decisions-grid${tagIds.length ? ' hidden' : ''}">
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
            <h3>
              ${decision.decision_summary}
              ${decision.threadInfo?.hasMultiple ? `<span class="thread-indicator" title="Part of thread with ${decision.threadInfo.totalInThread} decisions">🧵 ${decision.threadInfo.totalInThread}</span>` : ''}
            </h3>
            <div class="decision-maker">
              <strong style="color: ${getDecisionMakerColor(decision.decision_maker)}">${decision.decision_maker}</strong>
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
                <strong>Decision Maker:</strong> <span style="color: ${getDecisionMakerColor(decision.decision_maker)}; font-weight: 700;">${decision.decision_maker}</span><br>
                ${witnesses.length > 0 ? `<strong>Decision made with:</strong> ${witnesses.join(', ')}` : 'No one else involved'}
                <br><small>Confirmed: <span class="datetime-field" data-date="${decision.confirmed_at}">${new Date(decision.confirmed_at).toLocaleString()}</span></small>
                ${decision.raw_thread ? `<button class="view-thread-btn" onclick="event.stopPropagation(); showThread(${decision.id})">📧 View Email Thread</button>` : ''}
              </div>
              
              ${
                decision.threadInfo?.hasMultiple
                  ? `
                <div class="related-decisions">
                  <h4>Other decisions in this thread:</h4>
                  <div class="related-decisions-list">
                    ${decision.threadInfo.relatedDecisions
                      .map(
                        (related) => `
                      <div class="related-decision" onclick="event.stopPropagation(); scrollToDecision(${related.id})">
                        <div class="related-summary">${related.decision_summary}</div>
                        <div class="related-meta">
                          <span class="related-maker" style="color: ${getDecisionMakerColor(related.decision_maker)}; font-weight: 600;">${related.decision_maker}</span>
                          <span class="related-date">${new Date(related.decision_date).toLocaleDateString()}</span>
                          <span class="related-priority priority-${related.priority}">${related.priority}</span>
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        `;
            })
            .join('')}
        </div>
        <div id="timelineContainer" class="timeline hidden" role="list"></div>
        <aside id="quotePanel" class="quote-panel hidden" aria-labelledby="quoteHeading"></aside>
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
