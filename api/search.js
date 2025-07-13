import { sql } from '../lib/database.js';
import { verifyAuth } from '../lib/auth.js';
import { searchWithGmailFallback, searchWithKeysetPagination } from '../lib/search.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q: query, limit = 50, offset = 0, type, cursor, includeBodySearch = false } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    // Validate type parameter
    const validTypes = ['decisions', 'emails', 'bodies', 'all'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type parameter. Must be one of: ${validTypes.join(', ')}` });
    }

    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const offsetNum = parseInt(offset) || 0;

    let results;
    let response;

    // Use cursor-based pagination if cursor is provided
    if (cursor && type === 'decisions') {
      response = await searchWithKeysetPagination(user.id, query, limitNum, cursor);
      return res.status(200).json({
        query,
        type: 'decisions',
        limit: limitNum,
        results: response.results,
        nextCursor: response.nextCursor,
        hasMore: response.hasMore,
      });
    }

    // Use Gmail fallback for comprehensive search
    if (includeBodySearch === 'true' && !type) {
      const searchResult = await searchWithGmailFallback(user.id, query, limitNum, true);
      return res.status(200).json({
        query,
        type: 'all',
        limit: limitNum,
        results: searchResult.results,
        total: searchResult.results.length,
        hasMore: searchResult.results.length === limitNum,
        source: searchResult.source,
        fetched: searchResult.fetched,
      });
    }

    // Standard search by type
    if (type === 'decisions') {
      results = await searchDecisions(user.id, query, limitNum, offsetNum);
    } else if (type === 'emails') {
      results = await searchEmails(user.id, query, limitNum, offsetNum);
    } else if (type === 'bodies') {
      results = await searchEmailBodies(user.id, query, limitNum, offsetNum);
    } else {
      results = await searchAll(user.id, query, limitNum, offsetNum);
    }

    return res.status(200).json({
      query,
      type: type || 'all',
      limit: limitNum,
      offset: offsetNum,
      results,
      total: results.length,
      hasMore: results.length === limitNum,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function searchDecisions(userId, query, limit, offset) {
  const results = await sql`
    SELECT 
      id,
      decision_summary,
      topic,
      parameters,
      decision_maker,
      decision_date,
      status,
      created_at,
      ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM decisions
    WHERE user_id = ${userId}
      AND search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return results.rows.map((r) => ({
    id: r.id,
    type: 'decision',
    title: r.topic || r.decision_summary.substring(0, 100),
    summary: r.decision_summary,
    metadata: {
      decision_maker: r.decision_maker,
      decision_date: r.decision_date,
      status: r.status,
      parameters: r.parameters,
    },
    rank: r.rank,
    created_at: r.created_at,
  }));
}

async function searchEmails(userId, query, limit, offset) {
  const results = await sql`
    SELECT 
      id,
      gmail_message_id,
      gmail_thread_id,
      subject,
      snippet,
      from_email,
      from_name,
      date,
      has_body,
      ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM gmail_messages
    WHERE user_id = ${userId}
      AND search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC, date DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return results.rows.map((r) => ({
    id: r.id,
    type: 'email',
    title: r.subject,
    summary: r.snippet,
    metadata: {
      from: r.from_name || r.from_email,
      from_email: r.from_email,
      date: r.date,
      has_body: r.has_body,
      gmail_message_id: r.gmail_message_id,
      gmail_thread_id: r.gmail_thread_id,
    },
    rank: r.rank,
    created_at: r.date,
  }));
}

async function searchEmailBodies(userId, query, limit, offset) {
  const results = await sql`
    SELECT 
      gb.message_id,
      gb.body_text,
      gm.subject,
      gm.from_email,
      gm.from_name,
      gm.date,
      gm.gmail_message_id,
      gm.gmail_thread_id,
      ts_rank(gb.search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM gmail_bodies gb
    JOIN gmail_messages gm ON gb.message_id = gm.gmail_message_id AND gb.user_id = gm.user_id
    WHERE gb.user_id = ${userId}
      AND gb.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC, gm.date DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return results.rows.map((r) => ({
    id: r.message_id,
    type: 'email_body',
    title: r.subject,
    summary: `${r.body_text.substring(0, 200)}...`,
    metadata: {
      from: r.from_name || r.from_email,
      from_email: r.from_email,
      date: r.date,
      gmail_message_id: r.gmail_message_id,
      gmail_thread_id: r.gmail_thread_id,
    },
    rank: r.rank,
    created_at: r.date,
  }));
}

async function searchAll(userId, query, limit, offset) {
  const results = await sql`
    WITH search_query AS (
      SELECT plainto_tsquery('english', ${query}) AS q
    ),
    decisions_results AS (
      SELECT 
        d.id,
        'decision'::TEXT AS type,
        COALESCE(d.topic, LEFT(d.decision_summary, 100)) AS title,
        d.decision_summary AS snippet,
        d.decision_maker,
        d.decision_date,
        d.status,
        d.parameters,
        ts_rank(d.search_vector, sq.q) AS rank,
        d.created_at
      FROM decisions d, search_query sq
      WHERE d.user_id = ${userId}
        AND d.search_vector @@ sq.q
    ),
    messages_results AS (
      SELECT 
        gm.id,
        'email'::TEXT AS type,
        gm.subject AS title,
        gm.snippet AS snippet,
        gm.from_email AS decision_maker,
        gm.date AS decision_date,
        gm.has_body::TEXT AS status,
        jsonb_build_object(
          'from_email', gm.from_email,
          'from_name', gm.from_name,
          'gmail_message_id', gm.gmail_message_id,
          'has_body', gm.has_body
        ) AS parameters,
        ts_rank(gm.search_vector, sq.q) AS rank,
        gm.created_at
      FROM gmail_messages gm, search_query sq
      WHERE gm.user_id = ${userId}
        AND gm.search_vector @@ sq.q
    ),
    bodies_results AS (
      SELECT 
        gb.message_id::TEXT AS id,
        'email_body'::TEXT AS type,
        gm.subject AS title,
        LEFT(gb.body_text, 200) AS snippet,
        gm.from_email AS decision_maker,
        gm.date AS decision_date,
        'has_body'::TEXT AS status,
        jsonb_build_object(
          'from_email', gm.from_email,
          'from_name', gm.from_name,
          'gmail_message_id', gm.gmail_message_id
        ) AS parameters,
        ts_rank(gb.search_vector, sq.q) AS rank,
        gb.created_at
      FROM gmail_bodies gb
      JOIN gmail_messages gm ON gb.message_id = gm.gmail_message_id AND gb.user_id = gm.user_id
      CROSS JOIN search_query sq
      WHERE gb.user_id = ${userId}
        AND gb.search_vector @@ sq.q
    )
    SELECT * FROM (
      SELECT * FROM decisions_results
      UNION ALL
      SELECT * FROM messages_results
      UNION ALL
      SELECT * FROM bodies_results
    ) AS combined_results
    ORDER BY rank DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return results.rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    summary: r.snippet,
    metadata: {
      decision_maker: r.decision_maker,
      date: r.decision_date,
      status: r.status,
      ...r.parameters,
    },
    rank: r.rank,
    created_at: r.created_at,
  }));
}
