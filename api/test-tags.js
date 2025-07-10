import { extractTagsFromDecision, attachTagsToDecision, getAllExistingTags } from '../lib/tag-extractor.js';
import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create test decisions with different themes
    const testDecisions = [
      {
        decision_summary: "Implement new authentication system using OAuth 2.0",
        topic: "Security",
        decision_type: "technical",
        impact_scope: "company"
      },
      {
        decision_summary: "Increase engineering team budget by 15% for Q2",
        topic: "Budget",
        decision_type: "budget",
        impact_scope: "department"
      },
      {
        decision_summary: "Deploy new microservices architecture for order processing",
        topic: "Architecture",
        decision_type: "technical",
        impact_scope: "team"
      },
      {
        decision_summary: "Hire 3 senior engineers for the security team",
        topic: "Hiring",
        decision_type: "personnel",
        impact_scope: "department"
      },
      {
        decision_summary: "Allocate $50k for security infrastructure improvements",
        topic: "Security Budget",
        decision_type: "budget",
        impact_scope: "team"
      }
    ];

    const results = [];

    for (const testDecision of testDecisions) {
      // Extract tags
      const tags = await extractTagsFromDecision(testDecision);
      
      results.push({
        decision: testDecision.decision_summary,
        extractedTags: tags
      });
    }

    // Get all existing tags
    const existingTags = await getAllExistingTags();

    res.status(200).json({
      status: 'success',
      results,
      existingTags,
      message: 'Tag extraction test completed. These are simulated results - no decisions were actually created.'
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
}