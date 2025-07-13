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
    inboundEmail: dbInfo.isProduction ? 'me@bot.set4.io' : `me+${dbInfo.environment}@bot.set4.io`,

    // Examples:
    // production: me@bot.set4.io
    // preview: me+preview@bot.set4.io
    // local: me+local@bot.set4.io

    // SendGrid webhook path
    webhookPath: '/api/webhook-inbound',

    // Base URL for the application
    baseUrl: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || 'http://localhost:3000',
  };
}

// Export configuration values
export const config = {
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDER_EMAIL: process.env.SENDER_EMAIL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  POSTGRES_URL: process.env.POSTGRES_URL,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  VERCEL_PROTECTION_BYPASS: process.env.VERCEL_PROTECTION_BYPASS,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Helper to display the correct email in UI/docs
export function getInboundEmailAddress() {
  const configData = getConfig();
  return configData.inboundEmail;
}

// Authentication configuration
export const AUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    allowedDomains: process.env.GOOGLE_ALLOWED_DOMAINS?.split(',') || [],
    // Determine redirect URI based on environment
    redirectUri: process.env.GOOGLE_REDIRECT_URI || (() => {
      // Local development
      if (!process.env.VERCEL) {
        return 'http://localhost:3000/api/auth/gmail-callback';
      }
      
      // Production deployments
      if (process.env.VERCEL_ENV === 'production') {
        return 'https://track.set4.io/api/auth/gmail-callback';
      }
      
      // Preview deployments (including dev branch)
      if (process.env.VERCEL_URL) {
        // Check if it's the dev branch deployment
        if (process.env.VERCEL_URL.includes('track-git-dev') || 
            process.env.VERCEL_GIT_COMMIT_REF === 'dev') {
          return 'https://dev.track.set4.io/api/auth/gmail-callback';
        }
        // Other preview deployments
        return `https://${process.env.VERCEL_URL}/api/auth/gmail-callback`;
      }
      
      // Fallback to stable Vercel app domain
      return 'https://track-set4.vercel.app/api/auth/gmail-callback';
    })(),
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    allowedDomains: process.env.MICROSOFT_ALLOWED_DOMAINS?.split(',') || [],
  },
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
    expiresIn: '30d',
    cookieName: 'track1_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  },
  csrf: {
    cookieName: 'track1_csrf',
    headerName: 'x-csrf-token',
  },
};
