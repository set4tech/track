#!/usr/bin/env node

import { config } from 'dotenv';
import { sql } from '../lib/database.js';
import crypto from 'crypto';

// Load environment variables
config({ path: '.env.local' });

// Test users for witness scenarios
const TEST_USERS = {
  alice: 'alice@testcompany.com',
  bob: 'bob@testcompany.com',
  charlie: 'charlie@testcompany.com',
  diana: 'diana@testcompany.com'
};

const WITNESS_TEST_DECISIONS = [
  // Alice is the decision maker, Bob and Charlie are witnesses
  {
    decision_summary: "Approve new project timeline extension to Q2 2024",
    decision_maker: TEST_USERS.alice,
    witnesses: [TEST_USERS.bob, TEST_USERS.charlie],
    topic: "Project Management",
    decision_type: "operational",
    priority: "high",
    raw_thread: "After reviewing the current progress, I've decided to extend our timeline to Q2. This will ensure quality delivery."
  },
  
  // Bob is the decision maker, Alice is a witness
  {
    decision_summary: "Switch to AWS from Google Cloud for better cost optimization",
    decision_maker: TEST_USERS.bob,
    witnesses: [TEST_USERS.alice, TEST_USERS.diana],
    topic: "Infrastructure",
    decision_type: "technical",
    priority: "critical",
    raw_thread: "Based on our cost analysis, I'm making the call to migrate to AWS. We'll save 30% on infrastructure costs."
  },
  
  // Charlie is the decision maker, Alice and Bob are witnesses
  {
    decision_summary: "Implement weekly team retrospectives starting next Monday",
    decision_maker: TEST_USERS.charlie,
    witnesses: [TEST_USERS.alice, TEST_USERS.bob],
    topic: "Team Process",
    decision_type: "operational",
    priority: "medium",
    raw_thread: "To improve our team dynamics, I've decided we'll have weekly retrospectives every Friday at 4pm."
  },
  
  // Diana is the decision maker, only Alice is a witness
  {
    decision_summary: "Adopt TypeScript for all new frontend development",
    decision_maker: TEST_USERS.diana,
    witnesses: [TEST_USERS.alice],
    topic: "Development Standards",
    decision_type: "technical",
    priority: "high",
    raw_thread: "Given the benefits for code quality and developer experience, all new frontend code will be written in TypeScript."
  },
  
  // Alice is the decision maker with no witnesses
  {
    decision_summary: "Cancel the offsite meeting due to budget constraints",
    decision_maker: TEST_USERS.alice,
    witnesses: [],
    topic: "Events",
    decision_type: "budget",
    priority: "low",
    raw_thread: "Unfortunately, I need to cancel the planned offsite. We'll do a virtual event instead to stay within budget."
  },
  
  // Bob is the decision maker, Alice is NOT a witness
  {
    decision_summary: "Hire two junior developers for the backend team",
    decision_maker: TEST_USERS.bob,
    witnesses: [TEST_USERS.charlie, TEST_USERS.diana],
    topic: "Hiring",
    decision_type: "personnel",
    priority: "high",
    raw_thread: "I've approved hiring two junior developers to help with our growing backend workload."
  }
];

async function seedWitnessTestData() {
  console.log('🌱 Starting witness test data seeding...');
  console.log('\n📧 Test Users:');
  Object.entries(TEST_USERS).forEach(([name, email]) => {
    console.log(`   ${name}: ${email}`);
  });
  
  try {
    // Clear existing test data for these specific test users
    console.log('\n🧹 Clearing existing test decisions...');
    for (const email of Object.values(TEST_USERS)) {
      await sql`
        DELETE FROM decisions 
        WHERE decision_maker = ${email} 
           OR ${email} = ANY(witnesses)
      `;
    }
    
    console.log('\n📝 Inserting witness test decisions...');
    
    for (const decision of WITNESS_TEST_DECISIONS) {
      const messageId = crypto.randomBytes(16).toString('hex');
      const confirmToken = crypto.randomBytes(32).toString('hex');
      const decisionDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random date within last 7 days
      const confirmedAt = new Date(decisionDate.getTime() + Math.random() * 2 * 60 * 60 * 1000); // Confirmed within 2 hours
      
      const parsedContext = {
        confidence: 95,
        decision_summary: decision.decision_summary,
        decision_maker: decision.decision_maker,
        witnesses: decision.witnesses,
        decision_date: decisionDate.toISOString(),
        topic: decision.topic,
        priority: decision.priority,
        decision_type: decision.decision_type
      };
      
      await sql`
        INSERT INTO decisions (
          message_id, thread_id, decision_summary, decision_maker, witnesses,
          decision_date, topic, priority, decision_type,
          status, raw_thread, parsed_context,
          confirmation_token, confirmed_at, created_at
        ) VALUES (
          ${messageId}, ${messageId}, ${decision.decision_summary}, 
          ${decision.decision_maker}, ${decision.witnesses},
          ${decisionDate}, ${decision.topic}, 
          ${decision.priority}, ${decision.decision_type}, 
          'confirmed', ${decision.raw_thread}, ${JSON.stringify(parsedContext)},
          ${confirmToken}, ${confirmedAt}, ${decisionDate}
        )
      `;
      
      console.log(`✅ Added: ${decision.decision_summary.substring(0, 50)}...`);
      console.log(`   Decision maker: ${decision.decision_maker}`);
      console.log(`   Witnesses: ${decision.witnesses.length > 0 ? decision.witnesses.join(', ') : 'None'}`);
    }
    
    // Show summary for Alice (our main test user)
    console.log('\n📊 Summary for Alice (alice@testcompany.com):');
    
    const aliceAsMaker = await sql`
      SELECT COUNT(*) as count FROM decisions 
      WHERE decision_maker = ${TEST_USERS.alice} 
        AND status = 'confirmed'
    `;
    console.log(`   - Decisions where Alice is the maker: ${aliceAsMaker.rows[0].count}`);
    
    const aliceAsWitness = await sql`
      SELECT COUNT(*) as count FROM decisions 
      WHERE ${TEST_USERS.alice} = ANY(witnesses) 
        AND status = 'confirmed'
    `;
    console.log(`   - Decisions where Alice is a witness: ${aliceAsWitness.rows[0].count}`);
    
    const aliceTotal = await sql`
      SELECT COUNT(*) as count FROM decisions 
      WHERE status = 'confirmed'
        AND (decision_maker = ${TEST_USERS.alice} OR ${TEST_USERS.alice} = ANY(witnesses))
    `;
    console.log(`   - Total decisions involving Alice: ${aliceTotal.rows[0].count}`);
    
    console.log(`\n🎉 Successfully seeded ${WITNESS_TEST_DECISIONS.length} witness test decisions!`);
    console.log('\n💡 To test the filter:');
    console.log('   1. View all decisions: /api/index');
    console.log('   2. View only "My Decisions": /api/index?role=maker');
    console.log('   3. Use alice@testcompany.com as the test user email');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedWitnessTestData();
}

export default seedWitnessTestData;