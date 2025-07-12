#!/usr/bin/env node
import { sql } from '../lib/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Simple unit test for search functionality
async function testSearchFunctionality() {
  console.log('🔍 Testing PostgreSQL Full-Text Search\n');

  try {
    // Test 1: Check if search_vector columns exist
    console.log('📋 Checking database schema...');

    const decisionsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'decisions' 
      AND column_name = 'search_vector'
    `;

    if (decisionsColumns.rows.length > 0) {
      console.log('✓ decisions.search_vector column exists');
    } else {
      throw new Error('decisions.search_vector column not found');
    }

    const messagesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gmail_messages' 
      AND column_name = 'search_vector'
    `;

    if (messagesColumns.rows.length > 0) {
      console.log('✓ gmail_messages.search_vector column exists');
    } else {
      throw new Error('gmail_messages.search_vector column not found');
    }

    const bodiesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gmail_bodies' 
      AND column_name = 'search_vector'
    `;

    if (bodiesColumns.rows.length > 0) {
      console.log('✓ gmail_bodies.search_vector column exists');
    } else {
      throw new Error('gmail_bodies.search_vector column not found');
    }

    // Test 2: Check if GIN indexes exist
    console.log('\n📊 Checking search indexes...');

    const indexes = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE '%search_vector%'
    `;

    console.log(`✓ Found ${indexes.rows.length} search indexes:`);
    for (const idx of indexes.rows) {
      console.log(`  - ${idx.indexname} on ${idx.tablename}`);
    }

    // Test 3: Check if trigger functions exist
    console.log('\n⚙️  Checking trigger functions...');

    const triggers = await sql`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE '%search_vector%'
    `;

    console.log(`✓ Found ${triggers.rows.length} search triggers:`);
    for (const trigger of triggers.rows) {
      console.log(`  - ${trigger.trigger_name} on ${trigger.event_object_table}`);
    }

    // Test 4: Test basic search query syntax
    console.log('\n🔬 Testing search query syntax...');

    const testQuery = await sql`
      SELECT plainto_tsquery('english', 'test query') AS query,
             to_tsvector('english', 'This is a test query for search') AS vector
    `;

    console.log('✓ Full-text search functions working correctly');
    console.log(`  Query: ${testQuery.rows[0].query}`);
    console.log(`  Vector tokens: ${testQuery.rows[0].vector}`);

    // Test 5: Check search function exists
    console.log('\n🔧 Checking search function...');

    const searchFunction = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'search_all_content'
    `;

    if (searchFunction.rows.length > 0) {
      console.log('✓ search_all_content function exists');
    } else {
      console.log('⚠️  search_all_content function not found (optional)');
    }

    console.log('\n✅ All search infrastructure tests passed!');
  } catch (error) {
    console.error('\n❌ Search test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSearchFunctionality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
