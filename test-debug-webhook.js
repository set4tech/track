#!/usr/bin/env node

import fetch from 'node-fetch';
import FormData from 'form-data';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Debug test the production webhook
const testWebhook = async () => {
  const form = new FormData();
  
  // Test different scenarios
  const scenarios = [
    {
      name: 'TO decisions+dev',
      fields: {
        from: 'will@set4.io',
        to: 'decisions+dev@bot.set4.io',
        cc: '',
        subject: 'Test 1',
        text: 'I decide to test scenario 1'
      }
    },
    {
      name: 'TO decisions (no plus)',
      fields: {
        from: 'will@set4.io', 
        to: 'decisions@bot.set4.io',
        cc: '',
        subject: 'Test 2',
        text: 'I decide to test scenario 2'
      }
    },
    {
      name: 'CC decisions+dev',
      fields: {
        from: 'will@set4.io',
        to: 'team@company.com',
        cc: 'decisions+dev@bot.set4.io',
        subject: 'Test 3',
        text: 'I decide to test scenario 3'
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📧 Testing: ${scenario.name}`);
    console.log('-'.repeat(40));
    
    const form = new FormData();
    for (const [key, value] of Object.entries(scenario.fields)) {
      form.append(key, value);
    }
    form.append('headers', `Message-ID: <test-${Date.now()}-${Math.random()}@example.com>`);
    
    const headers = form.getHeaders();
    if (process.env.VERCEL_PROTECTION_BYPASS) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_PROTECTION_BYPASS;
    }

    try {
      const response = await fetch('https://track-set4.vercel.app/api/webhook-inbound', {
        method: 'POST',
        body: form,
        headers: headers
      });

      const result = await response.json();
      console.log('Result:', result.status);
      if (result.decision) {
        console.log('Decision:', result.decision.decision_summary);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

testWebhook();