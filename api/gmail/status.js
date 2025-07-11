import { requireAuth } from '../../lib/auth.js';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await requireAuth(req, res);
    if (!authContext) return;

    const userResult = await sql`
      SELECT 
        gmail_sync_enabled,
        gmail_token_expires_at
      FROM users 
      WHERE id = ${authContext.user.id}
    `;

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const syncStateResult = await sql`
      SELECT 
        gmail_filter_query,
        gmail_label_ids,
        last_sync_at,
        sync_status
      FROM gmail_sync_state 
      WHERE user_id = ${authContext.user.id}
    `;

    const syncState = syncStateResult.rows[0];

    const messagesResult = await sql`
      SELECT COUNT(*) as total_messages 
      FROM gmail_messages 
      WHERE user_id = ${authContext.user.id}
    `;

    const decisionsResult = await sql`
      SELECT COUNT(*) as extracted_decisions 
      FROM gmail_decisions 
      WHERE user_id = ${authContext.user.id}
    `;

    const tokenExpired = user.gmail_token_expires_at 
      ? new Date(user.gmail_token_expires_at) < new Date() 
      : true;

    return res.status(200).json({
      enabled: user.gmail_sync_enabled || false,
      tokenExpired,
      tokenExpiresAt: user.gmail_token_expires_at,
      syncState: syncState ? {
        filterQuery: syncState.gmail_filter_query || '',
        labelIds: syncState.gmail_label_ids || ['INBOX', 'SENT'],
        lastSyncAt: syncState.last_sync_at,
        status: syncState.sync_status || 'idle'
      } : null,
      stats: {
        totalMessages: parseInt(messagesResult.rows[0].total_messages),
        extractedDecisions: parseInt(decisionsResult.rows[0].extracted_decisions)
      }
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    return res.status(500).json({ error: 'Failed to get Gmail status' });
  }
}