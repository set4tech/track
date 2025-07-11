Below is the same implementation proposal rewritten to include first-class server-side filtering, a dedicated storage table for large message bodies, and explicit encryption of OAuth refresh tokens. Everything that was present earlier is kept; only the additions and the places they touch are changed.

## Executive Summary

The backend will sync only the subset of Gmail traffic that matters to collaboration by letting every user store an arbitrary Gmail search expression and a list of labelIds. The worker passes those values straight to the Gmail API, which returns only matching message IDs, cutting both quota consumption and local storage. Message bodies move to a new `gmail_bodies` table so the hot `gmail_messages` rows stay small. Refresh tokens are no longer stored in plaintext; instead they are AES-GCM–encrypted with a per-environment KMS key before insertion and decrypted in memory only when needed. These changes do not alter the overall OAuth → token → sync → decision pipeline.

## Current Architecture Analysis

Nothing in the existing OAuth, database, decision-extraction or auth subsystems changes except for the new encrypted-token helper and the fact that body text and HTML are written to a companion table.

## Gmail API Integration Strategy

The high-level five-stage flow is unchanged: user login, OAuth consent, token storage, selective sync, decision extraction. The difference comes in the query and label handling. During consent the front end now also asks for an optional filter string and a comma-separated list of Gmail label IDs. They default to the company domain restriction shown below and to the pair INBOX and SENT unless the user edits them.

## Server-Side Query and Label Filtering

A new nullable column called `gmail_filter_query` and another called `gmail_label_ids` are added to `gmail_sync_state`. Both store user preferences. When `GmailSyncService.fullSync` or `incrementalSync` builds the search it concatenates the saved filter with the date range then passes `labelIds` exactly as supplied. A typical default looks like

```
q: '(from:(*@set4.io) OR to:(*@set4.io)) -category:promotions -category:social after:2025/06/11'
labelIds: ['INBOX','SENT']
```

so the worker never lists promotional or social mail and never touches folders the user did not explicitly request.

In code that means replacing the single-line construction

```js
const query = `after:${thirtyDaysAgo.toISOString().split('T')[0]}`;
```

with

```js
const base = syncState?.gmail_filter_query || '';
const labelIds = (syncState?.gmail_label_ids?.length) ? syncState.gmail_label_ids : ['INBOX', 'SENT'];
const query = `${base} after:${thirtyDaysAgo.toISOString().split('T')[0]}`;
const response = await this.client.listMessages(query, pageToken, labelIds);
```

and extending `listMessages` in `gmail-client.js` so it accepts `labelIds` and forwards them.

## Dedicated Body Storage

Large message bodies are pushed into a separate table that keeps `gmail_messages` narrow and index-friendly.

```sql
CREATE TABLE gmail_bodies (
  message_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_text TEXT,
  body_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

`gmail_messages` loses `body_text` and `body_html` and instead gains a boolean `has_body`. The parser writes the body to `gmail_bodies` first, takes the returned key (identical to `gmail_message_id`), sets `has_body = TRUE`, and commits the header row. Down-stream decision extraction reads the body through a join when needed.

## Encrypted Token Storage

A helper `encrypt(text)` and `decrypt(ciphertext)` pair wrap the Node crypto module backed by a KMS-derived 256-bit key read from the environment. During OAuth callback the server writes

```sql
UPDATE users
SET gmail_refresh_token_enc = ${encrypt(tokens.refresh_token)},
    gmail_access_token = ${tokens.access_token},
    gmail_token_expires_at = ${new Date(tokens.expiry_date)},
    gmail_sync_enabled = TRUE
WHERE email = ${userInfo.email}
```

and from then on `GmailClient.initialize` calls `decrypt` before it sets credentials. The plain `gmail_refresh_token` column disappears; instead the migration introduces

```sql
ALTER TABLE users
ADD COLUMN gmail_refresh_token_enc BYTEA;
```

Access tokens are short-lived and stay unencrypted.

## Database Schema Changes

The new migration script supersedes the earlier one.

```sql
-- 20250711_gmail_sync_with_filter_and_bodies.sql

-- token column change
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gmail_refresh_token_enc BYTEA,
DROP COLUMN IF EXISTS gmail_refresh_token;

-- filter and label preferences
ALTER TABLE gmail_sync_state
ADD COLUMN IF NOT EXISTS gmail_filter_query TEXT,
ADD COLUMN IF NOT EXISTS gmail_label_ids TEXT[];

-- body offload
ALTER TABLE gmail_messages
DROP COLUMN IF EXISTS body_text,
DROP COLUMN IF EXISTS body_html,
ADD COLUMN IF NOT EXISTS has_body BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS gmail_bodies (
  message_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_text TEXT,
  body_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

The same generic `update_updated_at_column` trigger attaches to `gmail_bodies`.

## Implementation Code

The only files that change are `gmail-client.js`, `gmail-sync.js`, and the OAuth callback handler. `gmail-client.listMessages` takes a third argument `labelIds`:

```javascript
async listMessages(query, pageToken = null, labelIds = []) {
  const params = {
    userId: 'me',
    q: query,
    labelIds,
    maxResults: 500
  };
  if (pageToken) params.pageToken = pageToken;
  return await this.gmail.users.messages.list(params);
}
```

`GmailSyncService.storeMessage` becomes two SQL statements, one inserting into `gmail_bodies`, the other into `gmail_messages`, with `has_body` set accordingly.

## Security Considerations

Refresh tokens are encrypted at rest with AES-GCM and a KMS master key, decrypted only in process memory, and never logged. Message bodies are in their own table and can be moved to object storage later if required; until then row-level privileges keep them invisible outside the owner. The server continues to request read-only Gmail scopes.

## Performance Optimisations

Because filtering runs on Google’s side the worker lists far fewer message IDs. The first phase lists with `format: 'metadata'` and only fetches full messages when the ID set is small enough or when a header inspection finds that the bot address is among the recipients, which keeps the daily unit count well under project limits even for ten-thousand-message inboxes.

## Monitoring and Error Handling

History expiry can occur within hours; the handler now retries twice on 404, then promotes the job to a full sync, logs the event, and alerts. The quota monitor shows per-user and per-project unit consumption so operators can spot runaway filters.

## Migration Strategy

Run the new SQL, deploy the updated code, then backfill `gmail_filter_query` and `gmail_label_ids` with sensible defaults. The worker detects an older `gmail_messages` row that still contains bodies, migrates them lazily into `gmail_bodies`, and clears the old columns, so no blocking full dump is required.

## Testing Strategy

Unit tests expand to cover encrypt-decrypt cycles and the new query builder. Integration tests feed synthetic mailboxes through the metadata-first listing path to confirm that only colleague traffic appears. Load tests write bodies into the new table and verify that `gmail_messages` stays below the eight-kilobyte inline threshold. Security tests check that the encrypted token column never reveals the plaintext when inspected through psql.

## Future Enhancements

Once Pub/Sub watch is enabled the same filter string and labelIds can be reused in the watch request, giving near-real-time ingestion without extra design work. Attachment binaries can likewise move to object storage behind expiring signed URLs using the same per-message foreign-key pattern introduced for bodies.

The rest of the plan, including package-json changes, environment variables, API usage flow, and AI decision extraction, is unchanged.

