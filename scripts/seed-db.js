#!/usr/bin/env node

import { config } from 'dotenv';
import { sql } from '../lib/database.js';
import crypto from 'crypto';

// Load environment variables
config({ path: '.env.local' });

const SAMPLE_DECISIONS = [
  {
    decision_summary:
      'Migrate from React 17 to React 18 for better performance and concurrent features',
    decision_maker: 'sarah.chen@company.com',
    witnesses: ['john.doe@company.com', 'alex.smith@company.com'],
    topic: 'Frontend Architecture',
    decision_type: 'technical',
    priority: 'high',
    impact_scope: 'team',
    deadline: new Date('2024-03-15'),
    parameters: {
      budget: '$15,000',
      timeline: '6 weeks',
      resources: '2 senior developers',
      scope: 'All customer-facing applications',
      success_criteria: '20% performance improvement',
    },
    key_points: [
      'Improved performance with concurrent rendering',
      'Better user experience with automatic batching',
      'Future-proofing for upcoming React features',
      'Migration will be done in phases to minimize risk',
    ],
    raw_thread:
      "After extensive testing, I've decided we should migrate to React 18. The performance benefits are significant and we need the concurrent features for our upcoming dashboard redesign.",
  },
  {
    decision_summary: 'Approve $50,000 Q1 marketing budget for digital advertising campaign',
    decision_maker: 'michael.torres@company.com',
    witnesses: ['lisa.wang@company.com', 'david.brown@company.com'],
    topic: 'Marketing Budget',
    decision_type: 'budget',
    priority: 'critical',
    impact_scope: 'company',
    deadline: new Date('2024-01-31'),
    parameters: {
      budget: '$50,000',
      timeline: 'Q1 2024',
      channels: 'Google Ads, Facebook, LinkedIn',
      target: '25% lead increase',
      roi_target: '300% ROAS',
    },
    key_points: [
      'Focus on high-converting keywords in Google Ads',
      'A/B test creative variations across platforms',
      'Target enterprise customers aged 25-45',
      'Weekly performance reviews and budget adjustments',
    ],
    raw_thread:
      "Given our Q4 performance and growth targets, I'm approving the full $50k marketing budget for Q1. This is critical for hitting our revenue goals.",
  },
  {
    decision_summary: 'Implement 4-day work week pilot program starting February 1st',
    decision_maker: 'jennifer.lee@company.com',
    witnesses: ['robert.garcia@company.com', 'emily.davis@company.com'],
    topic: 'HR Policy',
    decision_type: 'operational',
    priority: 'medium',
    impact_scope: 'company',
    deadline: new Date('2024-02-01'),
    parameters: {
      duration: '3-month pilot',
      schedule: 'Monday-Thursday, 9am-6pm',
      evaluation: 'Monthly productivity reviews',
      scope: 'All departments except customer support',
      success_metrics: 'Productivity, employee satisfaction, customer satisfaction',
    },
    key_points: [
      'Maintain same productivity levels with compressed schedule',
      'Customer support will continue 5-day coverage',
      'Monthly surveys to track employee satisfaction',
      'Review pilot results before permanent implementation',
    ],
    raw_thread:
      "Based on research and employee feedback, I've decided to implement a 4-day work week pilot. This could significantly improve work-life balance while maintaining productivity.",
  },
  {
    decision_summary: 'Select PostgreSQL as primary database for new microservices architecture',
    decision_maker: 'alex.rodriguez@company.com',
    witnesses: ['sarah.chen@company.com', 'james.wilson@company.com'],
    topic: 'Database Architecture',
    decision_type: 'technical',
    priority: 'high',
    impact_scope: 'department',
    deadline: new Date('2024-02-15'),
    parameters: {
      migration_timeline: '8 weeks',
      cost: '$25,000 setup + $5,000/month',
      performance_target: '50% query improvement',
      backup_strategy: 'Daily automated backups',
      scaling: 'Horizontal read replicas',
    },
    key_points: [
      'Better JSON support than MySQL for our use cases',
      'Excellent performance for complex queries',
      'Strong ACID compliance for financial data',
      'Active community and extensive documentation',
    ],
    raw_thread:
      "After evaluating MySQL, PostgreSQL, and MongoDB, I've decided on PostgreSQL. It offers the best balance of performance, features, and reliability for our microservices.",
  },
  {
    decision_summary: 'Hire 2 additional senior developers for the mobile team by March 1st',
    decision_maker: 'rachel.kim@company.com',
    witnesses: ['michael.torres@company.com', 'david.brown@company.com'],
    topic: 'Team Expansion',
    decision_type: 'personnel',
    priority: 'high',
    impact_scope: 'department',
    deadline: new Date('2024-03-01'),
    parameters: {
      budget: '$240,000 annual salary budget',
      requirements: '5+ years mobile development, React Native',
      timeline: '6 weeks hiring process',
      team_growth: 'From 4 to 6 developers',
      onboarding: '2-week structured onboarding program',
    },
    key_points: [
      'Critical for meeting Q2 mobile app launch deadline',
      'Focus on candidates with React Native and native iOS/Android experience',
      'Competitive salary package to attract top talent',
      'Remote-first hiring to expand candidate pool',
    ],
    raw_thread:
      "With our mobile roadmap accelerating, I've decided we need 2 more senior developers. This is essential for delivering our Q2 mobile features on time.",
  },
  {
    decision_summary: 'Switch to Figma Enterprise for design collaboration and version control',
    decision_maker: 'emma.thompson@company.com',
    witnesses: ['lisa.wang@company.com', 'john.doe@company.com'],
    topic: 'Design Tools',
    decision_type: 'operational',
    priority: 'medium',
    impact_scope: 'team',
    deadline: new Date('2024-01-20'),
    parameters: {
      cost: '$12/user/month for 15 users',
      migration_time: '2 weeks',
      training: '1-day Figma workshop for all designers',
      benefits: 'Better collaboration, version control, developer handoff',
      previous_tool: 'Adobe XD',
    },
    key_points: [
      'Real-time collaboration will improve design velocity',
      'Better integration with development workflow',
      'Centralized component library management',
      'Improved stakeholder feedback and approval process',
    ],
    raw_thread:
      "After comparing design tools, I'm making the call to switch to Figma Enterprise. The collaboration features alone will pay for the upgrade cost.",
  },
  {
    decision_summary: 'Implement mandatory security training for all employees by January 31st',
    decision_maker: 'kevin.patel@company.com',
    witnesses: ['jennifer.lee@company.com', 'robert.garcia@company.com'],
    topic: 'Security Compliance',
    decision_type: 'operational',
    priority: 'critical',
    impact_scope: 'company',
    deadline: new Date('2024-01-31'),
    parameters: {
      training_provider: 'KnowBe4',
      duration: '2 hours per employee',
      cost: '$15/employee',
      frequency: 'Annual with quarterly phishing tests',
      compliance: 'SOC 2 Type II requirement',
    },
    key_points: [
      'Required for SOC 2 compliance certification',
      'Includes phishing simulation and awareness training',
      'All employees must complete within 30 days',
      'Quarterly refresher sessions and phishing tests',
    ],
    raw_thread:
      "Given our SOC 2 audit requirements and recent security incidents in the industry, I'm mandating security training for everyone. This is non-negotiable for compliance.",
  },
  {
    decision_summary: 'Upgrade to Next.js 14 with App Router for improved performance and SEO',
    decision_maker: 'sarah.chen@company.com',
    witnesses: ['john.doe@company.com', 'alex.smith@company.com'],
    topic: 'Frontend Architecture',
    decision_type: 'technical',
    priority: 'medium',
    impact_scope: 'team',
    deadline: new Date('2024-04-01'),
    parameters: {
      budget: '$8,000',
      timeline: '4 weeks',
      resources: '1 senior developer',
      scope: 'Marketing website and blog',
      success_criteria: '30% faster page loads, better SEO scores',
    },
    key_points: [
      'App Router provides better performance with streaming',
      'Server Components reduce JavaScript bundle size',
      'Improved SEO capabilities with built-in metadata API',
      'Better developer experience with TypeScript support',
    ],
    raw_thread:
      "Following our React 18 migration success, I've decided to upgrade our Next.js stack to v14. The App Router will significantly improve our marketing site performance.",
  },
  {
    decision_summary: 'Implement micro-frontend architecture for better team autonomy',
    decision_maker: 'sarah.chen@company.com',
    witnesses: ['alex.rodriguez@company.com', 'james.wilson@company.com'],
    topic: 'Frontend Architecture',
    decision_type: 'technical',
    priority: 'high',
    impact_scope: 'department',
    deadline: new Date('2024-05-15'),
    parameters: {
      budget: '$35,000',
      timeline: '12 weeks',
      resources: '3 senior developers',
      scope: 'Dashboard and admin panels',
      success_criteria: 'Independent deployments, 50% faster feature delivery',
    },
    key_points: [
      'Each team can deploy independently',
      'Reduced coupling between frontend modules',
      'Better scalability for large development teams',
      'Consistent shared component library',
    ],
    raw_thread:
      "With our team growing to 12 developers, I've decided to implement micro-frontends. This will allow each team to work independently while maintaining consistency.",
  },
  {
    decision_summary: 'Allocate $30,000 for Q2 content marketing and SEO optimization',
    decision_maker: 'michael.torres@company.com',
    witnesses: ['lisa.wang@company.com', 'emma.thompson@company.com'],
    topic: 'Marketing Budget',
    decision_type: 'budget',
    priority: 'high',
    impact_scope: 'company',
    deadline: new Date('2024-04-30'),
    parameters: {
      budget: '$30,000',
      timeline: 'Q2 2024',
      channels: 'Blog content, SEO tools, guest posts',
      target: '40% organic traffic increase',
      roi_target: '200% ROAS',
    },
    key_points: [
      'Focus on high-value long-tail keywords',
      'Create comprehensive product comparison guides',
      'Invest in premium SEO tools and content creation',
      'Partner with industry influencers for guest content',
    ],
    raw_thread:
      "After Q1's digital ad success, I'm approving $30k for content marketing in Q2. We need to build our organic presence to reduce paid ad dependency.",
  },
  {
    decision_summary: 'Launch employee referral program with $2,000 bonus per successful hire',
    decision_maker: 'jennifer.lee@company.com',
    witnesses: ['rachel.kim@company.com', 'kevin.patel@company.com'],
    topic: 'HR Policy',
    decision_type: 'operational',
    priority: 'medium',
    impact_scope: 'company',
    deadline: new Date('2024-03-15'),
    parameters: {
      bonus_amount: '$2,000 per hire',
      eligibility: 'All full-time employees',
      payout_schedule: '50% after 3 months, 50% after 6 months',
      target_roles: 'Engineering, Sales, Marketing',
      success_metrics: '30% of new hires from referrals',
    },
    key_points: [
      'Tap into employee networks for quality candidates',
      'Reduce recruitment agency costs by 40%',
      'Faster hiring process with pre-vetted candidates',
      'Improve employee engagement through participation',
    ],
    raw_thread:
      "With our aggressive hiring goals, I've decided to launch an employee referral program. Our employees know great talent and this will speed up our recruitment.",
  },
  {
    decision_summary: 'Implement flexible PTO policy replacing traditional vacation days',
    decision_maker: 'jennifer.lee@company.com',
    witnesses: ['robert.garcia@company.com', 'michael.torres@company.com'],
    topic: 'HR Policy',
    decision_type: 'operational',
    priority: 'medium',
    impact_scope: 'company',
    deadline: new Date('2024-06-01'),
    parameters: {
      policy_type: 'Unlimited PTO with minimum 15 days',
      approval_process: 'Manager approval required',
      blackout_periods: 'End of quarter, major product launches',
      tracking: 'Monthly PTO usage reports',
      success_metrics: 'Employee satisfaction, actual PTO usage',
    },
    key_points: [
      'Attract top talent with competitive benefits',
      'Reduce administrative overhead of PTO tracking',
      'Encourage work-life balance with minimum requirements',
      'Maintain coverage during critical business periods',
    ],
    raw_thread:
      "Following our 4-day work week pilot success, I've decided to implement flexible PTO. This will further improve work-life balance and help with recruitment.",
  },
  {
    decision_summary: 'Establish remote work stipend of $500/month for home office setup',
    decision_maker: 'jennifer.lee@company.com',
    witnesses: ['david.brown@company.com', 'emma.thompson@company.com'],
    topic: 'HR Policy',
    decision_type: 'operational',
    priority: 'low',
    impact_scope: 'company',
    deadline: new Date('2024-07-01'),
    parameters: {
      stipend_amount: '$500 per month',
      eligibility: 'All remote and hybrid employees',
      eligible_expenses: 'Desk, chair, monitor, internet, utilities',
      reimbursement: 'Monthly with expense receipts',
      budget_impact: '$45,000 annually for 90 employees',
    },
    key_points: [
      'Support employee productivity in home offices',
      'Competitive benefit to attract remote talent',
      'Tax-efficient way to provide employee benefits',
      'Improve ergonomics and reduce workplace injuries',
    ],
    raw_thread:
      "With 80% of our team working remotely, I've decided to provide monthly stipends for home office expenses. This investment will pay off in productivity and retention.",
  },
  // More Frontend Architecture decisions to create a proper timeline
  {
    decision_summary: 'Adopt TypeScript across all React components for better type safety',
    decision_maker: 'sarah.chen@company.com',
    witnesses: ['john.doe@company.com', 'alex.smith@company.com'],
    topic: 'Frontend Architecture',
    decision_type: 'technical',
    priority: 'medium',
    impact_scope: 'team',
    deadline: new Date('2024-01-15'),
    parameters: {
      budget: '$12,000',
      timeline: '6 weeks',
      resources: '2 developers',
      scope: 'All new components, gradual migration of existing',
      success_criteria: 'Zero runtime type errors, better IDE support',
    },
    key_points: [
      'Catch errors at compile time instead of runtime',
      'Better IDE autocompletion and refactoring',
      'Easier onboarding for new developers',
      'Gradual migration strategy to minimize disruption',
    ],
    raw_thread:
      "After several production bugs due to prop type mismatches, I've decided we need to adopt TypeScript across all our React components. This will catch errors before they reach production.",
  },
  {
    decision_summary: 'Implement CSS-in-JS with styled-components for component styling',
    decision_maker: 'sarah.chen@company.com',
    witnesses: ['emma.thompson@company.com', 'john.doe@company.com'],
    topic: 'Frontend Architecture',
    decision_type: 'technical',
    priority: 'low',
    impact_scope: 'team',
    deadline: new Date('2024-02-01'),
    parameters: {
      budget: '$5,000',
      timeline: '3 weeks',
      resources: '1 frontend developer',
      scope: 'Design system components',
      success_criteria: 'Consistent theming, better component isolation',
    },
    key_points: [
      'Better component encapsulation and reusability',
      'Dynamic styling based on props and state',
      'Automatic vendor prefixing and optimization',
      'Easier theme management and consistency',
    ],
    raw_thread:
      "To improve our component styling consistency and maintainability, I've decided to implement styled-components. This will give us better component isolation and dynamic styling capabilities.",
  },
  {
    decision_summary: 'Upgrade frontend testing stack to React Testing Library and Vitest',
    decision_maker: 'sarah.chen@company.com',
    witnesses: ['alex.smith@company.com', 'james.wilson@company.com'],
    topic: 'Frontend Architecture',
    decision_type: 'technical',
    priority: 'high',
    impact_scope: 'team',
    deadline: new Date('2024-06-01'),
    parameters: {
      budget: '$18,000',
      timeline: '8 weeks',
      resources: '2 senior developers',
      scope: 'All component tests, integration tests',
      success_criteria: '90% test coverage, 50% faster test execution',
    },
    key_points: [
      'Better testing practices with user-centric approach',
      'Faster test execution with Vitest',
      'Improved debugging capabilities',
      'Better integration with modern React patterns',
    ],
    raw_thread:
      "Our current testing setup is slowing down development. I've decided to upgrade to React Testing Library and Vitest for better testing practices and faster execution.",
  },
  // More Marketing Budget decisions for timeline
  {
    decision_summary: 'Increase social media advertising budget by $15,000 for Q3 campaign',
    decision_maker: 'michael.torres@company.com',
    witnesses: ['lisa.wang@company.com', 'david.brown@company.com'],
    topic: 'Marketing Budget',
    decision_type: 'budget',
    priority: 'medium',
    impact_scope: 'company',
    deadline: new Date('2024-07-01'),
    parameters: {
      budget: '$15,000',
      timeline: 'Q3 2024',
      channels: 'LinkedIn, Twitter, Instagram',
      target: '20% engagement increase',
      roi_target: '250% ROAS',
    },
    key_points: [
      'Focus on professional networking platforms',
      'Video content strategy for higher engagement',
      'A/B testing of creative formats',
      'Influencer partnership opportunities',
    ],
    raw_thread:
      "Based on Q2 content marketing success, I'm increasing our social media ad spend for Q3. We need to capitalize on the momentum and brand awareness we've built.",
  },
  {
    decision_summary: 'Allocate $25,000 for conference sponsorships and thought leadership',
    decision_maker: 'michael.torres@company.com',
    witnesses: ['jennifer.lee@company.com', 'kevin.patel@company.com'],
    topic: 'Marketing Budget',
    decision_type: 'budget',
    priority: 'high',
    impact_scope: 'company',
    deadline: new Date('2024-08-15'),
    parameters: {
      budget: '$25,000',
      timeline: 'Q3-Q4 2024',
      channels: 'Industry conferences, speaking engagements',
      target: '500 qualified leads',
      roi_target: '180% ROAS',
    },
    key_points: [
      'Establish thought leadership in industry',
      'Direct contact with decision makers',
      'Premium brand positioning',
      'Long-term relationship building',
    ],
    raw_thread:
      "To establish our company as a thought leader, I'm approving $25k for conference sponsorships and speaking opportunities. This will position us as industry experts.",
  },
  // More HR Policy decisions for timeline
  {
    decision_summary: 'Implement monthly team building budget of $200 per employee',
    decision_maker: 'jennifer.lee@company.com',
    witnesses: ['michael.torres@company.com', 'rachel.kim@company.com'],
    topic: 'HR Policy',
    decision_type: 'operational',
    priority: 'low',
    impact_scope: 'company',
    deadline: new Date('2024-02-15'),
    parameters: {
      budget: '$200 per employee monthly',
      total_budget: '$18,000 per month',
      activities: 'Team lunches, activities, retreats',
      approval_process: 'Team lead approval',
      success_metrics: 'Employee satisfaction, team cohesion',
    },
    key_points: [
      'Improve team bonding and communication',
      'Support remote team connection',
      'Flexible spending on team-chosen activities',
      'Quarterly team building events',
    ],
    raw_thread:
      "To improve team cohesion, especially with our remote workforce, I've decided to implement a monthly team building budget. Teams can use this for activities that bring them together.",
  },
  {
    decision_summary: 'Launch professional development fund of $2,000 per employee annually',
    decision_maker: 'jennifer.lee@company.com',
    witnesses: ['sarah.chen@company.com', 'alex.rodriguez@company.com'],
    topic: 'HR Policy',
    decision_type: 'operational',
    priority: 'high',
    impact_scope: 'company',
    deadline: new Date('2024-04-01'),
    parameters: {
      budget: '$2,000 per employee annually',
      total_budget: '$180,000 annually',
      eligible_expenses: 'Courses, conferences, certifications, books',
      approval_process: 'Manager approval, HR tracking',
      success_metrics: 'Skill development, employee retention',
    },
    key_points: [
      'Invest in employee growth and skill development',
      'Improve retention through learning opportunities',
      'Stay competitive with industry skill requirements',
      'Encourage continuous learning culture',
    ],
    raw_thread:
      "To retain talent and keep our skills current, I'm launching a professional development fund. Each employee gets $2,000 annually for learning and growth opportunities.",
  },
  {
    decision_summary: 'Establish performance review cycle with quarterly check-ins',
    decision_maker: 'jennifer.lee@company.com',
    witnesses: ['robert.garcia@company.com', 'kevin.patel@company.com'],
    topic: 'HR Policy',
    decision_type: 'operational',
    priority: 'medium',
    impact_scope: 'company',
    deadline: new Date('2024-05-01'),
    parameters: {
      review_frequency: 'Quarterly check-ins, annual formal review',
      goal_setting: 'OKR framework implementation',
      feedback_process: '360-degree feedback system',
      career_planning: 'Individual development plans',
      success_metrics: 'Employee engagement, goal achievement',
    },
    key_points: [
      'More frequent feedback than annual reviews',
      'Clear goal setting and progress tracking',
      'Career development conversations',
      'Early identification of performance issues',
    ],
    raw_thread:
      "Our current annual review process isn't providing enough feedback. I've decided to implement quarterly check-ins with annual formal reviews for better performance management.",
  },
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
        impact_scope: decision.impact_scope,
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
    console.log('📊 Timeline-ready categories:');
    console.log(
      '   • Frontend Architecture: 6 decisions (TypeScript → CSS-in-JS → React 18 → Next.js 14 → Micro-frontends → Testing)'
    );
    console.log(
      '   • Marketing Budget: 4 decisions (Q1 Digital → Q2 Content → Q3 Social → Conference Sponsorships)'
    );
    console.log(
      '   • HR Policy: 7 decisions (4-day week → Team building → Referral → Dev fund → PTO → Performance → Remote stipend)'
    );
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
