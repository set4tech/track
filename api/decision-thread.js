import { sql } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Decision ID is required' });
    }

    const result = await sql`
      SELECT id, decision_summary, decision_maker, witnesses, decision_date, 
             topic, parameters, priority, decision_type, deadline, impact_scope, 
             raw_thread, parsed_context, confirmed_at, thread_id
      FROM decisions 
      WHERE id = ${id} AND status = 'confirmed'
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const decision = result.rows[0];

    // Get related decisions in the same thread
    let relatedDecisions = [];
    if (decision.thread_id) {
      const relatedResult = await sql`
        SELECT id, decision_summary, decision_maker, decision_date, priority, decision_type
        FROM decisions 
        WHERE thread_id = ${decision.thread_id} 
          AND status = 'confirmed'
          AND id != ${id}
        ORDER BY decision_date ASC
      `;
      relatedDecisions = relatedResult.rows;
    }

    // Parse the stored JSON fields with better error handling
    let params = {};
    let parsedContext = {};
    try {
      params =
        typeof decision.parameters === 'string'
          ? JSON.parse(decision.parameters)
          : decision.parameters || {};
    } catch (e) {
      console.error('Parameters JSON parse error:', e);
      params = {};
    }

    try {
      parsedContext =
        typeof decision.parsed_context === 'string'
          ? JSON.parse(decision.parsed_context)
          : decision.parsed_context || {};
    } catch (e) {
      console.error('Parsed context JSON parse error:', e);
      parsedContext = {};
    }

    res.status(200).json({
      ...decision,
      parameters: params,
      parsed_context: parsedContext,
      relatedDecisions,
    });
  } catch (error) {
    console.error('Thread fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}
