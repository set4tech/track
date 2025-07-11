export const styles = `
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
  .cta-banner {
    background: var(--muted);
    color: var(--muted-foreground);
    padding: 8px 16px;
    border-radius: 6px;
    margin: 10px 0;
    text-align: center;
    font-size: 14px;
    border: 1px solid var(--border);
  }
  .cta-banner p {
    margin: 0;
  }
  .help-button {
    background: var(--muted);
    border: 2px solid var(--border);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--foreground);
    font-weight: bold;
    z-index: 10;
    position: relative;
  }
  .help-button:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    transform: scale(1.1);
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
  .thread-modal, .help-modal {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,59,27,0.5); z-index: 10000; overflow-y: auto;
  }
  .thread-content, .help-content {
    background: var(--card-bg); margin: 20px auto; max-width: 800px; border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 204, 136, 0.15); position: relative;
    border: 1px solid var(--card-border);
  }
  .thread-header, .help-header {
    padding: 20px; border-bottom: 1px solid var(--border); background: var(--muted);
    border-radius: 12px 12px 0 0;
  }
  .thread-body, .help-body {
    padding: 20px; max-height: 60vh; overflow-y: auto;
  }
  .thread-email {
    background: var(--muted); padding: 15px; border-radius: 8px; margin: 10px 0;
    border-left: 4px solid var(--primary); font-family: monospace; white-space: pre-wrap;
    line-height: 1.4; border: 1px solid var(--border);
  }
  .help-section {
    margin-bottom: 30px;
  }
  .help-section h3 {
    color: var(--primary);
    margin-bottom: 10px;
    font-family: 'Hedvig Letters Serif', serif;
  }
  .help-example {
    background: var(--muted);
    border: 1px solid var(--border);
    padding: 15px;
    border-radius: 8px;
    margin: 10px 0;
    font-family: monospace;
  }
  .close-btn {
    position: absolute; top: 15px; right: 20px; background: none; border: none;
    font-size: 24px; cursor: pointer; color: var(--muted-foreground);
  }
  .close-btn:hover { color: var(--foreground); }
  .view-thread-btn {
    background: rgba(0, 204, 136, 0.15); 
    color: var(--primary); 
    border: 1px solid rgba(0, 204, 136, 0.3); 
    padding: 6px 12px;
    border-radius: 6px; 
    cursor: pointer; 
    font-size: 13px; 
    margin-top: 10px;
    margin-left: 10px;
    transition: all 0.2s;
    display: inline-block;
  }
  .view-thread-btn:hover { 
    background: rgba(0, 204, 136, 0.25); 
    border-color: rgba(0, 204, 136, 0.5);
    transform: translateY(-1px);
  }
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
    background: rgba(0, 204, 136, 0.05);
    padding: 6px 12px;
    border-radius: 20px;
    display: inline-flex;
    margin-bottom: 0;
    border: 1px solid rgba(0, 204, 136, 0.2);
    font-size: 14px;
    transition: all 0.2s;
  }
  .filter-section.minimized .filter-header:hover {
    background: rgba(0, 204, 136, 0.15);
    border-color: rgba(0, 204, 136, 0.4);
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
`;
