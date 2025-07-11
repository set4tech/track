import { requireAuth } from '../../lib/auth.js';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await requireAuth(req, res);
    if (!authContext) return;

    const { filterQuery, labelIds } = req.body;

    if (filterQuery !== undefined && typeof filterQuery !== 'string') {
      return res.status(400).json({ error: 'Invalid filter query' });
    }

    if (labelIds !== undefined && (!Array.isArray(labelIds) || !labelIds.every(id => typeof id === 'string'))) {
      return res.status(400).json({ error: 'Invalid label IDs' });
    }

    const updates = {};
    if (filterQuery !== undefined) updates.gmail_filter_query = filterQuery;
    if (labelIds !== undefined) updates.gmail_label_ids = labelIds;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No settings to update' });
    }

    await sql`
      INSERT INTO gmail_sync_state (user_id, gmail_filter_query, gmail_label_ids)
      VALUES (
        ${authContext.user.id}, 
        ${filterQuery || ''}, 
        ${labelIds || ['INBOX', 'SENT']}
      )
      ON CONFLICT (user_id) DO UPDATE
      SET 
        gmail_filter_query = COALESCE(${filterQuery}, gmail_sync_state.gmail_filter_query),
        gmail_label_ids = COALESCE(${labelIds}, gmail_sync_state.gmail_label_ids),
        updated_at = NOW()
    `;

    return res.status(200).json({ 
      success: true,
      settings: {
        filterQuery: filterQuery || null,
        labelIds: labelIds || null
      }
    });
  } catch (error) {
    console.error('Gmail settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
}