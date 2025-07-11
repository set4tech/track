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