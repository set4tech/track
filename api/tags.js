import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  try {
    const result = await sql`
      SELECT 
        t.id, 
        t.name, 
        t.description, 
        t.usage_count,
        COUNT(DISTINCT dt.decision_id) as decision_count
      FROM tags t
      LEFT JOIN decision_tags dt ON t.id = dt.tag_id
      GROUP BY t.id, t.name, t.description, t.usage_count
      ORDER BY t.usage_count DESC, t.name ASC
    `;
    
    res.status(200).json({
      tags: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}