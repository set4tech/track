import { sql } from './database.js';
import { getTagsForDecision } from './tag-extractor.js';

export async function getDecisionsForUser(auth, teamId, tagIds, filterMode) {
  let rows;

  // Only show decisions if authenticated
  if (!auth.authenticated) {
    return [];
  } else if (tagIds.length > 0) {
    // Filter by multiple tags
    if (filterMode === 'all') {
      // AND logic - decisions must have ALL selected tags
      const result = teamId
        ? await sql`
          SELECT d.* 
          FROM decisions d
          WHERE d.status = 'confirmed'
            AND d.slack_team_id = ${teamId}
            AND d.id IN (
              SELECT dt.decision_id
              FROM decision_tags dt
              WHERE dt.tag_id = ANY(${tagIds})
              GROUP BY dt.decision_id
              HAVING COUNT(DISTINCT dt.tag_id) = ${tagIds.length}
            )
          ORDER BY d.confirmed_at DESC
        `
        : await sql`
          SELECT d.* 
          FROM decisions d
          WHERE d.status = 'confirmed'
            AND (d.user_id = ${auth.user.id} OR d.created_by_email = ${auth.user.email} OR d.decision_maker = ${auth.user.email})
            AND d.id IN (
              SELECT dt.decision_id
              FROM decision_tags dt
              WHERE dt.tag_id = ANY(${tagIds})
              GROUP BY dt.decision_id
              HAVING COUNT(DISTINCT dt.tag_id) = ${tagIds.length}
            )
          ORDER BY d.confirmed_at DESC
        `;
      rows = result.rows;
    } else {
      // OR logic (default) - decisions with ANY of the selected tags
      const result = teamId
        ? await sql`
          SELECT DISTINCT d.* 
          FROM decisions d
          JOIN decision_tags dt ON d.id = dt.decision_id
          WHERE d.status = 'confirmed' 
            AND dt.tag_id = ANY(${tagIds})
            AND d.slack_team_id = ${teamId}
          ORDER BY d.confirmed_at DESC
        `
        : await sql`
          SELECT DISTINCT d.* 
          FROM decisions d
          JOIN decision_tags dt ON d.id = dt.decision_id
          WHERE d.status = 'confirmed' 
            AND dt.tag_id = ANY(${tagIds})
            AND (d.user_id = ${auth.user.id} OR d.created_by_email = ${auth.user.email} OR d.decision_maker = ${auth.user.email})
          ORDER BY d.confirmed_at DESC
        `;
      rows = result.rows;
    }
  } else if (teamId) {
    const result = await sql`
      SELECT * FROM decisions 
      WHERE status = 'confirmed' 
        AND slack_team_id = ${teamId}
      ORDER BY confirmed_at DESC
    `;
    rows = result.rows;
  } else {
    // Show user's decisions or all decisions based on email
    const result = await sql`
      SELECT * FROM decisions 
      WHERE status = 'confirmed'
        AND (user_id = ${auth.user.id} OR created_by_email = ${auth.user.email} OR decision_maker = ${auth.user.email})
      ORDER BY confirmed_at DESC
    `;
    rows = result.rows;
  }

  return rows;
}

export async function getDecisionsWithTags(rows) {
  try {
    // Get all unique thread IDs
    const threadIds = [...new Set(rows.map((d) => d.thread_id).filter(Boolean))];

    // Fetch all thread information in one query
    const allThreadInfo = {};
    if (threadIds.length > 0) {
      const threadResult = await sql`
        SELECT 
          thread_id,
          id,
          decision_summary,
          decision_maker,
          decision_date,
          priority,
          decision_type
        FROM decisions 
        WHERE thread_id = ANY(${threadIds})
          AND status = 'confirmed'
        ORDER BY thread_id, decision_date ASC
      `;

      // Group by thread_id
      threadResult.rows.forEach((row) => {
        if (!allThreadInfo[row.thread_id]) {
          allThreadInfo[row.thread_id] = [];
        }
        allThreadInfo[row.thread_id].push(row);
      });
    }

    const decisionsWithTags = await Promise.all(
      rows.map(async (decision) => {
        const tags = await getTagsForDecision(decision.id);

        // Get thread info from pre-fetched data
        let threadInfo = { hasMultiple: false, relatedDecisions: [] };
        if (decision.thread_id && allThreadInfo[decision.thread_id]) {
          const relatedDecisions = allThreadInfo[decision.thread_id].filter(
            (d) => d.id !== decision.id
          );
          threadInfo = {
            hasMultiple: relatedDecisions.length > 0,
            relatedDecisions,
            totalInThread: allThreadInfo[decision.thread_id].length,
          };
        }

        return {
          ...decision,
          tags,
          threadInfo,
        };
      })
    );
    return decisionsWithTags;
  } catch (tagError) {
    console.error('Error fetching tags:', tagError);
    // Return decisions without tags if there's an error
    return rows;
  }
}

export async function getThreadInfo(threadId, currentDecisionId) {
  if (!threadId) return { hasMultiple: false, relatedDecisions: [] };

  try {
    const result = await sql`
      SELECT id, decision_summary, decision_maker, decision_date, priority, decision_type
      FROM decisions 
      WHERE thread_id = ${threadId} 
        AND status = 'confirmed'
        AND id != ${currentDecisionId}
      ORDER BY decision_date ASC
    `;

    return {
      hasMultiple: result.rows.length > 0,
      relatedDecisions: result.rows,
      totalInThread: result.rows.length + 1,
    };
  } catch (error) {
    console.error('Error fetching thread info:', error);
    return { hasMultiple: false, relatedDecisions: [] };
  }
}

export async function getAllAvailableTags() {
  try {
    const result = await sql`
      SELECT 
        t.id, 
        t.name, 
        t.description, 
        COUNT(DISTINCT dt.decision_id) as decision_count
      FROM tags t
      LEFT JOIN decision_tags dt ON t.id = dt.tag_id
      GROUP BY t.id, t.name, t.description
      HAVING COUNT(DISTINCT dt.decision_id) > 0
      ORDER BY decision_count DESC, t.name ASC
    `;
    return result.rows;
  } catch (error) {
    console.error('Error fetching available tags:', error);
    return [];
  }
}

export async function getTotalDecisionsCount(auth) {
  if (!auth.authenticated) {
    return 0;
  }

  const result = await sql`
    SELECT COUNT(*) as total FROM decisions 
    WHERE status = 'confirmed'
      AND (user_id = ${auth.user.id} OR created_by_email = ${auth.user.email} OR decision_maker = ${auth.user.email})
  `;
  return result.rows[0].total;
}
