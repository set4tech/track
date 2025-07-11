# Application UI Documentation - Decision Tracker

## Overview

This document provides comprehensive documentation of the CSS styling and HTML structure for the Decision Tracker application. The application features a modern, monospace-driven design with a focus on decision tiles/cards and interactive filtering.

## Color Palette & Design System

### CSS Variables
```css
:root {
  --green: #00CC88;           /* Primary brand green */
  --dark-green: #003B1B;      /* Dark variant for contrast */
  --lime: #BBE835;            /* Accent lime green */
  --orange: #ED6506;          /* Orange for warnings/critical */
  --bg: #ffffff;              /* Main background */
  --fg: #000000;              /* Foreground text */
  --muted: #f5f5f5;           /* Muted background */
  --muted-foreground: #666666;/* Muted text */
  --border: #000000;          /* Default border */
  --card-bg: #ffffff;         /* Card background */
  --card-border: #000000;     /* Card border */
  --green-light: #E6F9F2;     /* Light green for highlights */
  --green-dark: #006644;      /* Dark green variant */
}
```

### Additional Color Palette (Used in JS)
```javascript
const colors = [
  '#00CC88', // green
  '#003B1B', // dark-green
  '#BBE835', // lime
  '#ED6506', // orange
  '#006644', // green-dark
];
```

## Typography

### Font Families
- **Primary**: `'Space Mono', monospace` - Used for body text and UI elements
- **Headings**: `'Hedvig Letters Serif', serif` - Used for headings and titles
- **Google Fonts Import**: 
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Hedvig+Letters+Serif:opsz@12..24&display=swap" rel="stylesheet">
  ```

### Font Styling
- **Body**: 16px, line-height: 1.5, antialiased
- **Headings**: Serif font family, font-weight: 400 (regular)
- **Bold Elements**: font-weight: 700

## Layout Structure

### Main Container
```css
body { 
  font-family: 'Space Mono', monospace; 
  max-width: 1250px; 
  margin: 0 auto; 
  padding: 20px; 
  background: var(--bg); 
  color: var(--fg);
}
```

### Header Section
```css
.header { 
  background: var(--card-bg); 
  padding: 30px; 
  margin-bottom: 20px; 
  border: 4px solid var(--fg); 
  border-radius: 0;
}
```

### HTML Structure
```html
<div class="header">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <!-- Logo and branding -->
    <div style="display: flex; align-items: center; gap: 4px;">
      <img src="/set4-logo.svg" alt="Set4" style="height: 40px;">
      <span style="font-size: 20px; color: #888;">track</span>
    </div>
    
    <!-- Auth and help button -->
    <div style="display: flex; align-items: center; gap: 12px;">
      <!-- Auth UI -->
      <button class="help-button" onclick="showHelp()">?</button>
    </div>
  </div>
  <p style="font-size: 14px; color: #666;">cc decisions@bot.set4.io</p>
</div>
```

## Decision Tiles/Cards - Core UI Component

### Grid Layout
```css
.decisions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}
```

### Decision Card Styling
```css
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.decision:hover:not(.expanded) { 
  transform: translateY(-4px); 
  border-color: var(--green);
}
```

### Decision Card HTML Structure
```html
<div class="decision" data-id="${decision.id}">
  <!-- Remove button -->
  <button class="remove-button" onclick="removeDecision(${decision.id})">−</button>
  
  <!-- Main title -->
  <h3>
    ${decision.decision_summary}
    <span class="thread-indicator">🧵 ${threadCount}</span>
  </h3>
  
  <!-- Decision maker -->
  <div class="decision-maker">
    <strong style="color: ${dynamicColor}">${decision.decision_maker}</strong>
  </div>
  
  <!-- Tags -->
  <div class="decision-tags">
    <span class="decision-tag">${tag.name}</span>
  </div>
  
  <!-- Expandable details -->
  <div class="decision-details">
    <!-- Export button -->
    <button class="export-button">Export</button>
    
    <!-- Metadata -->
    <div class="meta">
      <span>📅 ${date}</span>
      <span>🏷️ ${topic}</span>
      <span>📊 ${type}</span>
      <span class="priority-${priority}">⚡ ${priority}</span>
    </div>
    
    <!-- Parameters and details -->
    <div class="parameters">
      <strong>Key Points:</strong>
      <ul>${keyPoints}</ul>
    </div>
  </div>
</div>
```

## Interactive Elements

### Floating Tag Filters
```css
#floatingTags {
  position: sticky; 
  top: 10px; 
  z-index: 50;
  display: flex; 
  flex-wrap: wrap; 
  gap: 10px;
  margin-bottom: 20px;
}

.tag-filter {
  background: var(--bg);
  border: 2px solid var(--fg);
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 9999px; /* Pill shape */
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.15s ease-in-out;
}

.tag-filter:hover {
  background: var(--fg);
  color: var(--bg);
  transform: translateY(-2px);
}

.tag-filter.selected {
  background: var(--green);
  color: var(--bg);
  border-color: var(--green);
}
```

### HTML Structure for Tag Filters
```html
<div id="floatingTags" class="floating-tags">
  <button class="tag-filter selected" data-tag-id="1" onclick="toggleTag(this)">
    Marketing
    <span class="tag-count">5</span>
  </button>
</div>
```

### Buttons and Interactive Elements
```css
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
  font-weight: 700;
}

.help-button:hover {
  background: var(--green);
  color: var(--bg);
  border-color: var(--green);
  transform: translateY(-4px);
}
```

## Expanded Decision Modal

### CSS for Expanded State
```css
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
  border-color: var(--green);
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
```

## Priority System

### Priority Classes
```css
.priority-critical { 
  background: var(--orange); 
  color: var(--bg); 
  border: 2px solid var(--orange); 
}

.priority-high { 
  background: var(--dark-green); 
  color: var(--bg); 
  border: 2px solid var(--dark-green); 
}

.priority-medium { 
  background: var(--bg); 
  color: var(--green); 
  border: 2px solid var(--green); 
}

.priority-low { 
  background: var(--bg); 
  color: var(--fg); 
  border: 2px solid var(--fg); 
}
```

## Timeline View

### Timeline Layout
```css
.timeline {
  display: flex; 
  flex-direction: column; 
  gap: 40px;
  max-width: 780px; 
  margin-top: 20px; 
  margin-right: 360px;
}

.timeline-card { 
  position: relative; 
}

.timeline-card::before {
  content: ''; 
  position: absolute; 
  left: -24px; 
  top: 0;
  width: 2px; 
  height: 100%; 
  background: var(--fg);
}
```

### Quote Panel
```css
.quote-panel {
  position: fixed; 
  right: 0; 
  top: calc(var(--header-height, 180px) + var(--floating-tags-height, 80px) + 40px);
  width: 340px;
  max-height: calc(100vh - var(--header-height, 180px) - var(--floating-tags-height, 80px) - 40px);
  overflow-y: auto;
  padding: 20px; 
  border-left: 4px solid var(--fg);
  background: var(--card-bg);
  z-index: 40;
}
```

## Animations and Transitions

### Slide-in Animation
```css
@keyframes slide-in {
  from { opacity: 0; transform: translateX(100vw); }
  to   { opacity: 1; transform: translateX(0); }
}

body.in-timeline .timeline-card {
  animation: slide-in 0.4s ease-out both;
}
```

### Pulse Animation
```css
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.stat.active { 
  animation: pulse 0.3s ease;
}
```

## Modals

### Thread Modal
```css
.thread-modal {
  display: none; 
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  background: rgba(0,0,0,0.7); 
  z-index: 10000; 
  overflow-y: auto;
}

.thread-content {
  background: var(--card-bg); 
  margin: 20px auto; 
  max-width: 800px;
  position: relative;
  border: 4px solid var(--card-border);
}
```

### Modal Structure
```html
<div id="threadModal" class="thread-modal">
  <div class="thread-content">
    <button class="close-btn" onclick="closeThread()">&times;</button>
    <div class="thread-header">
      <h2 id="threadTitle">Email Thread</h2>
      <div id="threadMeta"></div>
    </div>
    <div class="thread-body">
      <div id="threadContent">Loading...</div>
    </div>
  </div>
</div>
```

## Responsive Design

### Mobile Breakpoints
```css
@media (max-width: 768px) {
  .meta { 
    flex-direction: column; 
    gap: 8px; 
  }
  
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
```

## Key Interactive Features

### JavaScript Functionality
1. **Decision Card Expansion**: Click to expand cards into modal view
2. **Tag Filtering**: Toggle tag filters with visual feedback
3. **Timeline View**: Automatic switch to timeline when tags are selected
4. **Export to PDF**: Generate PDF reports of decisions
5. **Thread Viewing**: View full email threads in modal
6. **Decision Removal**: Delete decisions with confirmation

### State Management
- **Current View**: 'grid' | 'timeline'
- **Selected Tags**: Array of tag IDs
- **Filter Mode**: 'any' | 'all'
- **URL State**: Filters persist in URL parameters

## Design Principles

1. **Monospace Typography**: Creates consistent, technical aesthetic
2. **Bold Borders**: 4px solid borders throughout for strong visual definition
3. **Hover Effects**: Consistent translateY(-4px) and color changes
4. **Color Consistency**: Green primary color with systematic priority colors
5. **Card-Based Layout**: All content in bordered card containers
6. **Responsive Grid**: Auto-fitting grid layout adapts to screen size

This documentation captures the complete styling and structure of the Decision Tracker application, focusing on the tile-based interface and interactive filtering system.