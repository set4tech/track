# Tag Filter Redesign - Complete Technical Documentation

## Overview
This document contains ALL the relevant code for redesigning the tag filtering system from a boxed filter section to floating pills/lozenges that trigger a timeline view when clicked.

## Proposed Changes Summary

### Current State
- Filters are contained in a collapsible box at the top of the page
- Clicking tags filters the grid of decision tiles
- Decision tiles remain in a grid layout after filtering

### New Design Requirements
1. **Floating Pills**: Replace filter box with floating tag pills/lozenges at the top
2. **Timeline View**: When a tag is clicked, tiles slide to the left forming a vertical timeline
3. **Timeline Details**: 
   - Latest decision at top, earliest at bottom
   - Connecting lines between decisions
   - Right side shows quotes from each decision showing evolution over time
4. **Visual Transition**: Smooth animation from grid to timeline view

---

## ALL RELEVANT CODE FILES

### 1. Client-Side JavaScript (`/lib/ui/client-scripts.js`)

This file contains all the client-side filtering logic that needs to be modified:

```javascript
export function generateClientScripts(totalDecisions, decisionsWithTags) {
  return `
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
            '<strong>Date:</strong> <span class="datetime-field" data-date="' + decision.decision_date + '">' + new Date(decision.decision_date).toLocaleString() + '</span><br>' +
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
        closeHelp();
      }
    });
    
    // Help modal functions
    window.showHelp = function() {
      document.getElementById('helpModal').style.display = 'block';
    }
    
    window.closeHelp = function() {
      document.getElementById('helpModal').style.display = 'none';
    }
    
    document.getElementById('helpModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeHelp();
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
            '.decision-made-with { color: #16a34a; margin-top: 20px; } @media print { body { padding: 0; } }</style>' +
            '</head><body><h1>' + decision.decision_summary + '</h1>' +
            '<div class="meta"><strong>Date:</strong> ' + new Date(decision.decision_date).toLocaleString() + '<br>' +
            '<strong>Topic:</strong> ' + decision.topic + '<br><strong>Type:</strong> ' + decision.decision_type + '<br>' +
            '<strong>Priority:</strong> ' + decision.priority + '<br><strong>Impact Scope:</strong> ' + decision.impact_scope + '<br>' +
            (decision.deadline ? '<strong>Deadline:</strong> ' + new Date(decision.deadline).toLocaleString() + '<br>' : '') +
            '</div>' +
            (decision.parsed_context && decision.parsed_context.key_points ? 
              '<div class="section"><h3>Key Points</h3><ul>' + 
              decision.parsed_context.key_points.map(function(point) { return '<li>' + point + '</li>'; }).join('') + 
              '</ul></div>' : '') +
            (function() {
              if (!decision.parameters) return '';
              const nonNullParams = Object.entries(decision.parameters).filter(function(entry) {
                return entry[1] !== null && entry[1] !== undefined && entry[1] !== '';
              });
              return nonNullParams.length > 0 ? 
                '<div class="section"><h3>Parameters</h3><div class="parameters">' +
                nonNullParams.map(function(entry) { return '<strong>' + entry[0] + ':</strong> ' + entry[1] + '<br>'; }).join('') +
                '</div></div>' : '';
            })() +
            '<div class="decision-made-with"><strong>Decision Maker:</strong> ' + decision.decision_maker + '<br>' +
            (decision.witnesses && decision.witnesses.length > 0 ? '<strong>Decision made with:</strong> ' + decision.witnesses.join(', ') + '<br>' : '') +
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
        container.innerHTML = \`Showing \${currentCount} of ${totalDecisions} decisions with \${modeText}: <strong>\${tagNames.join(', ')}</strong>\`;
      }
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', initializeFilters);
    

    // Toggle filters visibility
    function toggleFilters() {
      const content = document.getElementById('filterContent');
      const toggle = document.getElementById('filterToggle');
      const section = document.getElementById('filterSection');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.style.transform = 'rotate(180deg)';
        section.classList.remove('minimized');
      } else {
        content.style.display = 'none';
        toggle.style.transform = 'rotate(0deg)';
        section.classList.add('minimized');
      }
    }

    // Convert all dates to user's local timezone
    document.addEventListener('DOMContentLoaded', function() {
      // Convert date-only fields
      document.querySelectorAll('.date-field').forEach(function(element) {
        const utcDate = element.getAttribute('data-date');
        if (utcDate) {
          const localDate = new Date(utcDate).toLocaleDateString();
          element.textContent = localDate;
        }
      });
      
      // Convert date-time fields
      document.querySelectorAll('.datetime-field').forEach(function(element) {
        const utcDate = element.getAttribute('data-date');
        if (utcDate) {
          const localDateTime = new Date(utcDate).toLocaleString();
          element.textContent = localDateTime;
        }
      });
    });
  `;
}
```

**Key Functions to Modify:**
- `toggleTag()` - Currently filters grid, needs to trigger timeline view
- `applyFilters()` - Currently reloads page with filters, needs to animate to timeline
- `updateActiveFiltersDisplay()` - Shows filter status, may need timeline-specific messaging
- `clearAllFilters()` - Should return from timeline to grid view
- `toggleFilters()` - Manages filter box visibility, needs to be removed/replaced

---

### 2. HTML Generation (`/lib/ui/html-generator.js`)

This file generates the HTML structure including the filter section:

```javascript
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
  generateIntegratedAuthHTML
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
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <h1 style="margin: 0; font-size: 32px;">set4</h1>
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
              <button onclick="clearAllFilters()" style="background: var(--fg); color: var(--bg); border: 4px solid var(--fg); padding: 6px 12px; font-size: 14px; cursor: pointer; font-weight: 700; transition: transform 0.15s ease-in-out;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                Clear All
              </button>
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
                `Showing ${decisionsWithTags.length} of ${totalDecisions} decisions with ${filterMode === 'all' ? 'all of' : 'any of'}: <strong>${tagIds.map(id => {
                  const tag = availableTags.find(t => t.id == id);
                  return tag ? tag.name : id;
                }).join(', ')}</strong>`
              }
            </div>
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
            <button class="remove-button" onclick="event.stopPropagation(); removeDecision(${decision.id})" title="Remove decision">−</button>
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
              
              ${parsedContext.key_points && parsedContext.key_points.length > 0 ? `
                <div class="parameters">
                  <strong>Key Points:</strong>
                  <ul style="margin: 10px 0 0 0;">
                    ${parsedContext.key_points.map(point => `<li>${point}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              ${(() => {
                const nonNullParams = Object.entries(params).filter(([k, v]) => v !== null && v !== undefined && v !== '');
                return nonNullParams.length > 0 ? `
                  <div class="parameters">
                    <strong>Parameters:</strong>
                    ${nonNullParams.map(([k,v]) => `<br>• <strong>${k}:</strong> ${v}`).join('')}
                  </div>
                ` : '';
              })()}
              
              <div class="decision-made-with">
                <strong>Decision Maker:</strong> ${decision.decision_maker}<br>
                ${witnesses.length > 0 ? `<strong>Decision made with:</strong> ${witnesses.join(', ')}` : 'No one else involved'}
                <br><small>Confirmed: <span class="datetime-field" data-date="${decision.confirmed_at}">${new Date(decision.confirmed_at).toLocaleString()}</span></small>
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
```

**Key Sections to Modify:**
- **Filter Section** (lines 57-103) - Replace with floating pills
- **Decisions Grid** (line 119) - Add timeline container alternative
- **Decision Tiles** (lines 120-193) - Need data attributes for timeline positioning
- Add new timeline view container and quote display area

---

### 3. CSS Styles (`/lib/ui/styles.js`)

All styling for the current filter system and decision grid:

```javascript
export const styles = `
  :root {
    --green: #00CC88;
    --dark-green: #003B1B;
    --lime: #BBE835;
    --orange: #ED6506;
    --bg: #ffffff;
    --fg: #000000;
    --muted: #f5f5f5;
    --muted-foreground: #666666;
    --border: #000000;
    --card-bg: #ffffff;
    --card-border: #000000;
  }
  
  * { box-sizing: border-box; }
  
  body { 
    font-family: 'Space Mono', monospace; 
    max-width: 1250px; margin: 0 auto; padding: 20px; 
    background: var(--bg); color: var(--fg);
    font-size: 16px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  
  a { color: inherit; text-decoration: none; }
  a:focus-visible { outline: 2px dashed var(--orange); outline-offset: 2px; }
  h1 { font-family: 'Hedvig Letters Serif', serif; color: var(--fg); margin-bottom: 10px; font-weight: 400; }
  .header { 
    background: var(--card-bg); padding: 30px; margin-bottom: 20px; 
    border: 4px solid var(--fg); border-radius: 0;
  }
  .cta-banner {
    background: var(--orange);
    color: var(--bg);
    padding: 8px 16px;
    margin: 10px 0;
    text-align: center;
    font-size: 14px;
    border: 4px solid var(--orange);
    font-weight: 700;
  }
  .cta-banner p {
    margin: 0;
  }
  .help-button {
    background: var(--bg);
    border: 4px solid var(--fg);
    width: 40px;
    height: 40px;
    border-radius: 0;
    cursor: pointer;
    transition: transform 0.15s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg);
    font-weight: 700;
    z-index: 10;
    position: relative;
  }
  .help-button:hover {
    background: var(--fg);
    color: var(--bg);
    transform: translateY(-4px);
  }
  .stats { display: flex; gap: 20px; margin-top: 15px; }
  .stat { 
    background: var(--bg); padding: 10px 15px; 
    border: 2px solid var(--fg); font-weight: 700;
  }
  .decisions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }
  .decision { 
    background: var(--card-bg); 
    border: 4px solid var(--card-border); 
    padding: 24px; 
    border-radius: 0; 
    position: relative;
    cursor: pointer;
    overflow: hidden;
    height: auto;
    min-height: 140px;
    display: flex;
    flex-direction: column;
    transition: transform 0.15s ease-in-out;
  }
  .decision.expanded {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 800px;
    height: auto;
    z-index: 1000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border-color: var(--orange);
  }
  .decision:hover:not(.expanded) { 
    transform: translateY(-4px); 
    border-color: var(--orange);
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
    color: var(--fg); 
    font-size: 1.25rem;
    font-weight: 400;
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
    background: var(--bg); padding: 4px 8px;
    border: 2px solid var(--fg); font-weight: 700;
  }
  .priority-critical { background: var(--fg); color: var(--bg); font-weight: bold; border: 2px solid var(--fg); }
  .priority-high { background: var(--orange); color: var(--bg); border: 2px solid var(--orange); }
  .priority-medium { background: var(--bg); color: var(--orange); border: 2px solid var(--orange); }
  .priority-low { background: var(--bg); color: var(--fg); border: 2px solid var(--fg); }
  .parameters { 
    background: var(--muted); padding: 15px; margin: 15px 0;
    border-left: 4px solid var(--orange); border: 2px solid var(--fg);
  }
  .decision-made-with { color: var(--muted-foreground); font-size: 14px; margin-top: 15px; }
  .empty { text-align: center; padding: 60px 20px; color: var(--muted-foreground); }
  .nav { text-align: center; margin-bottom: 20px; }
  .thread-modal, .help-modal {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); z-index: 10000; overflow-y: auto;
  }
  .thread-content, .help-content {
    background: var(--card-bg); margin: 20px auto; max-width: 800px;
    position: relative;
    border: 4px solid var(--card-border);
  }
  .thread-header, .help-header {
    padding: 20px; border-bottom: 4px solid var(--border); background: var(--bg);
  }
  .thread-body, .help-body {
    padding: 20px; max-height: 60vh; overflow-y: auto;
  }
  .thread-email {
    background: var(--muted); padding: 15px; margin: 10px 0;
    border-left: 4px solid var(--orange); font-family: 'Space Mono', monospace; white-space: pre-wrap;
    line-height: 1.4; border: 2px solid var(--border);
  }
  .help-section {
    margin-bottom: 30px;
  }
  .help-section h3 {
    color: var(--orange);
    margin-bottom: 10px;
    font-family: 'Hedvig Letters Serif', serif;
    font-weight: 400;
  }
  .help-example {
    background: var(--muted);
    border: 2px solid var(--border);
    padding: 15px;
    margin: 10px 0;
    font-family: 'Space Mono', monospace;
  }
  .close-btn {
    position: absolute; top: 15px; right: 20px; background: none; border: none;
    font-size: 24px; cursor: pointer; color: var(--muted-foreground);
  }
  .close-btn:hover { color: var(--foreground); }
  .view-thread-btn {
    background: var(--bg); 
    color: var(--fg); 
    border: 2px solid var(--fg); 
    padding: 6px 12px;
    cursor: pointer; 
    font-size: 13px; 
    font-weight: 700;
    margin-top: 10px;
    margin-left: 10px;
    transition: transform 0.15s ease-in-out;
    display: inline-block;
  }
  .view-thread-btn:hover { 
    background: var(--fg); 
    color: var(--bg);
    transform: translateY(-2px);
  }
  .decision .export-button {
    display: none;
  }
  .decision.expanded .export-button {
    display: block;
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: var(--fg);
    color: var(--bg);
    border: 4px solid var(--fg);
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    transition: transform 0.15s ease-in-out;
  }
  .export-button:hover { background: var(--fg); transform: translateY(-2px); }
  .remove-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    color: var(--muted-foreground);
    border: none;
    padding: 4px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    font-weight: normal;
    opacity: 0;
    transition: all 0.2s ease;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .decision:hover .remove-button {
    opacity: 0.7;
  }
  .remove-button:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
  }
  .export-dropdown {
    position: absolute;
    bottom: 100%;
    right: 0;
    margin-bottom: 4px;
    background: var(--card-bg);
    border: 2px solid var(--card-border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
    background: var(--fg); color: var(--bg); padding: 10px 20px; 
    text-decoration: none; margin: 0 10px;
    display: inline-block; transition: transform 0.15s ease-in-out;
    border: 4px solid var(--fg); font-weight: 700;
  }
  .nav a:hover { transform: translateY(-4px); }
  .filter-section {
    background: var(--card-bg);
    padding: 20px;
    margin-bottom: 20px;
    border: 4px solid var(--card-border);
    transition: all 0.3s ease;
  }
  .filter-section.minimized {
    background: transparent;
    padding: 0;
    box-shadow: none;
    border: none;
    margin-bottom: 10px;
  }
  .filter-section.minimized .filter-header {
    background: var(--bg);
    padding: 6px 12px;
    display: inline-flex;
    margin-bottom: 0;
    border: 2px solid var(--fg);
    font-size: 14px;
    transition: all 0.2s;
    font-weight: 700;
  }
  .filter-section.minimized .filter-header:hover {
    background: var(--fg);
    color: var(--bg);
  }
  .filter-section.minimized .filter-title {
    font-weight: 500;
    font-size: 14px;
    margin: 0;
  }
  .filter-section.minimized .filter-toggle {
    font-size: 14px !important;
  }
  .filter-title {
    font-weight: 700;
    margin-bottom: 15px;
    color: var(--fg);
  }
  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .tag-filter {
    background: var(--bg);
    border: 2px solid var(--fg);
    padding: 8px 16px;
    cursor: pointer;
    transition: transform 0.15s ease-in-out;
    text-decoration: none;
    color: var(--fg);
    font-size: 14px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: inherit;
  }
  .tag-filter:hover {
    background: var(--fg);
    color: var(--bg);
    transform: translateY(-2px);
  }
  .tag-filter.active {
    background: var(--orange);
    color: var(--bg);
    border-color: var(--orange);
  }
  .tag-filter.selected {
    background: var(--orange);
    color: var(--bg);
    border-color: var(--orange);
  }
  .tag-count {
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 8px;
    font-size: 12px;
    font-weight: 400;
  }
  .decision-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 10px;
  }
  .decision-tag {
    background: var(--bg);
    border: 2px solid var(--fg);
    padding: 4px 10px;
    font-size: 12px;
    color: var(--fg);
    font-weight: 700;
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
`;
```

**Key Styles to Modify/Add:**
- **Filter Section Styles** (lines 311-420) - Remove boxed filter styles
- **Tag Filter Styles** (lines 352-392) - Convert to floating pill styles
- **Decision Grid** (lines 70-75) - Add timeline layout alternative
- **Decision Tiles** (lines 76-102) - Add timeline positioning styles
- Add new styles for:
  - Floating tag pills
  - Timeline container
  - Timeline connectors
  - Quote display area
  - Transition animations

---

### 4. API Endpoints

#### Main Dashboard (`/api/index.js`)
Handles tag filtering and passes data to HTML generator:

```javascript
import { getConfig } from '../lib/config.js';
import { requireAuth, generateCSRFToken } from '../lib/auth.js';
import { generateIntegratedAuthHTML } from '../lib/auth-ui.js';
import { getDecisionsForUser, getDecisionsWithTags, getAllAvailableTags, getTotalDecisionsCount } from '../lib/decision-queries.js';
import { generateDecisionHTML } from '../lib/ui/html-generator.js';
import { getTagsForDecision } from '../lib/tag-extractor.js';

export default async function handler(req, res) {
  try {
    console.log('Starting index handler...');
    const { team_id, tags, filter_mode = 'any', role } = req.query;
    const config = getConfig();
    console.log('Config loaded:', config.environment);

    // Check authentication
    const auth = await requireAuth(req, res);
    console.log('Auth check complete:', auth.authenticated);

    // Generate CSRF token for auth forms
    const csrfToken = generateCSRFToken();

    // Parse tags from query string (can be comma-separated or array)
    const tagIds = tags ? (Array.isArray(tags) ? tags : tags.split(',')).map(id => parseInt(id, 10)) : [];
    
    // Fetch decisions for user
    const rows = await getDecisionsForUser(auth, team_id, tagIds, filter_mode);
    
    // Fetch tags for each decision
    const decisionsWithTags = await getDecisionsWithTags(rows);
    
    // Get all available tags for the filter
    const availableTags = await getAllAvailableTags();
    
    // Get total count of user's decisions for display
    const totalDecisions = await getTotalDecisionsCount(auth);
    
    const html = generateDecisionHTML({
      config,
      auth,
      csrfToken,
      decisionsWithTags,
      availableTags,
      totalDecisions,
      tagIds,
      filterMode: filter_mode,
      generateIntegratedAuthHTML
    });
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('UI error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
}
```

#### Tags API (`/api/tags.js`)
Returns all available tags with counts:

```javascript
import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  try {
    const result = await sql`
      SELECT 
        t.id, 
        t.name, 
        t.description, 
        t.usage_count,
        COUNT(DISTINCT dt.decision_id) as decision_count
      FROM tags t
      LEFT JOIN decision_tags dt ON t.id = dt.tag_id
      GROUP BY t.id, t.name, t.description, t.usage_count
      ORDER BY t.usage_count DESC, t.name ASC
    `;
    
    res.status(200).json({
      tags: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

---

### 5. Database Queries (`/lib/decision-queries.js`)

Contains all the SQL queries for filtering decisions by tags:

```javascript
import { sql } from './database.js';
import { getTagsForDecision } from './tag-extractor.js';

export async function getDecisionsForUser(auth, teamId, tagIds, filterMode) {
  let rows;
  
  // Only show decisions if authenticated
  if (!auth.authenticated) {
    return [];
  } else if (tagIds.length > 0) {
    // Filter by multiple tags
    if (filterMode === 'all') {
      // AND logic - decisions must have ALL selected tags
      const result = teamId ? 
        await sql`
          SELECT d.* 
          FROM decisions d
          WHERE d.status = 'confirmed'
            AND d.slack_team_id = ${teamId}
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
      const result = teamId ?
        await sql`
          SELECT DISTINCT d.* 
          FROM decisions d
          JOIN decision_tags dt ON d.id = dt.decision_id
          WHERE d.status = 'confirmed' 
            AND dt.tag_id = ANY(${tagIds})
            AND d.slack_team_id = ${teamId}
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
  } else if (teamId) {
    const result = await sql`
      SELECT * FROM decisions 
      WHERE status = 'confirmed' 
        AND slack_team_id = ${teamId}
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
  
  return rows;
}

export async function getDecisionsWithTags(rows) {
  try {
    const decisionsWithTags = await Promise.all(
      rows.map(async (decision) => {
        const tags = await getTagsForDecision(decision.id);
        return {
          ...decision,
          tags
        };
      })
    );
    return decisionsWithTags;
  } catch (tagError) {
    console.error('Error fetching tags:', tagError);
    // Return decisions without tags if there's an error
    return rows;
  }
}

export async function getAllAvailableTags() {
  try {
    const result = await sql`
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
    return result.rows;
  } catch (error) {
    console.error('Error fetching available tags:', error);
    return [];
  }
}

export async function getTotalDecisionsCount(auth) {
  if (!auth.authenticated) {
    return 0;
  }
  
  const result = await sql`
    SELECT COUNT(*) as total FROM decisions 
    WHERE status = 'confirmed'
      AND (user_id = ${auth.user.id} OR created_by_email = ${auth.user.email} OR decision_maker = ${auth.user.email})
  `;
  return result.rows[0].total;
}
```

---

## Implementation Guide

### Changes Required:

1. **Replace Filter Box with Floating Pills**
   - Remove `.filter-section` HTML and styles
   - Create new floating pills container
   - Style pills to float at top of page
   - Maintain tag selection state

2. **Add Timeline View Mode**
   - Create timeline container alongside grid
   - Add CSS for timeline layout (vertical)
   - Style timeline connectors between decisions
   - Position tiles chronologically (newest at top)

3. **Add Quote Display Panel**
   - Create right-side panel for decision quotes
   - Extract key quotes from decision summaries
   - Show how decisions evolved over time
   - Synchronize with timeline scrolling

4. **Implement View Transitions**
   - Animate from grid to timeline when tag clicked
   - Slide tiles to left side
   - Fade in timeline connectors
   - Slide in quote panel from right

5. **Update JavaScript Logic**
   - Modify `toggleTag()` to trigger timeline view
   - Add timeline building logic
   - Extract and display decision quotes
   - Handle return to grid view

6. **Preserve Existing Functionality**
   - Keep URL parameter handling
   - Maintain filter logic (any/all)
   - Preserve decision expansion on click
   - Keep modals and other features

### Data Available in Decision Objects:
- `id`: Unique identifier
- `decision_summary`: Main text to extract quotes from
- `decision_date`: For chronological ordering
- `confirmed_at`: Alternative date for ordering
- `decision_maker`: Who made the decision
- `topic`: Decision topic
- `priority`: Priority level
- `tags`: Array of associated tags
- `parsed_context.key_points`: Additional quote sources

---

## Database Schema Reference

The tag system uses these tables:

```sql
-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for many-to-many relationship
CREATE TABLE decision_tags (
  decision_id INTEGER REFERENCES decisions(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (decision_id, tag_id)
);
```

This completes the comprehensive documentation of all code related to the tag filtering system that needs to be modified for the timeline view feature.