import { sql } from '@vercel/postgres';
import { GmailClient } from './gmail-client.js';
import OpenAI from 'openai';
import { config } from './config.js';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export class GmailSyncService {
  constructor(userId) {
    this.userId = userId;
    this.client = new GmailClient(userId);
  }

  async initialize() {
    const { rows } = await sql`
      SELECT * FROM users WHERE id = ${this.userId}
    `;
    
    if (!rows[0]) {
      throw new Error('User not found');
    }
    
    this.user = rows[0];
    await this.client.initialize(this.user);
    
    const syncStateResult = await sql`
      SELECT * FROM gmail_sync_state WHERE user_id = ${this.userId}
    `;
    
    this.syncState = syncStateResult.rows[0];
  }

  async fullSync() {
    await this.updateSyncStatus('syncing');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const base = this.syncState?.gmail_filter_query || '';
      const labelIds = this.syncState?.gmail_label_ids?.length 
        ? this.syncState.gmail_label_ids 
        : ['INBOX', 'SENT'];
      
      const dateFilter = `after:${thirtyDaysAgo.toISOString().split('T')[0]}`;
      const query = base ? `${base} ${dateFilter}` : dateFilter;
      
      let pageToken = null;
      let totalMessages = 0;
      
      do {
        const response = await this.client.listMessages(query, pageToken, labelIds);
        
        if (response.data.messages) {
          await this.processMessages(response.data.messages);
          totalMessages += response.data.messages.length;
        }
        
        pageToken = response.data.nextPageToken;
      } while (pageToken);
      
      const profile = await this.client.getProfile();
      const historyId = profile.data.historyId;
      
      await sql`
        UPDATE gmail_sync_state 
        SET last_sync_at = NOW(),
            last_history_id = ${historyId},
            sync_status = 'idle'
        WHERE user_id = ${this.userId}
      `;
      
      return { totalMessages, historyId };
    } catch (error) {
      await this.updateSyncStatus('error');
      throw error;
    }
  }

  async incrementalSync() {
    if (!this.syncState?.last_history_id) {
      return await this.fullSync();
    }
    
    await this.updateSyncStatus('syncing');
    
    try {
      let pageToken = null;
      let newMessages = 0;
      const labelIds = this.syncState?.gmail_label_ids?.length 
        ? this.syncState.gmail_label_ids 
        : ['INBOX', 'SENT'];
      
      do {
        const response = await this.client.getHistory(
          this.syncState.last_history_id,
          pageToken,
          labelIds
        );
        
        if (response.data.history) {
          for (const historyRecord of response.data.history) {
            if (historyRecord.messagesAdded) {
              const messageIds = historyRecord.messagesAdded.map(m => m.message.id);
              await this.processMessageIds(messageIds);
              newMessages += messageIds.length;
            }
          }
        }
        
        pageToken = response.data.nextPageToken;
        
        if (response.data.historyId) {
          await sql`
            UPDATE gmail_sync_state 
            SET last_history_id = ${response.data.historyId}
            WHERE user_id = ${this.userId}
          `;
        }
      } while (pageToken);
      
      await sql`
        UPDATE gmail_sync_state 
        SET last_sync_at = NOW(),
            sync_status = 'idle'
        WHERE user_id = ${this.userId}
      `;
      
      return { newMessages };
    } catch (error) {
      if (error.code === 404) {
        console.log('History expired, running full sync');
        return await this.fullSync();
      }
      
      await this.updateSyncStatus('error');
      throw error;
    }
  }

  async processMessages(messages) {
    const batchSize = 50;
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      await Promise.all(batch.map(msg => this.processMessage(msg.id)));
    }
  }

  async processMessageIds(messageIds) {
    await Promise.all(messageIds.map(id => this.processMessage(id)));
  }

  async processMessage(messageId) {
    try {
      const existing = await sql`
        SELECT id FROM gmail_messages 
        WHERE user_id = ${this.userId} AND gmail_message_id = ${messageId}
      `;
      
      if (existing.rows.length > 0) {
        return;
      }
      
      const response = await this.client.getMessage(messageId, 'full');
      const message = response.data;
      
      const headers = this.client.parseMessageHeaders(message);
      const body = this.client.parseMessageBody(message);
      
      const from = this.client.parseEmailAddress(headers.from);
      const toEmails = this.client.parseRecipients(headers, 'to');
      const ccEmails = this.client.parseRecipients(headers, 'cc');
      
      const relevantToDecisions = this.isRelevantToDecisions(toEmails, ccEmails);
      
      await this.storeMessage({
        messageId: message.id,
        threadId: message.threadId,
        from,
        toEmails,
        ccEmails,
        subject: headers.subject || '',
        snippet: message.snippet || '',
        date: new Date(parseInt(message.internalDate)),
        labels: message.labelIds || [],
        body: relevantToDecisions ? body : null
      });
      
      if (relevantToDecisions && body.text) {
        await this.extractAndStoreDecision(message.id, body.text, headers);
      }
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);
    }
  }

  async storeMessage(data) {
    const transaction = await sql.begin();
    
    try {
      if (data.body) {
        await transaction`
          INSERT INTO gmail_bodies (message_id, user_id, body_text, body_html)
          VALUES (${data.messageId}, ${this.userId}, ${data.body.text}, ${data.body.html})
          ON CONFLICT (message_id) DO NOTHING
        `;
      }
      
      await transaction`
        INSERT INTO gmail_messages (
          user_id, gmail_message_id, gmail_thread_id, from_email, from_name,
          to_emails, cc_emails, subject, snippet, date, has_body, labels
        ) VALUES (
          ${this.userId}, ${data.messageId}, ${data.threadId}, ${data.from.email}, 
          ${data.from.name}, ${data.toEmails}, ${data.ccEmails}, ${data.subject}, 
          ${data.snippet}, ${data.date}, ${!!data.body}, ${data.labels}
        )
        ON CONFLICT (user_id, gmail_message_id) DO NOTHING
      `;
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  isRelevantToDecisions(toEmails, ccEmails) {
    const decisionEmails = ['decisions@bot.set4.io', 'decisions@set4.io'];
    const allRecipients = [...toEmails, ...ccEmails];
    
    return allRecipients.some(email => 
      decisionEmails.some(decisionEmail => 
        email.toLowerCase().includes(decisionEmail)
      )
    );
  }

  async extractDecision(data) {
    try {
      const systemPrompt = `Extract decision information from email threads. IMPORTANT: Since the decision bot has been explicitly CC'd, we should assume a decision has been made or is being documented. Be liberal in what you consider a decision.

Examples of decisions include:
- Any statement of intent or action: "We will...", "I'll...", "Let's..."
- Confirmations: "Yes", "Agreed", "Sounds good", "OK", "Sure", "Let's do it"
- Approvals: "Approved", "Go ahead", "Looks good", "LGTM", "+1"
- Commitments: "I'll handle this", "On it", "Will do"
- Selections: "I prefer A", "B works for me", "Let's try C"

Return a JSON object with:
{
  "decision": "The core decision or action being taken",
  "context": "Brief context explaining why this decision was made",
  "confidence": 0.0-1.0 (how confident you are this is a decision)
}

If no clear decision is found, return null.`;

      const userPrompt = `From: ${data.from}
Subject: ${data.subject}
Date: ${data.date}

${data.text}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      if (result && result.confidence >= 0.3) {
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting decision:', error);
      return null;
    }
  }

  async extractAndStoreDecision(messageId, bodyText, headers) {
    try {
      const decision = await this.extractDecision({
        text: bodyText,
        from: headers.from,
        subject: headers.subject,
        date: headers.date
      });
      
      if (decision) {
        const result = await sql`
          INSERT INTO decisions (
            user_id, decision_text, context, decision_date, 
            status, source, email_from, email_subject
          ) VALUES (
            ${this.userId}, ${decision.decision}, ${decision.context},
            ${new Date(headers.date)}, 'pending', 'gmail',
            ${headers.from}, ${headers.subject}
          )
          RETURNING id
        `;
        
        await sql`
          INSERT INTO gmail_decisions (user_id, gmail_message_id, decision_id)
          VALUES (${this.userId}, ${messageId}, ${result.rows[0].id})
          ON CONFLICT (user_id, gmail_message_id) DO NOTHING
        `;
      }
    } catch (error) {
      console.error('Error extracting decision:', error);
    }
  }

  async updateSyncStatus(status) {
    await sql`
      INSERT INTO gmail_sync_state (user_id, sync_status)
      VALUES (${this.userId}, ${status})
      ON CONFLICT (user_id) DO UPDATE SET sync_status = ${status}
    `;
  }

  async ensureSyncState() {
    const result = await sql`
      INSERT INTO gmail_sync_state (user_id)
      VALUES (${this.userId})
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `;
    
    if (result.rows.length === 0) {
      const existing = await sql`
        SELECT * FROM gmail_sync_state WHERE user_id = ${this.userId}
      `;
      return existing.rows[0];
    }
    
    return result.rows[0];
  }
}