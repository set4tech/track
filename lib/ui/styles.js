export const styles = `
  :root {
    --green: #00CC88;
    --dark-green: #003B1B;
    --lime: #BBE835;
    --orange: #ED6506;
    --bg: #FAFAF8;
    --fg: #000000;
    --muted: #f5f5f5;
    --muted-foreground: #666666;
    --border: #000000;
    --card-bg: #FFFEF9;
    --card-border: #000000;
    --green-light: #E6F9F2;
    --green-dark: #006644;
  }
  
  * { box-sizing: border-box; }
  
  body { 
    font-family: 'Space Mono', monospace; 
    max-width: 1250px; margin: 0 auto; padding: 20px; 
    background-color: #FAFAF8;
    background-image: 
      linear-gradient(#F5F5F2 1px, transparent 1px),
      linear-gradient(90deg, #F5F5F2 1px, transparent 1px);
    background-size: 24px 24px;
    background-position: -1px -1px;
    color: var(--fg);
    font-size: 16px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    position: relative;
  }
  
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E");
    opacity: 0.4;
    pointer-events: none;
    z-index: -1;
  }
  
  a { color: inherit; text-decoration: none; }
  a:focus-visible { outline: 2px dashed var(--green); outline-offset: 2px; }
  h1 { font-family: 'Hedvig Letters Serif', serif; color: var(--fg); margin-bottom: 10px; font-weight: 400; }
  .header { 
    background: var(--card-bg); padding: 30px; margin-bottom: 20px; 
    border: 4px solid var(--fg); border-radius: 0;
    position: relative;
  }
  .header::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cardNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23cardNoise)' opacity='0.3'/%3E%3C/svg%3E");
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
  }
  .header > * {
    position: relative;
    z-index: 1;
  }
  .cta-banner {
    background: var(--green);
    color: var(--bg);
    padding: 8px 16px;
    margin: 10px 0;
    text-align: center;
    font-size: 14px;
    border: 4px solid var(--green);
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
    background: var(--green);
    color: var(--bg);
    border-color: var(--green);
    transform: translateY(-4px);
  }
  .stats-section {
    background: var(--card-bg);
    padding: 20px;
    margin-bottom: 20px;
    border: 2px solid var(--border);
    border-radius: 8px;
    transition: all 0.3s ease;
    position: relative;
  }
  .stats-section::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cardNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23cardNoise)' opacity='0.3'/%3E%3C/svg%3E");
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
    border-radius: 8px;
  }
  .stats-section > * {
    position: relative;
    z-index: 1;
  }
  .stats-section:hover {
    border-color: var(--green);
    box-shadow: 0 4px 12px rgba(0, 204, 136, 0.1);
  }
  .stats { display: flex; gap: 12px; margin: 0; flex-wrap: wrap; }
  .stat { 
    background: var(--bg); padding: 6px 12px; 
    border: 2px solid var(--fg); font-weight: 700;
    transition: all 0.15s ease-in-out;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  .stat:hover { 
    border-color: var(--green);
    color: var(--dark-green);
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 204, 136, 0.2);
  }
  .stat.active { 
    background: var(--green);
    color: var(--bg);
    border-color: var(--green);
    animation: pulse 0.3s ease;
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
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
    border-radius: 12px; 
    position: relative;
    cursor: pointer;
    overflow: hidden;
    height: auto;
    min-height: 140px;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .decision::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cardNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23cardNoise)' opacity='0.3'/%3E%3C/svg%3E");
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
    border-radius: 12px;
  }
  .decision > * {
    position: relative;
    z-index: 1;
  }
  .decision.expanded {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(1);
    width: 90%;
    max-width: 800px;
    height: auto;
    z-index: 1000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border-color: var(--green);
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .decision:hover:not(.expanded) { 
    transform: translateY(-2px); 
    border-color: var(--green);
    box-shadow: 0 4px 12px rgba(0, 204, 136, 0.1);
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
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .thread-indicator {
    background: var(--green);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    cursor: help;
    flex-shrink: 0;
  }
  .decision-maker {
    color: var(--fg);
    font-size: 14px;
    margin-top: auto;
  }
  .decision-maker strong {
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.8);
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
  .priority-critical { background: var(--orange); color: var(--bg); font-weight: bold; border: 2px solid var(--orange); }
  .priority-high { background: var(--dark-green); color: var(--bg); border: 2px solid var(--dark-green); }
  .priority-medium { background: var(--bg); color: var(--green); border: 2px solid var(--green); }
  .priority-low { background: var(--bg); color: var(--fg); border: 2px solid var(--fg); }
  .parameters { 
    background: var(--green-light); padding: 15px; margin: 15px 0;
    border-left: 4px solid var(--green); border: 2px solid var(--fg);
  }
  .decision-made-with { color: var(--muted-foreground); font-size: 14px; margin-top: 15px; }
  
  .related-decisions {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid var(--border);
  }
  
  .related-decisions h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--fg);
  }
  
  .related-decisions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .related-decision {
    background: var(--muted);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .related-decision:hover {
    background: var(--green-light);
    border-color: var(--green);
    transform: translateY(-1px);
  }
  
  .related-summary {
    font-size: 13px;
    font-weight: 500;
    color: var(--fg);
    margin-bottom: 5px;
    line-height: 1.3;
  }
  
  .related-meta {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 11px;
    color: var(--muted-foreground);
  }
  
  .related-maker {
    font-weight: 500;
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.8);
  }
  
  .related-priority {
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 500;
    text-transform: uppercase;
  }
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
  .thread-content::after, .help-content::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cardNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23cardNoise)' opacity='0.3'/%3E%3C/svg%3E");
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
  }
  .thread-content > *, .help-content > * {
    position: relative;
    z-index: 1;
  }
  .thread-header, .help-header {
    padding: 20px; border-bottom: 4px solid var(--border); background: var(--bg);
  }
  .thread-body, .help-body {
    padding: 20px; max-height: 60vh; overflow-y: auto;
  }
  .thread-email {
    background: var(--muted); padding: 15px; margin: 10px 0;
    border-left: 4px solid var(--green); font-family: 'Space Mono', monospace; white-space: pre-wrap;
    line-height: 1.4; border: 2px solid var(--border);
  }
  .help-section {
    margin-bottom: 30px;
  }
  .help-section h3 {
    color: var(--dark-green);
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
    background: var(--green); 
    color: var(--bg);
    border-color: var(--green);
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
  .export-button:hover { background: var(--green); border-color: var(--green); transform: translateY(-2px); }
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
    color: var(--fg);
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
  .nav a:hover { background: var(--green); border-color: var(--green); transform: translateY(-4px); }
  .filter-section {
    background: var(--card-bg);
    padding: 20px;
    margin-bottom: 20px;
    border: 4px solid var(--card-border);
    transition: all 0.3s ease;
    position: relative;
  }
  .filter-section::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cardNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23cardNoise)' opacity='0.3'/%3E%3C/svg%3E");
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
  }
  .filter-section > * {
    position: relative;
    z-index: 1;
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
    background: var(--green);
    color: var(--bg);
    border-color: var(--green);
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
    background: var(--green);
    color: var(--bg);
    border-color: var(--green);
  }
  .tag-filter.selected {
    background: var(--green);
    color: var(--bg);
    border-color: var(--green);
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
    background: #f0f9f0;
    border: none;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 10px;
    color: #2d5a2d;
    font-weight: 500;
  }
  
  /* ---------- VISIBILITY CLASSES ---------- */
  .decisions-grid.hidden,
  .timeline.hidden,
  .quote-panel.hidden { display:none; }

  /* ---------- PILLS ---------- */
  #floatingTags {
    position: sticky; top: 10px; z-index: 50;
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-bottom: 20px;
  }
  .tag-filter { border-radius: 9999px; }

  /* ---------- TIMELINE ---------- */
  .timeline {
    display: flex; flex-direction: column; gap: 40px;
    max-width: calc(100% - 360px); margin-top: 20px; margin-right: 360px;
  }
  .timeline-card { position: relative; }
  .timeline-card::before {
    content: ''; position: absolute; left: -24px; top: 0;
    width: 2px; height: 100%; background: var(--fg);
  }
  .timeline-card:last-child::before { display: none; }

  /* ---------- QUOTE PANEL ---------- */
  .quote-panel {
    position: fixed; right: 20px; 
    top: 200px;
    width: 320px;
    max-height: calc(100vh - 240px);
    overflow-y: auto;
    padding: 20px; border: 4px solid var(--fg);
    background: var(--card-bg);
    z-index: 40;
    border-radius: 12px;
  }
  .quote-panel::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='cardNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23cardNoise)' opacity='0.3'/%3E%3C/svg%3E");
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
  }
  .quote-panel > * {
    position: relative;
    z-index: 1;
  }
  .quote-panel h3 { margin-top: 0;
                    font-family: 'Hedvig Letters Serif', serif; }
  .quote-panel blockquote { margin: 0 0 16px 0; font-style: italic; }
  .quote-panel blockquote.highlight { background: var(--muted); }

  /* ---------- TRANSITIONS ---------- */
  body.in-timeline .timeline-card {
    animation: slide-in 0.4s ease-out both;
  }
  @keyframes slide-in {
    from { opacity: 0; transform: translateX(100vw); }
    to   { opacity: 1; transform: translateX(0); }
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
    .timeline {
      margin-right: 0;
      max-width: 100%;
    }
    .quote-panel {
      position: relative;
      right: auto;
      top: auto;
      width: 100%;
      max-height: none;
      margin-top: 20px;
    }
  }
`;
