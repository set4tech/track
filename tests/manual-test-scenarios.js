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
  },

  // Test timezone display for different times
  timezone_test: {
    from: 'timezone-tester@company.com',
    to: 'global-team@company.com',
    cc: 'global-team@company.com, decisions@bot.set4.io',
    subject: 'Global Team Meeting Time Decision',
    text: `Team,

After considering all time zones, I've made the following decision:

DECISION: Our weekly global team meetings will be held every Tuesday at 15:00 UTC.

This time works best for:
- London: 3:00 PM (GMT/BST)
- New York: 10:00 AM (EST/EDT)
- Tokyo: 12:00 AM next day (JST)
- Sydney: 1:00 AM next day (AEDT/AEST)

Meeting details:
- Platform: Zoom
- Duration: 1 hour
- Start date: February 1st, 2025
- Recurring: Weekly

Please adjust your calendars accordingly. The decision confirmation will show the time in your local timezone.`,
    headers: `Message-ID: <timezone-test-${Date.now()}@company.com>\nDate: ${new Date().toUTCString()}`
  },

  // Test Gmail sync with filtered query
  gmail_filter_test: {
    from: 'dev@set4.io',
    to: 'team@set4.io',
    cc: 'decisions@bot.set4.io',
    subject: 'Gmail Integration Test - Filtered Decision',
    text: `Testing Gmail sync with server-side filtering.

Decision: We will implement the following Gmail filters:
- Only sync emails from/to @set4.io domain
- Exclude promotional and social categories
- Sync only INBOX and SENT labels

This ensures we only process relevant business emails.`,
    headers: `Message-ID: <gmail-filter-${Date.now()}@set4.io>\nDate: ${new Date().toUTCString()}`
  },

  // Test Gmail decision extraction
  gmail_decision_extract: {
    from: 'product@company.com',
    to: 'engineering@company.com',
    cc: 'decisions@bot.set4.io',
    subject: 'Re: API Rate Limiting Strategy',
    text: `Following up on our discussion about API rate limits.

Approved. Let's implement the tiered rate limiting as proposed:
- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour
- Enterprise: Custom limits

Please proceed with implementation by end of week.`,
    headers: `Message-ID: <gmail-extract-${Date.now()}@company.com>\nDate: ${new Date().toUTCString()}`
  },

  // Test Gmail sync with large thread
  gmail_thread_test: {
    from: 'manager@company.com',
    to: 'team@company.com',
    cc: 'decisions@bot.set4.io',
    subject: 'Re: Re: Re: Project Timeline Discussion',
    text: `After all the back and forth in this thread, here's the final decision:

We're going with Option B - two-phase rollout:
- Phase 1: Core features by March 1st
- Phase 2: Advanced features by April 15th

This gives us buffer time and reduces risk.

Thanks everyone for the input!`,
    headers: `Message-ID: <gmail-thread-${Date.now()}@company.com>\nDate: ${new Date().toUTCString()}\nIn-Reply-To: <original-thread@company.com>\nReferences: <original-thread@company.com> <reply1@company.com> <reply2@company.com>`
  },

  // Test Gmail with attachment reference
  gmail_attachment_decision: {
    from: 'finance@company.com',
    to: 'leadership@company.com',
    cc: 'decisions@bot.set4.io',
    subject: 'Budget Approval - See Attached',
    text: `Team,

I've reviewed the Q2 budget proposal (attached as Q2_Budget_Final.xlsx).

Decision: Budget is approved with the following conditions:
- Marketing spend capped at $50K
- Engineering can proceed with all planned hires
- Travel budget reduced by 20%

Please see the attached spreadsheet for detailed line items.

Best,
CFO`,
    headers: `Message-ID: <gmail-attachment-${Date.now()}@company.com>\nDate: ${new Date().toUTCString()}`
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
