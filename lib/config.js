import { getDatabaseInfo } from './database.js';
import crypto from 'crypto';

// Get environment-specific configuration
export function getConfig() {
  const dbInfo = getDatabaseInfo();
  
  return {
    // Database info
    ...dbInfo,
    
    // Inbound email addresses (for receiving decisions)
    // Using plus addressing for different environments
    inboundEmail: dbInfo.isProduction 
      ? 'decisions@bot.set4.io'
      : `decisions+${dbInfo.environment}@bot.set4.io`,
    
    // Examples:
    // production: decisions@bot.set4.io
    // preview: decisions+preview@bot.set4.io  
    // local: decisions+local@bot.set4.io
    
    // SendGrid webhook path
    webhookPath: '/api/webhook-inbound',
    
    // Base URL for the application
    baseUrl: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || 'http://localhost:3000'
  };
}

// Helper to display the correct email in UI/docs
export function getInboundEmailAddress() {
  const config = getConfig();
  return config.inboundEmail;
}

// Authentication configuration
export const AUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    allowedDomains: process.env.GOOGLE_ALLOWED_DOMAINS?.split(',') || []
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    allowedDomains: process.env.MICROSOFT_ALLOWED_DOMAINS?.split(',') || []
  },
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
    expiresIn: '30d',
    cookieName: 'track1_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  },
  csrf: {
    cookieName: 'track1_csrf',
    headerName: 'x-csrf-token'
  }
};