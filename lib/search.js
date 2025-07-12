import { sql } from './database.js';
import { gmail } from './gmail.js';

export async function searchWithGmailFallback(
  userId,
  query,
  limit = 50,
  includeBodySearch = false
) {
  // First try searching in our database
  const dbResults = await searchDatabase(userId, query, limit);

  // If we have sufficient results or body search is not requested, return DB results
  if (dbResults.length >= 10 || !includeBodySearch) {
    return {
      results: dbResults,
      source: 'database',
    };
  }

  // If we need more results and body search is requested, fetch from Gmail
  console.log('Fetching additional results from Gmail API...');

  try {
    // Get Gmail auth for the user
    const user = await sql`
      SELECT gmail_access_token, gmail_refresh_token_enc, email
      FROM users
      WHERE id = ${userId} AND gmail_sync_enabled = true
    `;

    if (!user.rows.length || !user.rows[0].gmail_access_token) {
      return {
        results: dbResults,
        source: 'database',
        note: 'Gmail sync not enabled',
      };
    }

    // Search Gmail for messages containing the query
    const gmailClient = gmail(user.rows[0].gmail_access_token);
    const gmailQuery = `${query} has:attachment OR is:important`;

    const response = await gmailClient.users.messages.list({
      userId: 'me',
      q: gmailQuery,
      maxResults: Math.min(limit - dbResults.length, 20),
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      return {
        results: dbResults,
        source: 'database',
        note: 'No additional Gmail results found',
      };
    }

    // Fetch full message details for new messages
    const newMessageIds = [];
    for (const message of response.data.messages) {
      // Check if we already have this message body in our database
      const exists = await sql`
        SELECT 1 FROM gmail_bodies 
        WHERE user_id = ${userId} AND message_id = ${message.id}
        LIMIT 1
      `;

      if (!exists.rows.length) {
        newMessageIds.push(message.id);
      }
    }

    // Fetch and store new message bodies
    const fetchedMessages = await fetchAndStoreGmailBodies(
      gmailClient,
      userId,
      newMessageIds.slice(0, 10) // Limit to 10 messages to stay within timeout
    );

    // Re-run the search to include newly indexed content
    if (fetchedMessages > 0) {
      const enhancedResults = await searchDatabase(userId, query, limit);
      return {
        results: enhancedResults,
        source: 'database+gmail',
        fetched: fetchedMessages,
      };
    }

    return {
      results: dbResults,
      source: 'database',
    };
  } catch (error) {
    console.error('Gmail fallback error:', error);
    return {
      results: dbResults,
      source: 'database',
      error: 'Gmail search failed',
    };
  }
}

async function searchDatabase(userId, query, limit) {
  const results = await sql`
    WITH search_query AS (
      SELECT plainto_tsquery('english', ${query}) AS q
    ),
    all_results AS (
      SELECT 
        d.id::TEXT,
        'decision' AS type,
        COALESCE(d.topic, LEFT(d.decision_summary, 100)) AS title,
        d.decision_summary AS snippet,
        jsonb_build_object(
          'decision_maker', d.decision_maker,
          'decision_date', d.decision_date,
          'status', d.status,
          'parameters', d.parameters
        ) AS metadata,
        ts_rank(d.search_vector, sq.q) AS rank,
        d.created_at
      FROM decisions d, search_query sq
      WHERE d.user_id = ${userId}
        AND d.search_vector @@ sq.q
      
      UNION ALL
      
      SELECT 
        gm.id::TEXT,
        'email' AS type,
        gm.subject AS title,
        gm.snippet AS snippet,
        jsonb_build_object(
          'from', COALESCE(gm.from_name, gm.from_email),
          'from_email', gm.from_email,
          'date', gm.date,
          'has_body', gm.has_body,
          'gmail_message_id', gm.gmail_message_id,
          'gmail_thread_id', gm.gmail_thread_id
        ) AS metadata,
        ts_rank(gm.search_vector, sq.q) AS rank,
        gm.created_at
      FROM gmail_messages gm, search_query sq
      WHERE gm.user_id = ${userId}
        AND gm.search_vector @@ sq.q
      
      UNION ALL
      
      SELECT 
        gb.message_id AS id,
        'email_body' AS type,
        gm.subject AS title,
        LEFT(gb.body_text, 200) || '...' AS snippet,
        jsonb_build_object(
          'from', COALESCE(gm.from_name, gm.from_email),
          'from_email', gm.from_email,
          'date', gm.date,
          'gmail_message_id', gm.gmail_message_id,
          'gmail_thread_id', gm.gmail_thread_id
        ) AS metadata,
        ts_rank(gb.search_vector, sq.q) AS rank,
        gb.created_at
      FROM gmail_bodies gb
      JOIN gmail_messages gm ON gb.message_id = gm.gmail_message_id AND gb.user_id = gm.user_id
      CROSS JOIN search_query sq
      WHERE gb.user_id = ${userId}
        AND gb.search_vector @@ sq.q
    )
    SELECT *
    FROM all_results
    ORDER BY rank DESC, created_at DESC
    LIMIT ${limit}
  `;

  return results.rows;
}

async function fetchAndStoreGmailBodies(gmailClient, userId, messageIds) {
  let stored = 0;

  for (const messageId of messageIds) {
    try {
      const message = await gmailClient.users.messages.get({
        userId: 'me',
        id: messageId,
      });

      const bodyText = extractTextFromGmailMessage(message.data);

      if (bodyText) {
        await sql`
          INSERT INTO gmail_bodies (message_id, user_id, body_text)
          VALUES (${messageId}, ${userId}, ${bodyText})
          ON CONFLICT (message_id) DO UPDATE
          SET body_text = ${bodyText}, created_at = NOW()
        `;
        stored++;
      }
    } catch (error) {
      console.error(`Failed to fetch Gmail message ${messageId}:`, error);
    }
  }

  return stored;
}

function extractTextFromGmailMessage(message) {
  let text = '';

  function extractFromPart(part) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += `${Buffer.from(part.body.data, 'base64').toString('utf-8')}\n`;
    }

    if (part.parts) {
      part.parts.forEach(extractFromPart);
    }
  }

  if (message.payload) {
    extractFromPart(message.payload);
  }

  return text.trim();
}

// Keyset pagination helpers
export function encodeSearchCursor(rank, id) {
  return Buffer.from(JSON.stringify({ rank, id })).toString('base64');
}

export function decodeSearchCursor(cursor) {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function searchWithKeysetPagination(userId, query, limit = 50, cursor = null) {
  let whereClause = `user_id = ${userId} AND search_vector @@ plainto_tsquery('english', ${query})`;
  const orderBy = 'rank DESC, id DESC';

  if (cursor) {
    const { rank, id } = decodeSearchCursor(cursor);
    if (rank && id) {
      whereClause += ` AND (rank < ${rank} OR (rank = ${rank} AND id < ${id}))`;
    }
  }

  const results = await sql`
    SELECT 
      id,
      decision_summary,
      topic,
      ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM decisions
    WHERE ${sql.unsafe(whereClause)}
    ORDER BY ${sql.unsafe(orderBy)}
    LIMIT ${limit}
  `;

  const nextCursor =
    results.rows.length === limit
      ? encodeSearchCursor(
          results.rows[results.rows.length - 1].rank,
          results.rows[results.rows.length - 1].id
        )
      : null;

  return {
    results: results.rows,
    nextCursor,
    hasMore: results.rows.length === limit,
  };
}
