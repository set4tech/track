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
      const result = teamId ? 
        await sql`
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
        ` :
        await sql`
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
      const result = teamId ?
        await sql`
          SELECT DISTINCT d.* 
          FROM decisions d
          JOIN decision_tags dt ON d.id = dt.decision_id
          WHERE d.status = 'confirmed' 
            AND dt.tag_id = ANY(${tagIds})
            AND d.slack_team_id = ${teamId}
          ORDER BY d.confirmed_at DESC
        ` :
        await sql`
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
    const decisionsWithTags = await Promise.all(
      rows.map(async (decision) => {
        const tags = await getTagsForDecision(decision.id);
        return {
          ...decision,
          tags
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