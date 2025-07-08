#!/usr/bin/env node

import { config } from 'dotenv';
import { sql } from '../lib/database.js';
import crypto from 'crypto';

// Load environment variables
config({ path: '.env.local' });

const SAMPLE_DECISIONS = [
  {
    decision_summary: "Migrate from React 17 to React 18 for better performance and concurrent features",
    decision_maker: "sarah.chen@company.com",
    witnesses: ["john.doe@company.com", "alex.smith@company.com"],
    topic: "Frontend Architecture",
    decision_type: "technical",
    priority: "high",
    impact_scope: "team",
    deadline: new Date('2024-03-15'),
    parameters: {
      budget: "$15,000",
      timeline: "6 weeks",
      resources: "2 senior developers",
      scope: "All customer-facing applications",
      success_criteria: "20% performance improvement"
    },
    key_points: [
      "Improved performance with concurrent rendering",
      "Better user experience with automatic batching",
      "Future-proofing for upcoming React features",
      "Migration will be done in phases to minimize risk"
    ],
    raw_thread: "After extensive testing, I've decided we should migrate to React 18. The performance benefits are significant and we need the concurrent features for our upcoming dashboard redesign."
  },
  {
    decision_summary: "Approve $50,000 Q1 marketing budget for digital advertising campaign",
    decision_maker: "michael.torres@company.com",
    witnesses: ["lisa.wang@company.com", "david.brown@company.com"],
    topic: "Marketing Budget",
    decision_type: "budget",
    priority: "critical",
    impact_scope: "company",
    deadline: new Date('2024-01-31'),
    parameters: {
      budget: "$50,000",
      timeline: "Q1 2024",
      channels: "Google Ads, Facebook, LinkedIn",
      target: "25% lead increase",
      roi_target: "300% ROAS"
    },
    key_points: [
      "Focus on high-converting keywords in Google Ads",
      "A/B test creative variations across platforms",
      "Target enterprise customers aged 25-45",
      "Weekly performance reviews and budget adjustments"
    ],
    raw_thread: "Given our Q4 performance and growth targets, I'm approving the full $50k marketing budget for Q1. This is critical for hitting our revenue goals."
  },
  {
    decision_summary: "Implement 4-day work week pilot program starting February 1st",
    decision_maker: "jennifer.lee@company.com",
    witnesses: ["robert.garcia@company.com", "emily.davis@company.com"],
    topic: "HR Policy",
    decision_type: "operational",
    priority: "medium",
    impact_scope: "company",
    deadline: new Date('2024-02-01'),
    parameters: {
      duration: "3-month pilot",
      schedule: "Monday-Thursday, 9am-6pm",
      evaluation: "Monthly productivity reviews",
      scope: "All departments except customer support",
      success_metrics: "Productivity, employee satisfaction, customer satisfaction"
    },
    key_points: [
      "Maintain same productivity levels with compressed schedule",
      "Customer support will continue 5-day coverage",
      "Monthly surveys to track employee satisfaction",
      "Review pilot results before permanent implementation"
    ],
    raw_thread: "Based on research and employee feedback, I've decided to implement a 4-day work week pilot. This could significantly improve work-life balance while maintaining productivity."
  },
  {
    decision_summary: "Select PostgreSQL as primary database for new microservices architecture",
    decision_maker: "alex.rodriguez@company.com",
    witnesses: ["sarah.chen@company.com", "james.wilson@company.com"],
    topic: "Database Architecture",
    decision_type: "technical",
    priority: "high",
    impact_scope: "department",
    deadline: new Date('2024-02-15'),
    parameters: {
      migration_timeline: "8 weeks",
      cost: "$25,000 setup + $5,000/month",
      performance_target: "50% query improvement",
      backup_strategy: "Daily automated backups",
      scaling: "Horizontal read replicas"
    },
    key_points: [
      "Better JSON support than MySQL for our use cases",
      "Excellent performance for complex queries",
      "Strong ACID compliance for financial data",
      "Active community and extensive documentation"
    ],
    raw_thread: "After evaluating MySQL, PostgreSQL, and MongoDB, I've decided on PostgreSQL. It offers the best balance of performance, features, and reliability for our microservices."
  },
  {
    decision_summary: "Hire 2 additional senior developers for the mobile team by March 1st",
    decision_maker: "rachel.kim@company.com",
    witnesses: ["michael.torres@company.com", "david.brown@company.com"],
    topic: "Team Expansion",
    decision_type: "personnel",
    priority: "high",
    impact_scope: "department",
    deadline: new Date('2024-03-01'),
    parameters: {
      budget: "$240,000 annual salary budget",
      requirements: "5+ years mobile development, React Native",
      timeline: "6 weeks hiring process",
      team_growth: "From 4 to 6 developers",
      onboarding: "2-week structured onboarding program"
    },
    key_points: [
      "Critical for meeting Q2 mobile app launch deadline",
      "Focus on candidates with React Native and native iOS/Android experience",
      "Competitive salary package to attract top talent",
      "Remote-first hiring to expand candidate pool"
    ],
    raw_thread: "With our mobile roadmap accelerating, I've decided we need 2 more senior developers. This is essential for delivering our Q2 mobile features on time."
  },
  {
    decision_summary: "Switch to Figma Enterprise for design collaboration and version control",
    decision_maker: "emma.thompson@company.com",
    witnesses: ["lisa.wang@company.com", "john.doe@company.com"],
    topic: "Design Tools",
    decision_type: "operational",
    priority: "medium",
    impact_scope: "team",
    deadline: new Date('2024-01-20'),
    parameters: {
      cost: "$12/user/month for 15 users",
      migration_time: "2 weeks",
      training: "1-day Figma workshop for all designers",
      benefits: "Better collaboration, version control, developer handoff",
      previous_tool: "Adobe XD"
    },
    key_points: [
      "Real-time collaboration will improve design velocity",
      "Better integration with development workflow",
      "Centralized component library management",
      "Improved stakeholder feedback and approval process"
    ],
    raw_thread: "After comparing design tools, I'm making the call to switch to Figma Enterprise. The collaboration features alone will pay for the upgrade cost."
  },
  {
    decision_summary: "Implement mandatory security training for all employees by January 31st",
    decision_maker: "kevin.patel@company.com",
    witnesses: ["jennifer.lee@company.com", "robert.garcia@company.com"],
    topic: "Security Compliance",
    decision_type: "operational",
    priority: "critical",
    impact_scope: "company",
    deadline: new Date('2024-01-31'),
    parameters: {
      training_provider: "KnowBe4",
      duration: "2 hours per employee",
      cost: "$15/employee",
      frequency: "Annual with quarterly phishing tests",
      compliance: "SOC 2 Type II requirement"
    },
    key_points: [
      "Required for SOC 2 compliance certification",
      "Includes phishing simulation and awareness training",
      "All employees must complete within 30 days",
      "Quarterly refresher sessions and phishing tests"
    ],
    raw_thread: "Given our SOC 2 audit requirements and recent security incidents in the industry, I'm mandating security training for everyone. This is non-negotiable for compliance."
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Clear existing test data
    console.log('🧹 Clearing existing decisions...');
    await sql`DELETE FROM decisions WHERE decision_maker LIKE '%@company.com'`;
    
    console.log('📝 Inserting sample decisions...');
    
    for (const decision of SAMPLE_DECISIONS) {
      const messageId = crypto.randomBytes(16).toString('hex');
      const confirmToken = crypto.randomBytes(32).toString('hex');
      const decisionDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
      const confirmedAt = new Date(decisionDate.getTime() + Math.random() * 24 * 60 * 60 * 1000); // Confirmed within 24 hours
      
      const parsedContext = {
        key_points: decision.key_points,
        confidence: 95,
        decision_summary: decision.decision_summary,
        decision_maker: decision.decision_maker,
        witnesses: decision.witnesses,
        decision_date: decisionDate.toISOString(),
        topic: decision.topic,
        parameters: decision.parameters,
        priority: decision.priority,
        decision_type: decision.decision_type,
        deadline: decision.deadline?.toISOString(),
        impact_scope: decision.impact_scope
      };
      
      await sql`
        INSERT INTO decisions (
          message_id, thread_id, decision_summary, decision_maker, witnesses,
          decision_date, topic, parameters, priority, decision_type,
          status, deadline, impact_scope, raw_thread, parsed_context,
          confirmation_token, confirmed_at, created_at
        ) VALUES (
          ${messageId}, ${messageId}, ${decision.decision_summary}, 
          ${decision.decision_maker}, ${decision.witnesses},
          ${decisionDate}, ${decision.topic}, 
          ${JSON.stringify(decision.parameters)}, ${decision.priority}, 
          ${decision.decision_type}, 'confirmed', ${decision.deadline}, 
          ${decision.impact_scope}, ${decision.raw_thread}, ${JSON.stringify(parsedContext)},
          ${confirmToken}, ${confirmedAt}, ${decisionDate}
        )
      `;
      
      console.log(`✅ Added: ${decision.decision_summary.substring(0, 50)}...`);
    }
    
    console.log(`\n🎉 Successfully seeded ${SAMPLE_DECISIONS.length} decisions!`);
    console.log('🔍 View the results at: https://track-set4.vercel.app/api/decisions-ui');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;