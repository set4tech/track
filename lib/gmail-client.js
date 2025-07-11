import { google } from 'googleapis';
import { decrypt } from './crypto.js';

export class GmailClient {
  constructor(userId) {
    this.userId = userId;
    this.auth = null;
    this.gmail = null;
  }

  async initialize(user) {
    if (!user.gmail_refresh_token_enc || !user.gmail_access_token) {
      throw new Error('User has not authorized Gmail access');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const refreshToken = decrypt(user.gmail_refresh_token_enc);
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: user.gmail_access_token,
      expiry_date: user.gmail_token_expires_at?.getTime()
    });

    this.auth = oauth2Client;
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  async listMessages(query, pageToken = null, labelIds = []) {
    const params = {
      userId: 'me',
      q: query,
      maxResults: 500
    };
    
    if (labelIds && labelIds.length > 0) {
      params.labelIds = labelIds;
    }
    
    if (pageToken) {
      params.pageToken = pageToken;
    }
    
    return await this.gmail.users.messages.list(params);
  }

  async getMessage(messageId, format = 'full') {
    return await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format
    });
  }

  async getHistory(startHistoryId, pageToken = null, labelIds = []) {
    const params = {
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded', 'messageDeleted'],
      maxResults: 500
    };
    
    if (labelIds && labelIds.length > 0) {
      params.labelId = labelIds[0]; // History API only supports single label
    }
    
    if (pageToken) {
      params.pageToken = pageToken;
    }
    
    return await this.gmail.users.history.list(params);
  }

  async getProfile() {
    return await this.gmail.users.getProfile({ userId: 'me' });
  }

  parseEmailAddress(header) {
    if (!header) return { email: '', name: '' };
    
    const match = header.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].replace(/"/g, '').trim(),
        email: match[2].toLowerCase()
      };
    }
    
    return {
      name: '',
      email: header.toLowerCase()
    };
  }

  parseMessageHeaders(message) {
    const headers = {};
    if (message.payload?.headers) {
      message.payload.headers.forEach(header => {
        headers[header.name.toLowerCase()] = header.value;
      });
    }
    return headers;
  }

  parseMessageBody(message) {
    const result = { text: '', html: '' };
    
    const extractBody = (part) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        result.text = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        result.html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      
      if (part.parts) {
        part.parts.forEach(extractBody);
      }
    };
    
    if (message.payload) {
      extractBody(message.payload);
    }
    
    return result;
  }

  parseRecipients(headers, field) {
    const value = headers[field];
    if (!value) return [];
    
    return value.split(',').map(addr => {
      const parsed = this.parseEmailAddress(addr.trim());
      return parsed.email;
    }).filter(email => email);
  }

  async updateTokens(tokens) {
    this.auth.setCredentials(tokens);
    return tokens;
  }
}