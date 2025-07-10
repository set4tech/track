import { sql } from '../lib/database.js';
import { getTagsForDecision } from '../lib/tag-extractor.js';

export default async function handler(req, res) {
  try {
    const { team_id, tag_id } = req.query;
    
    let whereClause = 'WHERE d.status = \'confirmed\'';
    const params = [];
    
    if (team_id) {
      whereClause += ' AND d.slack_team_id = $1';
      params.push(team_id);
    }
    
    if (tag_id) {
      whereClause += params.length > 0 ? ' AND dt.tag_id = $2' : ' AND dt.tag_id = $1';
      params.push(tag_id);
    }
    
    const query = tag_id ? `
      SELECT DISTINCT d.* 
      FROM decisions d
      JOIN decision_tags dt ON d.id = dt.decision_id
      ${whereClause}
      ORDER BY d.confirmed_at DESC
    ` : `
      SELECT d.* 
      FROM decisions d
      ${whereClause}
      ORDER BY d.confirmed_at DESC
    `;
    
    const result = await sql.query(query, params);
    const decisions = result.rows;
    
    // Fetch tags for each decision
    const decisionsWithTags = await Promise.all(
      decisions.map(async (decision) => {
        const tags = await getTagsForDecision(decision.id);
        return {
          ...decision,
          tags
        };
      })
    );
    
    res.status(200).json({
      decisions: decisionsWithTags,
      total: decisionsWithTags.length
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}