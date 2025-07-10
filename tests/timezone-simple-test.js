#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.TEST_BASE_URL || 'https://track-set4.vercel.app';

class TimezoneSimpleTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async runTest(name, testFn) {
    try {
      this.log(`Running test: ${name}`);
      await testFn();
      this.testResults.passed++;
      this.testResults.tests.push({ name, status: 'passed' });
      this.log(`Test passed: ${name}`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name, status: 'failed', error: error.message });
      this.log(`Test failed: ${name} - ${error.message}`, 'error');
    }
  }

  async testDateConversionLogic() {
    // Test the conversion logic that will run on the client
    const testCases = [
      {
        name: 'Recent UTC date',
        utc: '2025-01-10T15:30:00.000Z',
        expectedFormat: /\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?/
      },
      {
        name: 'Date only conversion',
        utc: '2025-06-15T00:00:00.000Z',
        expectedFormat: /\d{1,2}\/\d{1,2}\/\d{4}/,
        dateOnly: true
      },
      {
        name: 'Edge case - New Year',
        utc: '2025-01-01T00:00:00.000Z',
        expectedFormat: /\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?/
      }
    ];

    for (const testCase of testCases) {
      const date = new Date(testCase.utc);
      const converted = testCase.dateOnly ? 
        date.toLocaleDateString() : 
        date.toLocaleString();
      
      if (!testCase.expectedFormat.test(converted)) {
        throw new Error(`Date conversion failed for ${testCase.name}. Got: ${converted}`);
      }
      
      // Ensure it's not still in ISO format
      if (converted.includes('T') && converted.includes('Z')) {
        throw new Error(`Date not converted from ISO format for ${testCase.name}`);
      }
    }
  }

  async testDecisionUIStructure() {
    const response = await fetch(`${BASE_URL}/api/index`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch decision UI: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check for timezone conversion elements
    const checks = [
      {
        name: 'Date field classes',
        pattern: /class="date-field"/,
        error: 'No date-field classes found'
      },
      {
        name: 'DateTime field classes',
        pattern: /class="datetime-field"/,
        error: 'No datetime-field classes found'
      },
      {
        name: 'Data attributes',
        pattern: /data-date="/,
        error: 'No data-date attributes found'
      },
      {
        name: 'Conversion script',
        pattern: /querySelectorAll\(['"](\.date-field|\.datetime-field)['"]\)/,
        error: 'Date conversion script not found'
      },
      {
        name: 'DOMContentLoaded handler',
        pattern: /addEventListener\(['"]DOMContentLoaded['"]/,
        error: 'DOMContentLoaded event listener not found'
      }
    ];
    
    for (const check of checks) {
      if (!check.pattern.test(html)) {
        throw new Error(check.error);
      }
    }
    
    // Check that dates are in data attributes
    const dateMatches = html.match(/data-date="([^"]+)"/g);
    if (dateMatches && dateMatches.length > 0) {
      this.log(`Found ${dateMatches.length} date attributes in HTML`, 'success');
    }
  }

  async testConfirmationPageStructure() {
    // We can't test actual confirmation without a token, but we can verify
    // that the confirmation endpoint exists and returns appropriate errors
    const response = await fetch(`${BASE_URL}/api/confirm-decision?token=invalid-test-token`);
    
    if (response.status !== 404) {
      throw new Error(`Expected 404 for invalid token, got ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check that error page is returned
    if (!html.includes('Decision Not Found') && !html.includes('not found')) {
      throw new Error('Invalid token should return "not found" message');
    }
  }

  async testTimezoneScenarioExecution() {
    // Test the manual scenario we added
    const response = await fetch(`${BASE_URL}/api/webhook-inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test-tz@example.com',
        to: 'team@example.com',
        cc: 'team@example.com, decisions@bot.set4.io',
        subject: 'Timezone Test Decision',
        text: 'DECISION: Meeting scheduled for 3:00 PM UTC on Friday',
        headers: `Message-ID: <tz-test-${Date.now()}@example.com>\nDate: ${new Date().toUTCString()}`
      })
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.decision) {
      throw new Error('No decision extracted from timezone test email');
    }
    
    this.log(`Decision extracted: ${result.decision.decision_summary}`, 'success');
  }

  async runAllTests() {
    this.log('🚀 Starting Simple Timezone Tests');
    
    // Run all tests
    await this.runTest('Date Conversion Logic', () => this.testDateConversionLogic());
    await this.runTest('Decision UI Structure', () => this.testDecisionUIStructure());
    await this.runTest('Confirmation Page Structure', () => this.testConfirmationPageStructure());
    await this.runTest('Timezone Scenario Execution', () => this.testTimezoneScenarioExecution());
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📝 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.failed > 0) {
      console.log('\nFailed tests:');
      this.testResults.tests
        .filter(t => t.status === 'failed')
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
      process.exit(1);
    } else {
      console.log('\n🎉 All timezone tests passed!');
      console.log('\nNote: For full browser-based timezone testing, consider using Puppeteer or Playwright.');
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new TimezoneSimpleTest();
  tester.runAllTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export default TimezoneSimpleTest;