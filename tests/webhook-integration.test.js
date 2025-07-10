import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import handler from '../api/webhook-inbound.js';

// Mock dependencies
const mockSql = jest.fn();
const mockSgMailSend = jest.fn();
const mockOpenAICreate = jest.fn();

jest.mock('@vercel/postgres', () => ({
  sql: mockSql
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: mockSgMailSend
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate
      }
    }
  }));
});

jest.mock('formidable', () => {
  return jest.fn().mockImplementation(() => ({
    parse: (req, callback) => {
      // Mock formidable parsing based on test data
      const fields = req._testFields || {};
      callback(null, fields, {});
    }
  }));
});

describe('Webhook Integration Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Setup default SQL mock
    mockSql.mockResolvedValue({ rows: [] });
    
    // Setup default SendGrid mock
    mockSgMailSend.mockResolvedValue({});
  });

  describe('Decision Detection Tests', () => {
    it('should log clear decision when CC\'d to bot', async () => {
      // Arrange
      mockReq = createMockRequest({
        from: 'will@set4.io',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Project Decision',
        text: 'We have decided to use React for the frontend project. This will help us move faster and leverage our existing expertise.',
        headers: 'Message-ID: <test123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Use React for frontend project',
              decision_maker: 'will@set4.io',
              topic: 'Frontend Technology',
              decision_type: 'technical',
              priority: 'medium',
              impact_scope: 'team',
              confidence: 85,
              key_points: ['Leverage existing expertise', 'Move faster']
            })
          }
        }]
      });

      // Act
      await handler(mockReq, mockRes);

      // Assert
      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO decisions'));
      expect(mockSgMailSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'will@set4.io',
        subject: 'Re: Project Decision',
        text: expect.stringContaining('I have logged this decision')
      }));
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should NOT log non-decision content', async () => {
      // Arrange
      mockReq = createMockRequest({
        from: 'will@set4.io',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Thank you',
        text: 'Thank you for seeing me yesterday. It was great to catch up and discuss the project.',
        headers: 'Message-ID: <test124@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              confidence: 40
            })
          }
        }]
      });

      // Act
      await handler(mockReq, mockRes);

      // Assert
      expect(mockSql).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO decisions'));
      expect(mockSgMailSend).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'no_decision_found' });
    });

    it('should handle duplicate decisions', async () => {
      // Arrange
      mockReq = createMockRequest({
        from: 'will@set4.io',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Duplicate Decision',
        text: 'We decided to use PostgreSQL',
        headers: 'Message-ID: <duplicate123@example.com>'
      });

      // Mock existing decision
      mockSql.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      await handler(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'duplicate' });
      expect(mockSgMailSend).not.toHaveBeenCalled();
    });
  });

  describe('Language Variation Tests', () => {
    it('should detect formal decision language', async () => {
      mockReq = createMockRequest({
        from: 'ceo@company.com',
        to: 'board@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Strategic Decision',
        text: 'It has been decided that we will proceed with the acquisition of TechCorp for $50M. The board unanimously approved this strategic move.',
        headers: 'Message-ID: <formal123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Proceed with TechCorp acquisition for $50M',
              decision_type: 'strategic',
              priority: 'critical',
              confidence: 95,
              parameters: { budget: '$50M' }
            })
          }
        }]
      });

      await handler(mockReq, mockRes);

      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO decisions'));
      expect(mockSgMailSend).toHaveBeenCalled();
    });

    it('should detect informal decision language', async () => {
      mockReq = createMockRequest({
        from: 'dev@company.com',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Quick call',
        text: 'Okay team, let\'s just go with the MongoDB option. It seems like the best fit for our use case right now.',
        headers: 'Message-ID: <informal123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Use MongoDB for the project',
              decision_type: 'technical',
              priority: 'medium',
              confidence: 78
            })
          }
        }]
      });

      await handler(mockReq, mockRes);

      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO decisions'));
    });
  });

  describe('Thread Length Tests', () => {
    it('should handle short thread', async () => {
      mockReq = createMockRequest({
        from: 'pm@company.com',
        to: 'dev@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Quick decision',
        text: 'Use TypeScript.',
        headers: 'Message-ID: <short123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Use TypeScript',
              confidence: 80
            })
          }
        }]
      });

      await handler(mockReq, mockRes);

      expect(mockSql).toHaveBeenCalled();
    });

    it('should handle long thread', async () => {
      const longText = `
        Hi team,
        
        After extensive discussion over the past few weeks, multiple meetings with stakeholders, 
        thorough analysis of our current infrastructure, evaluation of various options including 
        AWS, Google Cloud, and Azure, consideration of cost implications, security requirements,
        scalability needs, and team expertise, we have reached a consensus.
        
        We have decided to migrate our entire infrastructure to AWS. This decision was made
        after careful consideration of the following factors:
        1. Cost efficiency over 3-year period
        2. Better integration with our existing tools
        3. Team familiarity with AWS services
        4. Superior support for our compliance requirements
        
        The migration will begin Q2 2024 and should be completed by Q4 2024.
        
        Best regards,
        Infrastructure Team
      `;

      mockReq = createMockRequest({
        from: 'infra@company.com',
        to: 'engineering@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Infrastructure Migration Decision',
        text: longText,
        headers: 'Message-ID: <long123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Migrate entire infrastructure to AWS',
              decision_type: 'technical',
              priority: 'critical',
              confidence: 92,
              deadline: '2024-12-31',
              parameters: {
                timeline: 'Q2-Q4 2024',
                scope: 'entire infrastructure'
              }
            })
          }
        }]
      });

      await handler(mockReq, mockRes);

      expect(mockSql).toHaveBeenCalled();
      expect(mockSgMailSend).toHaveBeenCalledWith(expect.objectContaining({
        text: expect.stringContaining('Migrate entire infrastructure to AWS')
      }));
    });
  });

  describe('Addressing Tests (TO vs CC)', () => {
    it('should return decision list when bot is in TO field', async () => {
      mockReq = createMockRequest({
        from: 'user@company.com',
        to: 'decisions@bot.set4.io',
        cc: '',
        subject: 'Recent decisions?',
        text: 'Can you show me recent decisions?',
        headers: 'Message-ID: <query123@example.com>'
      });

      const mockDecisions = [
        {
          decision_summary: 'Use React for frontend',
          topic: 'Frontend Tech',
          decision_date: new Date(),
          decision_type: 'technical',
          priority: 'medium'
        }
      ];

      mockSql.mockResolvedValue({ rows: mockDecisions });

      await handler(mockReq, mockRes);

      expect(mockSgMailSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'user@company.com',
        subject: 'Re: Recent decisions?',
        text: expect.stringContaining('Here are your recent confirmed decisions')
      }));
    });

    it('should attempt decision logging when bot is in CC field', async () => {
      mockReq = createMockRequest({
        from: 'user@company.com',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Team Decision',
        text: 'We decided to use Kubernetes for deployment',
        headers: 'Message-ID: <cc123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Use Kubernetes for deployment',
              confidence: 85
            })
          }
        }]
      });

      await handler(mockReq, mockRes);

      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO decisions'));
    });
  });

  describe('Email Reply Behavior Tests', () => {
    it('should send reply with correct content and headers', async () => {
      mockReq = createMockRequest({
        from: 'sender@company.com',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io,other@company.com',
        subject: 'Important Decision',
        text: 'We decided to implement feature X by end of month',
        headers: 'Message-ID: <reply123@example.com>\nReferences: <thread456@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Implement feature X by end of month',
              decision_type: 'strategic',
              priority: 'high',
              confidence: 88,
              key_points: ['End of month deadline', 'High priority feature']
            })
          }
        }]
      });

      await handler(mockReq, mockRes);

      expect(mockSgMailSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'sender@company.com',
        cc: 'decisions@bot.set4.io,other@company.com',
        subject: 'Re: Important Decision',
        text: expect.stringContaining('I have logged this decision'),
        headers: expect.objectContaining({
          'In-Reply-To': expect.any(String),
          'References': expect.any(String)
        })
      }));
    });

    it('should include decision details in reply', async () => {
      mockReq = createMockRequest({
        from: 'pm@company.com',
        to: 'dev@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Budget Decision',
        text: 'We approved the $100k budget for the new project',
        headers: 'Message-ID: <budget123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Approve $100k budget for new project',
              decision_type: 'budget',
              priority: 'high',
              confidence: 90,
              parameters: { budget: '$100k' },
              key_points: ['New project funding', '$100k approved']
            })
          }
        }]
      });

      await handler(mockReq, mockRes);

      const sentEmail = mockSgMailSend.mock.calls[0][0];
      expect(sentEmail.text).toContain('Approve $100k budget for new project');
      expect(sentEmail.text).toContain('Type: budget (high priority)');
      expect(sentEmail.text).toContain('Key Points:');
      expect(sentEmail.text).toContain('View all decisions:');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockReq = createMockRequest({
        from: 'user@company.com',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Decision',
        text: 'We decided something',
        headers: 'Message-ID: <error123@example.com>'
      });

      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API Error'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'OpenAI API Error'
      }));
    });

    it('should handle database errors gracefully', async () => {
      mockReq = createMockRequest({
        from: 'user@company.com',
        to: 'team@company.com',
        cc: 'decisions@bot.set4.io',
        subject: 'Decision',
        text: 'We decided something',
        headers: 'Message-ID: <dberror123@example.com>'
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              decision_summary: 'Test decision',
              confidence: 85
            })
          }
        }]
      });

      mockSql.mockRejectedValue(new Error('Database connection failed'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  // Helper function to create mock request objects
  function createMockRequest(fields) {
    return {
      method: 'POST',
      _testFields: fields,
      headers: {
        'content-type': 'multipart/form-data'
      }
    };
  }
});
