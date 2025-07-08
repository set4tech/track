import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get the appropriate database URL based on environment
export function getDatabaseUrl() {
  // Check if we're in a Vercel deployment
  const vercelEnv = process.env.VERCEL_ENV;
  const branchName = process.env.VERCEL_GIT_COMMIT_REF;
  
  // In production, use the production database
  if (vercelEnv === 'production' || branchName === 'main' || branchName === 'master') {
    return process.env.POSTGRES_URL_PRODUCTION || process.env.POSTGRES_URL;
  }
  
  // For preview deployments, use branch-specific database if available
  if (vercelEnv === 'preview') {
    // First check if a branch-specific URL was injected by CI/CD
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    
    // Fall back to branch-specific environment variable
    const safeBranchName = (branchName || 'develop')
      .replace(/[^A-Z0-9]/gi, '_')
      .toUpperCase();
    
    const branchDbUrl = process.env[`POSTGRES_URL_${safeBranchName}`];
    if (branchDbUrl) {
      return branchDbUrl;
    }
  }
  
  // Local development - use Docker PostgreSQL or environment variable
  if (!vercelEnv) {
    return process.env.DATABASE_URL || 
           process.env.POSTGRES_URL || 
           'postgres://track_user:track_password@localhost:5432/track_dev';
  }
  
  // Default fallback
  return process.env.POSTGRES_URL;
}

// Configure the database connection
export function configureDatabase() {
  const dbUrl = getDatabaseUrl();
  
  if (!dbUrl) {
    throw new Error('No database URL configured');
  }
  
  // Set the database URL for @vercel/postgres
  if (dbUrl !== process.env.POSTGRES_URL) {
    process.env.POSTGRES_URL = dbUrl;
  }
  
  return dbUrl;
}

// Initialize database configuration
configureDatabase();

// Export configured sql client
export { sql };

// Helper to get current database info
export function getDatabaseInfo() {
  const dbUrl = getDatabaseUrl();
  const urlObj = new URL(dbUrl);
  
  return {
    host: urlObj.hostname,
    database: urlObj.pathname.slice(1),
    environment: process.env.VERCEL_ENV || 'local',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'local',
    isProduction: process.env.VERCEL_ENV === 'production' || 
                  process.env.VERCEL_GIT_COMMIT_REF === 'main' ||
                  process.env.VERCEL_GIT_COMMIT_REF === 'master'
  };
}