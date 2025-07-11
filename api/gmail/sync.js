import { requireAuth } from '../../lib/auth.js';
import { GmailSyncService } from '../../lib/gmail-sync.js';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await requireAuth(req, res);
    if (!authContext) return;

    const { action = 'incremental' } = req.body;

    const userResult = await sql`
      SELECT gmail_sync_enabled FROM users WHERE id = ${authContext.user.id}
    `;

    if (!userResult.rows[0]?.gmail_sync_enabled) {
      return res.status(400).json({ error: 'Gmail sync not enabled for this user' });
    }

    const syncStateResult = await sql`
      SELECT sync_status FROM gmail_sync_state WHERE user_id = ${authContext.user.id}
    `;

    if (syncStateResult.rows[0]?.sync_status === 'syncing') {
      return res.status(409).json({ error: 'Sync already in progress' });
    }

    const syncService = new GmailSyncService(authContext.user.id);
    await syncService.initialize();

    let result;
    if (action === 'full') {
      result = await syncService.fullSync();
    } else {
      result = await syncService.incrementalSync();
    }

    return res.status(200).json({
      success: true,
      action,
      ...result
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    
    if (error.message?.includes('User has not authorized Gmail access')) {
      return res.status(401).json({ error: 'Gmail authorization required' });
    }
    
    return res.status(500).json({ error: 'Sync failed', details: error.message });
  }
}