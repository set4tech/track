import { getDatabaseInfo } from './database.js';

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