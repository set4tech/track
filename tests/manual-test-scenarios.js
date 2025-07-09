#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Manual test scenarios for debugging specific issues
const BASE_URL = process.env.TEST_BASE_URL || 'https://track-set4.vercel.app';

const SCENARIOS = {
  // Test complex decision with multiple parameters
  complex_decision: {
    from: 'ceo@company.com',
    to: 'leadership@company.com',
    cc: 'leadership@company.com, decisions@bot.set4.io',
    subject: 'Q2 Product Strategy Decision',
    text: `After extensive analysis, I've decided to pivot our product strategy for Q2. 

Key decisions:
- Budget: $200,000 allocated for new feature development
- Timeline: Launch by June 30th, 2024
- Team: Sarah will lead the product team, John handles engineering
- Success criteria: 25% increase in user engagement, 15% revenue growth
- Scope: Focus on mobile app improvements and API enhancements

This is a critical decision that affects the entire company. All department heads should align their Q2 plans accordingly.

Deadline for implementation: May 15th, 2024`,
    headers: 'Message-ID: <complex-decision-001@company.com>\nDate: Mon, 15 Jan 2024 09:00:00 +0000'
  },

  // Test email with unclear decision
  unclear_decision: {
    from: 'manager@company.com',
    to: 'team@company.com',
    cc: 'team@company.com, decisions@bot.set4.io',
    subject: 'Meeting Discussion Points',
    text: `Hi team,

We had a good discussion about the new project. There were several options presented:
1. Option A - React with TypeScript
2. Option B - Vue.js with JavaScript  
3. Option C - Angular with TypeScript

Everyone had different opinions. We should probably go with something modern and maintainable. Let's think about it more and maybe decide next week.

Thanks,
Manager`,
    headers: 'Message-ID: <unclear-001@company.com>\nDate: Mon, 15 Jan 2024 10:00:00 +0000'
  },

  // Test email thread continuation
  thread_continuation: {
    from: 'developer@company.com',
    to: 'team@company.com',
    cc: 'team@company.com, decisions@bot.set4.io',
    subject: 'Re: Database Migration Strategy',
    text: `Following up on our previous discussion about database migration.

FINAL DECISION: We will proceed with PostgreSQL migration starting February 1st.

Details:
- Migration window: February 1-15, 2024
- Downtime: Maximum 4 hours during off-peak hours
- Rollback plan: Full backup before migration
- Team lead: Alex Thompson
- Budget approved: $15,000 for migration tools and consulting

This decision is final and we'll begin preparation immediately.`,
    headers: `Message-ID: <thread-continuation-001@company.com>
In-Reply-To: <original-db-discussion@company.com>
References: <original-db-discussion@company.com> <follow-up-1@company.com>
Date: Mon, 15 Jan 2024 11:00:00 +0000`
  },

  // Test query with specific criteria
  specific_query: {
    from: 'analyst@company.com',
    to: 'decisions@bot.set4.io',
    subject: 'Budget Decisions Query',
    text: `Hi Decision Bot,

Can you show me all budget-related decisions made in the last month? I'm preparing a financial report and need to track all approved expenditures.

Also, if possible, please include decisions with deadlines in the next 30 days.

Thanks!`,
    headers: 'Message-ID: <query-budget-001@company.com>\nDate: Mon, 15 Jan 2024 12:00:00 +0000'
  }
};

class ManualTester {
  async runScenario(name, scenario) {
    console.log(`\n🧪 Testing Scenario: ${name}`);
    console.log('=' .repeat(50));
    
    try {
      const response = await fetch(`${BASE_URL}/api/webhook-inbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      });

      const result = await response.json();
      
      console.log(`📧 Email Details:`);
      console.log(`   From: ${scenario.from}`);
      console.log(`   Subject: ${scenario.subject}`);
      console.log(`   CC: ${scenario.cc || 'None'}`);
      console.log(`   Text Length: ${scenario.text.length} chars`);
      
      console.log(`\n📊 Response:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
      
      if (result.decision) {
        console.log(`\n🎯 Extracted Decision:`);
        console.log(`   Summary: ${result.decision.decision_summary}`);
        console.log(`   Type: ${result.decision.decision_type}`);
        console.log(`   Priority: ${result.decision.priority}`);
        console.log(`   Confidence: ${result.decision.confidence}%`);
        
        if (result.decision.parameters) {
          console.log(`   Parameters: ${JSON.stringify(result.decision.parameters, null, 4)}`);
        }
      }
      
      console.log(`\n✅ Scenario completed successfully`);
      
    } catch (error) {
      console.log(`\n❌ Scenario failed: ${error.message}`);
    }
  }

  async runAllScenarios() {
    console.log('🚀 Manual Test Scenarios for Email-to-Threads App');
    console.log('==================================================');
    console.log(`Base URL: ${BASE_URL}`);
    
    for (const [name, scenario] of Object.entries(SCENARIOS)) {
      await this.runScenario(name, scenario);
      
      // Wait a bit between scenarios to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 All manual test scenarios completed!');
    console.log('\nNext steps:');
    console.log('1. Check your email for confirmation requests');
    console.log('2. Visit the decisions UI to see processed decisions');
    console.log('3. Test the confirmation links in the emails');
  }

  async runSingle(scenarioName) {
    if (!SCENARIOS[scenarioName]) {
      console.log(`❌ Scenario '${scenarioName}' not found.`);
      console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
      return;
    }
    
    await this.runScenario(scenarioName, SCENARIOS[scenarioName]);
  }
}

// Command line interface
const args = process.argv.slice(2);
const tester = new ManualTester();

if (args.length === 0) {
  tester.runAllScenarios();
} else if (args[0] === 'list') {
  console.log('Available test scenarios:');
  Object.keys(SCENARIOS).forEach(name => {
    console.log(`  - ${name}`);
  });
} else {
  tester.runSingle(args[0]);
}
