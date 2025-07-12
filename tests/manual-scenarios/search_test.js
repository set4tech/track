import { sql } from '../../lib/database.js';

export const name = 'search';
export const description = 'Test full-text search functionality';

export async function run() {
  console.log('🔍 Testing Full-Text Search\n');

  // Create test user
  const userResult = await sql`
    INSERT INTO users (provider, provider_id, email, name)
    VALUES ('google', 'search-manual-test', 'search@example.com', 'Search Test')
    ON CONFLICT (provider, provider_id) DO UPDATE
    SET email = EXCLUDED.email
    RETURNING id, email
  `;
  const user = userResult.rows[0];
  console.log(`✓ Created test user: ${user.email}`);

  // Insert various test decisions
  const testDecisions = [
    {
      message_id: 'search-1',
      thread_id: 'thread-1',
      decision_summary:
        'We decided to migrate our search infrastructure from Elasticsearch to PostgreSQL full-text search',
      topic: 'Search Infrastructure Migration',
      decision_maker: 'cto@company.com',
      parameters: {
        from: 'Elasticsearch',
        to: 'PostgreSQL FTS',
        timeline: 'Q2 2024',
      },
    },
    {
      message_id: 'search-2',
      thread_id: 'thread-2',
      decision_summary: 'Team approved using GIN indexes for optimal text search performance',
      topic: 'Database Optimization Strategy',
      decision_maker: 'lead@company.com',
      parameters: {
        index_type: 'GIN',
        tables: ['decisions', 'messages'],
      },
    },
    {
      message_id: 'search-3',
      thread_id: 'thread-3',
      decision_summary: 'Budget allocation of $50,000 approved for cloud infrastructure upgrade',
      topic: 'Q1 Infrastructure Budget',
      decision_maker: 'cfo@company.com',
      parameters: {
        amount: 50000,
        purpose: 'cloud infrastructure',
      },
    },
    {
      message_id: 'search-4',
      thread_id: 'thread-4',
      decision_summary: 'New hiring plan approved: 5 engineers for search team',
      topic: 'Engineering Team Expansion',
      decision_maker: 'hr@company.com',
      parameters: {
        positions: 5,
        team: 'search',
        start_date: '2024-04-01',
      },
    },
  ];

  console.log('\nInserting test decisions...');
  for (const decision of testDecisions) {
    await sql`
      INSERT INTO decisions (
        user_id, message_id, thread_id, decision_summary,
        topic, decision_maker, parameters, status,
        created_at
      ) VALUES (
        ${user.id}, ${decision.message_id}, ${decision.thread_id},
        ${decision.decision_summary}, ${decision.topic},
        ${decision.decision_maker}, ${decision.parameters}, 'confirmed',
        NOW() - INTERVAL '1 day' * random() * 30
      )
    `;
  }
  console.log(`✓ Inserted ${testDecisions.length} test decisions`);

  // Test various search queries
  console.log('\n📊 Testing Search Queries:\n');

  const testQueries = [
    'PostgreSQL',
    'search',
    'infrastructure',
    'budget',
    'GIN indexes',
    'team expansion',
    '$50,000',
    'Q2 2024',
  ];

  for (const query of testQueries) {
    const results = await sql`
      SELECT 
        id,
        topic,
        decision_summary,
        ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
      FROM decisions
      WHERE user_id = ${user.id}
        AND search_vector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 5
    `;

    console.log(`Query: "${query}"`);
    if (results.rows.length === 0) {
      console.log('  No results found');
    } else {
      for (const result of results.rows) {
        console.log(`  - ${result.topic} (rank: ${result.rank.toFixed(4)})`);
        console.log(`    ${result.decision_summary.substring(0, 80)}...`);
      }
    }
    console.log('');
  }

  // Test ranking quality
  console.log('📈 Testing Search Ranking:\n');

  const rankingQuery = 'search infrastructure PostgreSQL';
  const rankingResults = await sql`
    SELECT 
      topic,
      decision_summary,
      ts_rank(search_vector, plainto_tsquery('english', ${rankingQuery})) AS rank,
      ts_rank_cd(search_vector, plainto_tsquery('english', ${rankingQuery})) AS rank_cd
    FROM decisions
    WHERE user_id = ${user.id}
      AND search_vector @@ plainto_tsquery('english', ${rankingQuery})
    ORDER BY rank DESC
  `;

  console.log(`Query: "${rankingQuery}"`);
  console.log('Results ordered by relevance:');
  for (const [idx, result] of rankingResults.rows.entries()) {
    console.log(`${idx + 1}. ${result.topic}`);
    console.log(`   Rank: ${result.rank.toFixed(4)}, Rank CD: ${result.rank_cd.toFixed(4)}`);
  }

  // Test search performance
  console.log('\n⚡ Testing Search Performance:\n');

  const performanceQuery = 'infrastructure budget team';
  const startTime = Date.now();

  const perfResults = await sql`
    WITH search_results AS (
      SELECT 
        id,
        topic,
        ts_rank(search_vector, plainto_tsquery('english', ${performanceQuery})) AS rank
      FROM decisions
      WHERE user_id = ${user.id}
        AND search_vector @@ plainto_tsquery('english', ${performanceQuery})
    )
    SELECT * FROM search_results
    ORDER BY rank DESC
    LIMIT 10
  `;

  const searchTime = Date.now() - startTime;
  console.log(`✓ Search completed in ${searchTime}ms`);
  console.log(`  Found ${perfResults.rows.length} results for "${performanceQuery}"`);

  // Show index usage
  console.log('\n🔧 Index Usage Analysis:\n');

  const explainResult = await sql`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, topic, ts_rank(search_vector, plainto_tsquery('english', ${performanceQuery})) AS rank
    FROM decisions
    WHERE user_id = ${user.id}
      AND search_vector @@ plainto_tsquery('english', ${performanceQuery})
    ORDER BY rank DESC
    LIMIT 10
  `;

  console.log('Query plan shows GIN index usage:');
  for (const row of explainResult.rows.slice(0, 5)) {
    console.log(`  ${row['QUERY PLAN']}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await sql`DELETE FROM decisions WHERE user_id = ${user.id}`;
  await sql`DELETE FROM users WHERE id = ${user.id}`;
  console.log('✓ Test data cleaned up');

  console.log('\n✅ Search functionality test completed!');
}
