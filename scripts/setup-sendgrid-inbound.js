#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.error('❌ Missing SENDGRID_API_KEY in .env.local');
  process.exit(1);
}

// SendGrid Inbound Parse API endpoints
const INBOUND_PARSE_API = 'https://api.sendgrid.com/v3/user/webhooks/parse/settings';

async function listInboundParseSettings() {
  try {
    const response = await fetch(INBOUND_PARSE_API, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error listing settings:', error);
    return [];
  }
}

async function createInboundParse(hostname, url, spamCheck = true, sendRaw = false) {
  try {
    const response = await fetch(INBOUND_PARSE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname,
        url,
        spam_check: spamCheck,
        send_raw: sendRaw
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error creating inbound parse for ${hostname}:`, error.message);
    return null;
  }
}

async function deleteInboundParse(hostname) {
  try {
    const response = await fetch(`${INBOUND_PARSE_API}/${hostname}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error(`Error deleting ${hostname}:`, error);
    return false;
  }
}

// Main setup function
async function setupInboundParse() {
  console.log('🔧 SendGrid Inbound Parse Setup\n');
  
  // List existing settings
  console.log('📋 Current inbound parse settings:');
  const existing = await listInboundParseSettings();
  
  if (existing.length > 0) {
    existing.forEach(setting => {
      console.log(`  - ${setting.hostname} → ${setting.url}`);
    });
  } else {
    console.log('  No inbound parse settings found');
  }
  
  console.log('\n⚠️  IMPORTANT: Before running this script:');
  console.log('1. Add these MX records to your DNS (bot.set4.io):');
  console.log('   - mx.sendgrid.net (priority 10)');
  console.log('2. Verify domain ownership in SendGrid');
  console.log('3. Update the webhook URLs below with your actual deployment URLs\n');
  
  // Configuration for each environment
  // All webhooks go to production URL, which will handle routing based on email address
  const environments = [
    {
      hostname: 'bot.set4.io',
      url: 'https://track-set4.vercel.app/api/webhook-inbound',
      description: 'All environments (decisions@bot.set4.io)'
    }
  ];
  
  console.log('\n📌 NOTE: All emails will be routed through the production webhook.');
  console.log('The webhook will detect the environment based on the email address used.');
  
  console.log('📝 Environments to configure:');
  environments.forEach(env => {
    console.log(`  - ${env.description}`);
    console.log(`    ${env.hostname} → ${env.url}`);
  });
  
  console.log('\n❓ Do you want to proceed? (y/n)');
  
  // Simple readline interface for user input
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.on('line', async (input) => {
    const key = input.trim().toLowerCase();
    if (key === 'y' || key === 'Y') {
      console.log('\n🚀 Setting up inbound parse webhooks...\n');
      
      for (const env of environments) {
        console.log(`Setting up ${env.description}...`);
        
        // Check if already exists
        const exists = existing.find(s => s.hostname === env.hostname);
        if (exists) {
          console.log(`  ⚠️  Already exists. Deleting old configuration...`);
          await deleteInboundParse(env.hostname);
        }
        
        // Create new
        const result = await createInboundParse(env.hostname, env.url);
        if (result) {
          console.log(`  ✅ Created successfully`);
        } else {
          console.log(`  ❌ Failed to create`);
        }
      }
      
      console.log('\n✅ Setup complete!');
      console.log('\n📧 You can now use these email addresses:');
      console.log('  - decisions@bot.set4.io (production)');
      console.log('  - previewdecisions@preview.bot.set4.io (preview)');
      console.log('  - devdecisions@dev.bot.set4.io (development)');
      
    } else if (key === 'n') {
      console.log('\nCancelled');
    }
    
    rl.close();
    process.exit();
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupInboundParse();
}