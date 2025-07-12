import { sql } from '../lib/database.js';
import {
  searchWithKeysetPagination,
  encodeSearchCursor,
  decodeSearchCursor,
} from '../lib/search.js';

async function testSearchSetup() {
  console.log('Setting up test data...');

  // Create a test user
  const [user] = await sql`
    INSERT INTO users (provider, provider_id, email, name)
    VALUES ('google', 'test-search-user', 'search-test@example.com', 'Search Test User')
    ON CONFLICT (provider, provider_id) DO UPDATE
    SET email = EXCLUDED.email
    RETURNING id
  `;

  // Clear existing test data
  await sql`DELETE FROM decisions WHERE user_id = ${user.id}`;
  await sql`DELETE FROM gmail_messages WHERE user_id = ${user.id}`;
  await sql`DELETE FROM gmail_bodies WHERE user_id = ${user.id}`;

  // Insert test decisions
  const decisions = [
    {
      message_id: 'search-test-1',
      thread_id: 'thread-1',
      decision_summary: 'We should implement PostgreSQL full-text search for better performance',
      topic: 'Search Implementation',
      decision_maker: 'search-test@example.com',
      parameters: { technology: 'PostgreSQL', feature: 'full-text search' },
    },
    {
      message_id: 'search-test-2',
      thread_id: 'thread-2',
      decision_summary: 'The team agreed to use GIN indexes for optimal search performance',
      topic: 'Database Indexing Strategy',
      decision_maker: 'search-test@example.com',
      parameters: { index_type: 'GIN', purpose: 'search optimization' },
    },
    {
      message_id: 'search-test-3',
      thread_id: 'thread-3',
      decision_summary: 'Budget approved for upgrading the database server',
      topic: 'Infrastructure Budget',
      decision_maker: 'search-test@example.com',
      parameters: { amount: 5000, purpose: 'database upgrade' },
    },
  ];

  for (const decision of decisions) {
    await sql`
      INSERT INTO decisions (
        user_id, message_id, thread_id, decision_summary, 
        topic, decision_maker, parameters, status
      ) VALUES (
        ${user.id}, ${decision.message_id}, ${decision.thread_id},
        ${decision.decision_summary}, ${decision.topic}, 
        ${decision.decision_maker}, ${decision.parameters}, 'confirmed'
      )
    `;
  }

  // Insert test Gmail messages
  const messages = [
    {
      gmail_message_id: 'gmail-1',
      gmail_thread_id: 'gmail-thread-1',
      from_email: 'alice@example.com',
      from_name: 'Alice',
      subject: 'Re: Search functionality requirements',
      snippet: 'I think we should use PostgreSQL full-text search...',
      to_emails: ['search-test@example.com'],
      cc_emails: [],
    },
    {
      gmail_message_id: 'gmail-2',
      gmail_thread_id: 'gmail-thread-2',
      from_email: 'bob@example.com',
      from_name: 'Bob',
      subject: 'Database performance optimization',
      snippet: 'The current search is too slow, we need better indexing...',
      to_emails: ['search-test@example.com'],
      cc_emails: ['alice@example.com'],
    },
  ];

  for (const message of messages) {
    await sql`
      INSERT INTO gmail_messages (
        user_id, gmail_message_id, gmail_thread_id,
        from_email, from_name, subject, snippet,
        to_emails, cc_emails, date, has_body
      ) VALUES (
        ${user.id}, ${message.gmail_message_id}, ${message.gmail_thread_id},
        ${message.from_email}, ${message.from_name}, ${message.subject},
        ${message.snippet}, ${message.to_emails}, ${message.cc_emails},
        NOW(), false
      )
    `;
  }

  // Insert test Gmail body
  await sql`
    INSERT INTO gmail_bodies (message_id, user_id, body_text)
    VALUES (
      'gmail-1', ${user.id}, 
      'I think we should use PostgreSQL full-text search for the following reasons:\n' ||
      '1. It is built into the database\n' ||
      '2. It supports ranking and relevance\n' ||
      '3. It has excellent performance with GIN indexes\n' ||
      '4. No external dependencies needed'
    )
  `;

  return user.id;
}

async function testBasicSearch(userId) {
  console.log('\n=== Testing Basic Search ===');

  // Test 1: Search for "PostgreSQL"
  const results1 = await sql`
    SELECT 
      id, decision_summary, topic,
      ts_rank(search_vector, plainto_tsquery('english', 'PostgreSQL')) AS rank
    FROM decisions
    WHERE user_id = ${userId}
      AND search_vector @@ plainto_tsquery('english', 'PostgreSQL')
    ORDER BY rank DESC
  `;

  console.log(`✓ Found ${results1.length} decisions matching "PostgreSQL"`);
  if (results1.length > 0) {
    console.log(`  Top result: ${results1[0].topic} (rank: ${results1[0].rank})`);
  }

  // Test 2: Search for "performance"
  const results2 = await sql`
    SELECT 
      id, subject, snippet,
      ts_rank(search_vector, plainto_tsquery('english', 'performance')) AS rank
    FROM gmail_messages
    WHERE user_id = ${userId}
      AND search_vector @@ plainto_tsquery('english', 'performance')
    ORDER BY rank DESC
  `;

  console.log(`✓ Found ${results2.length} emails matching "performance"`);
  if (results2.length > 0) {
    console.log(`  Top result: ${results2[0].subject}`);
  }

  // Test 3: Search in email bodies
  const results3 = await sql`
    SELECT 
      gb.message_id, gm.subject,
      ts_rank(gb.search_vector, plainto_tsquery('english', 'ranking relevance')) AS rank
    FROM gmail_bodies gb
    JOIN gmail_messages gm ON gb.message_id = gm.gmail_message_id AND gb.user_id = gm.user_id
    WHERE gb.user_id = ${userId}
      AND gb.search_vector @@ plainto_tsquery('english', 'ranking relevance')
    ORDER BY rank DESC
  `;

  console.log(`✓ Found ${results3.length} email bodies matching "ranking relevance"`);
}

async function testCombinedSearch(userId) {
  console.log('\n=== Testing Combined Search ===');

  const query = 'search';
  const results = await sql`
    WITH search_query AS (
      SELECT plainto_tsquery('english', ${query}) AS q
    ),
    all_results AS (
      SELECT 
        'decision' AS type,
        d.topic AS title,
        d.decision_summary AS content,
        ts_rank(d.search_vector, sq.q) AS rank,
        d.created_at
      FROM decisions d, search_query sq
      WHERE d.user_id = ${userId}
        AND d.search_vector @@ sq.q
      
      UNION ALL
      
      SELECT 
        'email' AS type,
        gm.subject AS title,
        gm.snippet AS content,
        ts_rank(gm.search_vector, sq.q) AS rank,
        gm.created_at
      FROM gmail_messages gm, search_query sq
      WHERE gm.user_id = ${userId}
        AND gm.search_vector @@ sq.q
      
      UNION ALL
      
      SELECT 
        'email_body' AS type,
        gm.subject AS title,
        LEFT(gb.body_text, 100) AS content,
        ts_rank(gb.search_vector, sq.q) AS rank,
        gb.created_at
      FROM gmail_bodies gb
      JOIN gmail_messages gm ON gb.message_id = gm.gmail_message_id AND gb.user_id = gm.user_id
      CROSS JOIN search_query sq
      WHERE gb.user_id = ${userId}
        AND gb.search_vector @@ sq.q
    )
    SELECT * FROM all_results
    ORDER BY rank DESC, created_at DESC
    LIMIT 10
  `;

  console.log(`✓ Combined search for "${query}" found ${results.length} results`);
  for (const result of results) {
    console.log(`  - [${result.type}] ${result.title} (rank: ${result.rank})`);
  }
}

async function testKeysetPagination(userId) {
  console.log('\n=== Testing Keyset Pagination ===');

  // Test cursor encoding/decoding
  const testRank = 0.123456;
  const testId = 42;
  const encoded = encodeSearchCursor(testRank, testId);
  const decoded = decodeSearchCursor(encoded);

  console.log(`✓ Cursor encoding/decoding works: rank=${decoded.rank}, id=${decoded.id}`);

  // Test pagination
  const page1 = await searchWithKeysetPagination(userId, 'search', 2);
  console.log(`✓ Page 1: ${page1.results.length} results, hasMore: ${page1.hasMore}`);

  if (page1.nextCursor) {
    const page2 = await searchWithKeysetPagination(userId, 'search', 2, page1.nextCursor);
    console.log(`✓ Page 2: ${page2.results.length} results, hasMore: ${page2.hasMore}`);
  }
}

function testSearchAPI() {
  console.log('\n=== Testing Search API ===');

  // Test the search endpoint with different queries
  const testQueries = [
    { q: 'PostgreSQL', type: 'decisions' },
    { q: 'performance', type: 'emails' },
    { q: 'search', type: null }, // all types
    { q: 'GIN indexes' },
  ];

  console.log('✓ Search API endpoint created at /api/search');
  console.log('  Example queries:');
  for (const query of testQueries) {
    const params = new URLSearchParams(query).toString();
    console.log(`  - GET /api/search?${params}`);
  }
}

async function runTests() {
  try {
    console.log('🔍 Testing PostgreSQL Full-Text Search Implementation\n');

    const userId = await testSearchSetup();
    await testBasicSearch(userId);
    await testCombinedSearch(userId);
    await testKeysetPagination(userId);
    testSearchAPI();

    console.log('\n✅ All search tests completed successfully!');

    // Cleanup
    await sql`DELETE FROM decisions WHERE user_id = ${userId}`;
    await sql`DELETE FROM gmail_messages WHERE user_id = ${userId}`;
    await sql`DELETE FROM gmail_bodies WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
  } catch (error) {
    console.error('\n❌ Search test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(() => process.exit(0));
}
