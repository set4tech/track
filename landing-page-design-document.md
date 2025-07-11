# Landing Page Design Document

This document contains all CSS and HTML for the signed-out landing page of Decision Tracker.

## CSS Styles

```css
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
}

body { 
    font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    margin: 0; padding: 0; background: var(--background); color: var(--foreground); line-height: 1.6;
}
.hero { 
    background: linear-gradient(135deg, var(--primary) 0%, var(--tertiary) 100%); 
    color: white; text-align: center; padding: 80px 20px;
}
.hero h1 { font-size: 3rem; margin: 0 0 20px 0; font-weight: 700; }
.hero p { font-size: 1.25rem; margin: 0 0 40px 0; opacity: 0.9; }
.cta-button { 
    background: var(--secondary); color: white; padding: 15px 30px; 
    text-decoration: none; border-radius: 8px; display: inline-block;
    font-weight: bold; font-size: 1.1rem; margin: 10px;
    transition: all 0.3s;
}
.cta-button:hover { 
    background: var(--accent); 
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(237, 101, 6, 0.3);
}
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.features { padding: 80px 0; background: var(--muted); }
.features h2 { text-align: center; font-size: 2.5rem; margin-bottom: 60px; color: var(--secondary); }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; }
.feature { 
    text-align: center; padding: 30px; background: white; border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 204, 136, 0.1);
    transition: transform 0.3s, box-shadow 0.3s;
}
.feature:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 204, 136, 0.15);
}
.feature-icon { font-size: 3rem; margin-bottom: 20px; }
.feature h3 { font-size: 1.5rem; margin-bottom: 15px; color: var(--secondary); }
.how-it-works { padding: 80px 0; background: white; }
.how-it-works h2 { color: var(--secondary); }
.step { 
    margin: 40px 0; padding: 30px; background: var(--muted); 
    border-radius: 12px; border-left: 4px solid var(--primary);
}
.step h3 { color: var(--primary); margin-bottom: 15px; }
.footer { background: var(--secondary); color: white; padding: 40px 0; text-align: center; }
.footer a { color: var(--tertiary); text-decoration: none; margin: 0 15px; }
.footer a:hover { color: white; }
h1, h2, h3 {
    font-family: 'Hedvig Letters Serif', serif;
    font-weight: 400;
}
```

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decision Tracker - Automatically Track Team Decisions</title>
    <meta name="description" content="Automatically track and organize team decisions in Slack and email. Never lose track of important decisions again.">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        /* CSS content from above goes here */
    </style>
</head>
<body>
    <div class="hero">
        <div class="container">
            <h1>📋 Decision Tracker</h1>
            <p>Automatically track and organize team decisions in Slack and email</p>
            <a href="/api/slack-install-page" class="cta-button">
                📱 Add to Slack
            </a>
            <a href="/api/index" class="cta-button" style="background: rgba(255,255,255,0.2);">
                🔍 View Demo
            </a>
        </div>
    </div>

    <div class="features">
        <div class="container">
            <h2>Why Decision Tracker?</h2>
            <div class="feature-grid">
                <div class="feature">
                    <div class="feature-icon">🤖</div>
                    <h3>Automatic Detection</h3>
                    <p>AI automatically detects decisions in your Slack messages and emails. No manual logging required.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">✅</div>
                    <h3>Confirmation Flow</h3>
                    <p>Smart confirmation system ensures only real decisions are logged, reducing noise and false positives.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔍</div>
                    <h3>Easy Search</h3>
                    <p>Find past decisions instantly with powerful search. Use /decisions in Slack or browse the web interface.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h3>Secure & Private</h3>
                    <p>Your data stays in your workspace. Each team's decisions are completely isolated and secure.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📊</div>
                    <h3>Rich Context</h3>
                    <p>Captures decision context, priority, impact scope, and key stakeholders automatically.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>Multi-Platform</h3>
                    <p>Works with both Slack and email. CC decisions@bot.set4.io or use the Slack integration.</p>
                </div>
            </div>
        </div>
    </div>

    <div class="how-it-works">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 60px;">How It Works</h2>
            
            <div class="step">
                <h3>1. Install the App</h3>
                <p>Add Decision Tracker to your Slack workspace with one click. No complex setup required.</p>
            </div>
            
            <div class="step">
                <h3>2. Make Decisions Naturally</h3>
                <p>Continue making decisions in Slack as usual. Say things like "We decided to use React" or "The decision is to launch next week".</p>
            </div>
            
            <div class="step">
                <h3>3. Confirm Important Decisions</h3>
                <p>When the AI detects a decision, you'll get a private confirmation message. Click "Confirm" to log it.</p>
            </div>
            
            <div class="step">
                <h3>4. Search and Reference</h3>
                <p>Use /decisions to see recent decisions or /decisions search [query] to find specific ones. Access the web dashboard anytime.</p>
            </div>
        </div>
    </div>

    <div class="footer">
        <div class="container">
            <p>&copy; 2025 Decision Tracker. Built for teams who value transparency and accountability.</p>
            <div>
                <a href="/privacy.html">Privacy Policy</a>
                <a href="/terms.html">Terms of Service</a>
                <a href="/support.html">Support</a>
                <a href="/api/index">Dashboard</a>
            </div>
        </div>
    </div>
</body>
</html>
```

## Design Overview

### Color Palette
- **Primary**: #00CC88 (Bright green)
- **Secondary**: #003B1B (Dark green)
- **Tertiary**: #BBE835 (Lime green)
- **Accent**: #ED6506 (Orange)
- **Background**: #ffffff (White)
- **Foreground**: #003B1B (Dark green)
- **Muted**: #f0fdf4 (Light green tint)
- **Muted Foreground**: #16a34a (Medium green)
- **Border**: #d1fae5 (Light green)

### Typography
- **Body Text**: Instrument Sans (Google Font), with system font fallbacks
- **Headings**: Hedvig Letters Serif (Google Font)
- **Base Font Size**: 16px (browser default)
- **Line Height**: 1.6

### Layout Structure
1. **Hero Section**
   - Gradient background (primary to tertiary)
   - Large emoji + title
   - Subtitle description
   - Two CTA buttons (Add to Slack, View Demo)

2. **Features Section**
   - Light green background (#f0fdf4)
   - 6 feature cards in responsive grid
   - Each card has: emoji icon, title, description
   - Hover effects with subtle shadow and lift

3. **How It Works Section**
   - White background
   - 4 sequential steps
   - Each step in a card with green left border
   - Numbered steps with descriptions

4. **Footer**
   - Dark green background (#003B1B)
   - Copyright text
   - Navigation links (Privacy, Terms, Support, Dashboard)

### Interactive Elements
- **CTA Buttons**: Dark green with white text, orange on hover with shadow
- **Feature Cards**: Lift effect on hover with enhanced shadow
- **Footer Links**: Lime green text, white on hover

### Responsive Design
- Container max-width: 1200px
- Feature grid: auto-fit with minimum 300px columns
- Padding adjusts for mobile devices
- Font sizes are relative (rem units)