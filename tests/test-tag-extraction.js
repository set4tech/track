#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';
import { sql } from '../lib/database.js';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testTagExtraction() {
  console.log('🏷️  Testing Tag Extraction System\n');
  
  // Test decisions with different themes
  const testEmails = [
    {
      name: 'Security Decision',
      payload: {
        from: 'cto@company.com',
        to: 'engineering@company.com',
        cc: 'engineering@company.com, decisions+local@bot.set4.io',
        subject: 'Security Infrastructure Decision',
        text: `Team,

I've decided we need to implement a comprehensive security overhaul:
- Switch to OAuth 2.0 for all authentication
- Implement 2FA across all systems
- Budget: $75,000 for security tools and consulting
- Timeline: Complete by end of Q2

This is critical for our compliance requirements.

Best,
CTO`,
        headers: `Message-ID: <security-${Date.now()}@company.com>`
      }
    },
    {
      name: 'Budget Allocation',
      payload: {
        from: 'cfo@company.com',
        to: 'finance@company.com',
        cc: 'finance@company.com, decisions+local@bot.set4.io',
        subject: 'Q2 Budget Allocation Decision',
        text: `Finance team,

After reviewing our Q1 performance, I've decided on the following budget allocations for Q2:
- Engineering: $500,000 (20% increase)
- Marketing: $300,000 (10% decrease)
- Operations: $200,000 (no change)

This reflects our strategic shift towards product development.

Thanks,
CFO`,
        headers: `Message-ID: <budget-${Date.now()}@company.com>`
      }
    },
    {
      name: 'Technical Architecture',
      payload: {
        from: 'architect@company.com',
        to: 'dev@company.com',
        cc: 'dev@company.com, decisions+local@bot.set4.io',
        subject: 'Microservices Migration Decision',
        text: `Dev team,

We're moving forward with the microservices architecture:
- Start with order processing service
- Use Kubernetes for orchestration
- GraphQL for API gateway
- Timeline: 6 month migration plan

Let's begin with a proof of concept next sprint.

Best,
Lead Architect`,
        headers: `Message-ID: <architecture-${Date.now()}@company.com>`
      }
    }
  ];

  // Send test emails
  for (const test of testEmails) {
    console.log(`📧 Sending ${test.name}...`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/webhook-inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(test.payload).toString()
      });

      const result = await response.json();
      console.log(`✅ Response:`, result);
      
      // Wait a bit between emails
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }

  // Check tag results
  console.log('\n📊 Checking Tag Results...\n');
  
  try {
    // Get all tags
    const tagsResult = await sql`
      SELECT t.*, COUNT(dt.decision_id) as decision_count
      FROM tags t
      LEFT JOIN decision_tags dt ON t.id = dt.tag_id
      GROUP BY t.id, t.name, t.description, t.usage_count, t.created_at, t.updated_at
      ORDER BY COUNT(dt.decision_id) DESC
    `;
    
    console.log('🏷️  All Tags:');
    tagsResult.rows.forEach(tag => {
      console.log(`  - ${tag.name}: ${tag.decision_count} decisions`);
    });
    
    // Get recent decisions with tags
    const decisionsResult = await sql`
      SELECT d.id, d.decision_summary, array_agg(t.name) as tags
      FROM decisions d
      LEFT JOIN decision_tags dt ON d.id = dt.decision_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE d.created_at > NOW() - INTERVAL '10 minutes'
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT 5
    `;
    
    console.log('\n📋 Recent Decisions with Tags:');
    decisionsResult.rows.forEach(decision => {
      console.log(`\n  Decision: ${decision.decision_summary}`);
      console.log(`  Tags: ${decision.tags.filter(t => t).join(', ') || 'None'}`);
    });
    
  } catch (error) {
    console.error('Error querying database:', error);
  }

  console.log('\n✅ Tag extraction test complete!');
  console.log(`\n🌐 View decisions at: ${BASE_URL}/`);
}

// Run the test
testTagExtraction().catch(console.error);