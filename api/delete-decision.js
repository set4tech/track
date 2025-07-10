import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Decision ID required' });
    }

    const result = await sql`
      DELETE FROM decisions 
      WHERE id = ${id}
      RETURNING id, decision_summary
    `;
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      deleted: result.rows[0] 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
}