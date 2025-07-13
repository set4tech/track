export function generateClientScripts(totalDecisions, decisionsWithTags) {
  return `
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

    /* ---------- GLOBAL STATE ---------- */
    let currentView   = 'grid';   // 'grid' | 'timeline'
    let selectedTags  = [];
    let filterMode    = 'any';
    
    // Make server data available to client
    const decisionsWithTags = ${JSON.stringify(decisionsWithTags)};

    const timelineContainer = document.getElementById('timelineContainer');
    const quotePanel        = document.getElementById('quotePanel');
    const gridContainer     = document.querySelector('.decisions-grid');

    /* ---------- VIEW SWITCHERS ---------- */
    function switchToTimeline() {
      if (currentView === 'timeline') return;
      buildTimeline();
      gridContainer.classList.add('hidden');
      timelineContainer.classList.remove('hidden');
      quotePanel.classList.remove('hidden');
      document.body.classList.add('in-timeline');
      currentView = 'timeline';
    }

    function switchToGrid() {
      if (currentView === 'grid') return;
      timelineContainer.innerHTML = '';
      gridContainer.classList.remove('hidden');
      timelineContainer.classList.add('hidden');
      quotePanel.classList.add('hidden');
      document.body.classList.remove('in-timeline');
      currentView = 'grid';
    }

    /* ---------- TIMELINE BUILD ---------- */
    function buildTimeline() {
      const subset = filterDecisionsClient();
      timelineContainer.innerHTML = '';
      quotePanel.innerHTML = '<h3 class="quote-heading">Decision Timeline</h3>';

      subset
        .sort((a, b) => new Date(a.confirmed_at) - new Date(b.confirmed_at))
        .forEach(d => {
          const original = document.querySelector(\`.decision[data-id="\${d.id}"]\`);
          const clone    = original.cloneNode(true);
          clone.classList.remove('expanded');
          clone.classList.add('timeline-card');
          timelineContainer.appendChild(clone);

          const sentence = (d.decision_summary || '').split(/[.!?]/)[0]
                       || (d.parsed_context?.key_points?.[0] || '');
          const block    = document.createElement('blockquote');
          block.dataset.id = d.id;
          block.textContent = '"' + sentence.trim() + '" — ' +
                              new Date(d.confirmed_at).toLocaleDateString();
          quotePanel.appendChild(block);

          clone.addEventListener('mouseover', () => {
            quotePanel.querySelectorAll('blockquote')
              .forEach(q => q.classList.toggle('highlight', q === block));
          });
        });
    }

    /* ---------- CLIENT-SIDE FILTER ---------- */
    function filterDecisionsClient() {
      if (selectedTags.length === 0) return decisionsWithTags;
      return decisionsWithTags.filter(dec => {
        const ids = dec.tags.map(t => t.id.toString());
        return filterMode === 'all'
          ? selectedTags.every(t => ids.includes(t))
          : selectedTags.some(t => ids.includes(t));
      });
    }
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
          collapseDecision(expandedDecision);
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
        collapseDecision(decision);
        return;
      }
      
      // Collapse all other decisions
      allDecisions.forEach(d => {
        if (d.classList.contains('expanded')) {
          collapseDecision(d);
        }
      });
      
      // Expand the clicked decision with smooth animation
      expandDecision(decision, event);
    });
    
    function expandDecision(decision, event) {
      // Store the original position and size
      const rect = decision.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Set initial position to match current tile position
      decision.style.position = 'fixed';
      decision.style.top = rect.top + 'px';
      decision.style.left = rect.left + 'px';
      decision.style.width = rect.width + 'px';
      decision.style.height = rect.height + 'px';
      decision.style.transform = 'none';
      decision.style.transition = 'none';
      decision.style.zIndex = '1000';
      
      // Add expanded class and backdrop
      decision.classList.add('expanded');
      toggleBackdrop(true);
      
      // Force reflow
      decision.offsetHeight;
      
      // Calculate target position (centered)
      const targetWidth = Math.min(window.innerWidth * 0.9, 800);
      const targetHeight = 'auto';
      const targetLeft = (window.innerWidth - targetWidth) / 2;
      const targetTop = Math.max(20, (window.innerHeight - 600) / 2); // Approximate height
      
      // Enable smooth transition and animate to center
      decision.style.transition = 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      decision.style.top = targetTop + 'px';
      decision.style.left = targetLeft + 'px';
      decision.style.width = targetWidth + 'px';
      decision.style.height = 'auto';
    }
    
    function collapseDecision(decision) {
      // Animate back with scale down effect
      decision.style.transition = 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      decision.style.transform = 'scale(0.8)';
      decision.style.opacity = '0';
      
      setTimeout(() => {
        decision.classList.remove('expanded');
        decision.style.position = '';
        decision.style.top = '';
        decision.style.left = '';
        decision.style.width = '';
        decision.style.height = '';
        decision.style.transform = '';
        decision.style.transition = '';
        decision.style.zIndex = '';
        decision.style.opacity = '';
        toggleBackdrop(false);
      }, 200);
    }
    
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
            '<strong>From:</strong> <span style="color: ' + getDecisionMakerColor(decision.decision_maker) + '; font-weight: 700;">' + decision.decision_maker + '</span><br>' +
            '<strong>Date:</strong> <span class="datetime-field" data-date="' + decision.decision_date + '">' + new Date(decision.decision_date).toLocaleString() + '</span><br>' +
            '<strong>Topic:</strong> ' + decision.topic + ' | <strong>Type:</strong> ' + decision.decision_type + '<br>' +
            '<strong>Priority:</strong> ' + decision.priority + ' | <strong>Impact:</strong> ' + decision.impact_scope +
            '</div>';
          
          let contentHTML = '';
          
          // Show related decisions if any
          if (decision.relatedDecisions && decision.relatedDecisions.length > 0) {
            contentHTML += '<div style="margin-bottom: 20px; padding: 15px; background: var(--muted); border-radius: 8px;">';
            contentHTML += '<h3 style="margin: 0 0 10px 0; font-size: 16px; color: var(--fg);">Other decisions in this thread:</h3>';
            decision.relatedDecisions.forEach(function(related) {
              contentHTML += '<div style="margin-bottom: 10px; padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;">';
              contentHTML += '<div style="font-weight: 500; margin-bottom: 5px;">' + related.decision_summary + '</div>';
              contentHTML += '<div style="font-size: 12px; color: var(--muted-foreground);">';
              contentHTML += '<span style="margin-right: 15px;"><strong>By:</strong> <span style="color: ' + getDecisionMakerColor(related.decision_maker) + '; font-weight: 600;">' + related.decision_maker + '</span></span>';
              contentHTML += '<span style="margin-right: 15px;"><strong>Date:</strong> ' + new Date(related.decision_date).toLocaleDateString() + '</span>';
              contentHTML += '<span class="priority-' + related.priority + '"><strong>Priority:</strong> ' + related.priority + '</span>';
              contentHTML += '</div></div>';
            });
            contentHTML += '</div>';
          }
          
          if (decision.raw_thread) {
            contentHTML += '<div class="thread-email" style="white-space: pre-wrap; font-family: monospace; background: var(--muted); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">' + decision.raw_thread + '</div>';
          } else {
            contentHTML += '<p style="color: var(--muted-foreground); font-style: italic;">No email thread available for this decision.</p>';
          }
          
          content.innerHTML = contentHTML;
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
            'body { font-family: "Instrument Sans", -apple-system, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000000; background: #ffffff; }' +
            'h1 { font-family: "Hedvig Letters Serif", serif; color: #003B1B; border-bottom: 2px solid #d1fae5; padding-bottom: 10px; }' +
            '.meta { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; color: #000000; }' +
            '.section { margin: 20px 0; color: #000000; } .section h3 { color: #003B1B; margin-bottom: 10px; }' +
            '.parameters { background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #00CC88; color: #000000; }' +
            '.decision-made-with { color: #16a34a; margin-top: 20px; } pre { color: #000000; }' +
            '@media print { body { padding: 0; color: #000000 !important; } * { color: #000000 !important; } }</style>' +
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
            '<div class="decision-made-with"><strong>Decision Maker:</strong> <span style="color: ' + getDecisionMakerColor(decision.decision_maker) + '; font-weight: 700;">' + decision.decision_maker + '</span><br>' +
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
    
    // Multi-tag filtering functionality (state already declared above)
    
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
        button.setAttribute('aria-pressed', 'false');
      } else {
        selectedTags.push(tagId);
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
      }
      
      if (selectedTags.length === 0) {
        history.replaceState(null, '', '/app');
        switchToGrid();
      } else {
        const params = new URLSearchParams({
          tags: selectedTags.join(','),
          filter_mode: filterMode
        });
        history.replaceState(null, '', \`/app?\${params.toString()}\`);
        switchToTimeline();
      }
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
      window.location.href = '/api/app';
    }
    
    function applyFilters() {} // legacy no-op
    
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

    /* ---------- SEARCH FUNCTIONALITY ---------- */
    let searchTimeout;
    let currentSearchQuery = '';
    
    // Initialize search functionality
    function initializeSearch() {
      const searchInput = document.getElementById('searchInput');
      const searchButton = document.getElementById('searchButton');
      const clearButton = document.getElementById('clearSearchButton');
      
      if (!searchInput) return;
      
      // Add event listeners for buttons
      if (searchButton) {
        searchButton.addEventListener('click', () => performSearch());
      }
      
      if (clearButton) {
        clearButton.addEventListener('click', () => clearSearch());
      }
      
      // Search on input with debouncing
      searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        if (query.length === 0) {
          clearSearch();
          return;
        }
        
        if (query.length < 2) {
          hideSearchResults();
          return;
        }
        
        // Show clear button
        clearButton.classList.remove('hidden');
        
        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          performSearch(query);
        }, 300);
      });
      
      // Search on Enter key
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = e.target.value.trim();
          if (query.length >= 2) {
            clearTimeout(searchTimeout);
            performSearch(query);
          }
        }
        
        // Handle escape key
        if (e.key === 'Escape') {
          clearSearch();
        }
      });
      
      // Click outside to close search results
      document.addEventListener('click', function(e) {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !searchContainer.contains(e.target)) {
          hideSearchResults();
        }
      });
    }
    
    async function performSearch(query) {
      if (!query) {
        query = document.getElementById('searchInput').value.trim();
      }
      
      if (query.length < 2) {
        hideSearchResults();
        return;
      }
      
      currentSearchQuery = query;
      showSearchLoading();
      
      try {
        const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}&limit=10&type=all\`);
        const data = await response.json();
        
        if (response.ok) {
          displaySearchResults(data.results, query);
        } else {
          showSearchError(data.error || 'Search failed');
        }
      } catch (error) {
        console.error('Search error:', error);
        showSearchError('Search failed. Please try again.');
      }
    }
    
    function displaySearchResults(results, query) {
      const resultsContainer = document.getElementById('searchResults');
      const loadingContainer = document.getElementById('searchLoading');
      
      loadingContainer.classList.add('hidden');
      
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-no-results">No results found for "' + query + '"</div>';
        resultsContainer.classList.remove('hidden');
        return;
      }
      
      const resultsHTML = results.map(result => {
        const typeLabel = result.type === 'decision' ? 'Decision' : 
                         result.type === 'email' ? 'Email' : 
                         result.type === 'email_body' ? 'Email Content' : 'Result';
        
        const date = result.metadata.date || result.metadata.decision_date || result.created_at;
        const formattedDate = date ? new Date(date).toLocaleDateString() : '';
        
        const maker = result.metadata.decision_maker || result.metadata.from || '';
        
        return \`
          <div class="search-result-item" onclick="handleSearchResultClick('\${result.type}', '\${result.id}')">
            <div class="search-result-title">\${result.title || result.summary}</div>
            <div class="search-result-summary">\${result.summary || ''}</div>
            <div class="search-result-meta">
              <span class="search-result-type">\${typeLabel}</span>
              \${maker ? \`<span>👤 \${maker}</span>\` : ''}
              \${formattedDate ? \`<span>📅 \${formattedDate}</span>\` : ''}
            </div>
          </div>
        \`;
      }).join('');
      
      resultsContainer.innerHTML = resultsHTML;
      resultsContainer.classList.remove('hidden');
    }
    
    function handleSearchResultClick(type, id) {
      hideSearchResults();
      
      if (type === 'decision') {
        // Scroll to the decision if it's visible on the current page
        const decisionElement = document.querySelector(\`.decision[data-id="\${id}"]\`);
        if (decisionElement) {
          scrollToDecision(id);
        } else {
          // Navigate to the decision (it might be filtered out)
          window.location.href = \`/api/app?highlight=\${id}\`;
        }
      } else if (type === 'email' || type === 'email_body') {
        // Show a more user-friendly message for email results
        const message = 'This is an email result. Email viewing functionality can be implemented to show the full email thread or redirect to Gmail.';
        console.log('Email search result clicked:', { type, id, message });
        
        // Create a temporary notification instead of alert
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--primary); color: white; padding: 12px 16px; border-radius: 8px; z-index: 10000; font-size: 14px; max-width: 300px;';
        notification.textContent = 'Email result clicked - feature coming soon!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      }
    }
    
    function showSearchLoading() {
      const resultsContainer = document.getElementById('searchResults');
      const loadingContainer = document.getElementById('searchLoading');
      
      resultsContainer.classList.add('hidden');
      loadingContainer.classList.remove('hidden');
    }
    
    function hideSearchResults() {
      const resultsContainer = document.getElementById('searchResults');
      const loadingContainer = document.getElementById('searchLoading');
      
      resultsContainer.classList.add('hidden');
      loadingContainer.classList.add('hidden');
    }
    
    function showSearchError(message) {
      const resultsContainer = document.getElementById('searchResults');
      const loadingContainer = document.getElementById('searchLoading');
      
      loadingContainer.classList.add('hidden');
      resultsContainer.innerHTML = \`<div class="search-no-results" style="color: #dc2626;">\${message}</div>\`;
      resultsContainer.classList.remove('hidden');
    }
    
    function clearSearch() {
      const searchInput = document.getElementById('searchInput');
      const clearButton = document.getElementById('clearSearchButton');
      
      searchInput.value = '';
      clearButton.classList.add('hidden');
      hideSearchResults();
      currentSearchQuery = '';
      clearTimeout(searchTimeout);
    }
    
    // Note: Search functions are now handled via event listeners instead of global functions

    document.addEventListener('DOMContentLoaded', () => {
      initializeFilters();
      initializeSearch();
      if (selectedTags.length) switchToTimeline();
    });

    // Priority filtering functions
    function filterByPriority(priority) {
      const params = new URLSearchParams(window.location.search);
      params.set('priority', priority);
      
      const queryString = params.toString();
      const newUrl = \`/app?\${queryString}\`;
      window.location.href = newUrl;
    }
    
    function clearPriorityFilter() {
      const params = new URLSearchParams(window.location.search);
      params.delete('priority');
      
      const queryString = params.toString();
      const newUrl = queryString ? \`/app?\${queryString}\` : '/app';
      window.location.href = newUrl;
    }
    
    function showDecisionMakers() {
      // Get all unique decision makers from the current decisions
      const decisionMakers = new Set();
      document.querySelectorAll('.decision-maker strong').forEach(el => {
        decisionMakers.add(el.textContent);
      });
      
      const makersList = Array.from(decisionMakers).join('\\n• ');
      alert('Decision Makers in current view:\\n\\n• ' + makersList);
    }

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

    // Scroll to and highlight a specific decision
    function scrollToDecision(decisionId) {
      const targetDecision = document.querySelector('.decision[data-id="' + decisionId + '"]');
      if (targetDecision) {
        // Close any currently expanded decision
        const expandedDecision = document.querySelector('.decision.expanded');
        if (expandedDecision) {
          expandedDecision.classList.remove('expanded');
          toggleBackdrop(false);
        }
        
        // Scroll to target decision
        targetDecision.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the target decision
        targetDecision.style.outline = '3px solid var(--green)';
        targetDecision.style.outlineOffset = '2px';
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
          targetDecision.style.outline = '';
          targetDecision.style.outlineOffset = '';
        }, 2000);
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
