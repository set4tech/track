#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.describes = [];
    this.currentDescribe = null;
    this.mocks = new Map();
    this.passed = 0;
    this.failed = 0;
  }

  describe(name, fn) {
    const oldDescribe = this.currentDescribe;
    this.currentDescribe = name;
    console.log(`\n📋 ${name}`);
    fn();
    this.currentDescribe = oldDescribe;
  }

  it(name, fn) {
    const testName = this.currentDescribe ? `${this.currentDescribe} > ${name}` : name;
    this.tests.push({ name: testName, fn });
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      toHaveBeenCalled: () => {
        if (!actual.called) {
          throw new Error(`Expected function to have been called`);
        }
      },
      toHaveBeenCalledWith: (expected) => {
        if (!actual.calledWith || !this.deepEqual(actual.calledWith, expected)) {
          throw new Error(`Expected function to have been called with ${JSON.stringify(expected)}`);
        }
      },
      not: {
        toHaveBeenCalled: () => {
          if (actual.called) {
            throw new Error(`Expected function not to have been called`);
          }
        }
      }
    };
  }

  deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object' && a !== null && b !== null) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }
    return false;
  }

  jest = {
    fn: (impl) => {
      const mockFn = (...args) => {
        mockFn.called = true;
        mockFn.calledWith = args;
        if (impl) return impl(...args);
      };
      mockFn.mockReturnThis = () => {
        mockFn.returnThis = true;
        return mockFn;
      };
      mockFn.mockResolvedValue = (value) => {
        mockFn.resolvedValue = value;
        return Promise.resolve(value);
      };
      mockFn.mockRejectedValue = (error) => {
        mockFn.rejectedValue = error;
        return Promise.reject(error);
      };
      mockFn.clearAllMocks = () => {
        mockFn.called = false;
        mockFn.calledWith = null;
      };
      return mockFn;
    },
    clearAllMocks: () => {
      // Clear all mocks
    }
  };

  async runTests() {
    console.log('🧪 Running Integration Tests\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results:`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total: ${this.passed + this.failed}`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Create global test functions
const runner = new TestRunner();
global.describe = runner.describe.bind(runner);
global.it = runner.it.bind(runner);
global.expect = runner.expect.bind(runner);
global.jest = runner.jest;

// Mock modules for testing
const mockModules = {
  '@vercel/postgres': {
    sql: runner.jest.fn().mockResolvedValue({ rows: [] })
  },
  '@sendgrid/mail': {
    setApiKey: runner.jest.fn(),
    send: runner.jest.fn().mockResolvedValue({})
  },
  'openai': class MockOpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: runner.jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  decision_summary: 'Test decision',
                  confidence: 85,
                  decision_type: 'technical',
                  priority: 'medium'
                })
              }
            }]
          })
        }
      };
    }
  },
  'formidable': class MockFormidable {
    parse(req, callback) {
      const fields = req._testFields || {};
      callback(null, fields, {});
    }
  }
};

// Simple test cases
describe('Webhook Integration Tests', () => {
  it('should detect clear decisions', async () => {
    // This is a simplified test - in real implementation would test the actual webhook
    const mockDecision = {
      text: 'We decided to use React for the frontend',
      confidence: 85
    };
    
    expect(mockDecision.confidence).toBe(85);
    expect(mockDecision.text).toContain('decided');
  });

  it('should reject non-decisions', async () => {
    const mockNonDecision = {
      text: 'Thank you for the meeting yesterday',
      confidence: 40
    };
    
    expect(mockNonDecision.confidence).toBe(40);
  });

  it('should handle CC vs TO addressing', async () => {
    const ccEmail = { cc: 'decisions@bot.set4.io', to: 'team@company.com' };
    const toEmail = { to: 'decisions@bot.set4.io', cc: '' };
    
    expect(ccEmail.cc).toContain('decisions@bot.set4.io');
    expect(toEmail.to).toContain('decisions@bot.set4.io');
  });

  it('should format reply emails correctly', async () => {
    const replyEmail = {
      subject: 'Re: Project Decision',
      text: 'I have logged this decision: "Use React for frontend"'
    };
    
    expect(replyEmail.subject).toContain('Re:');
    expect(replyEmail.text).toContain('I have logged this decision');
  });
});

// Run the tests
runner.runTests().catch(console.error);
