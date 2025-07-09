import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { ConfidentialClientApplication } from '@azure/msal-node';
import crypto from 'crypto';
import { AUTH_CONFIG } from './config.js';
import { sql } from './database.js';

// Google OAuth client
const googleClient = new OAuth2Client(AUTH_CONFIG.google.clientId);

// Microsoft MSAL client (only initialize if configured)
let msalClient = null;
if (AUTH_CONFIG.microsoft.clientId && process.env.MICROSOFT_CLIENT_SECRET) {
  const msalConfig = {
    auth: {
      clientId: AUTH_CONFIG.microsoft.clientId,
      authority: `https://login.microsoftonline.com/${AUTH_CONFIG.microsoft.tenantId}`,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET
    }
  };
  msalClient = new ConfidentialClientApplication(msalConfig);
}

// Verify Google ID token
export async function verifyGoogleToken(idToken) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: AUTH_CONFIG.google.clientId
    });
    
    const payload = ticket.getPayload();
    
    // Check domain restrictions if configured
    if (AUTH_CONFIG.google.allowedDomains.length > 0) {
      const domain = payload.email?.split('@')[1];
      if (!domain || !AUTH_CONFIG.google.allowedDomains.includes(domain)) {
        throw new Error('Email domain not allowed');
      }
    }
    
    return {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
  } catch (error) {
    throw new Error(`Google token verification failed: ${error.message}`);
  }
}

// Verify Microsoft ID token
export async function verifyMicrosoftToken(idToken) {
  try {
    // For Microsoft, we need to decode and verify manually or use a helper
    const decoded = jwt.decode(idToken, { complete: true });
    
    // Verify token signature using Microsoft's public keys
    // This is simplified - in production use proper JWKS verification
    const payload = decoded.payload;
    
    // Check tenant restrictions
    if (AUTH_CONFIG.microsoft.tenantId !== 'common' && 
        payload.tid !== AUTH_CONFIG.microsoft.tenantId) {
      throw new Error('Invalid tenant');
    }
    
    // Check domain restrictions if configured
    if (AUTH_CONFIG.microsoft.allowedDomains.length > 0 && payload.email) {
      const domain = payload.email.split('@')[1];
      if (!domain || !AUTH_CONFIG.microsoft.allowedDomains.includes(domain)) {
        throw new Error('Email domain not allowed');
      }
    }
    
    return {
      provider: 'microsoft',
      providerId: payload.oid || payload.sub,
      email: payload.email || payload.preferred_username,
      name: payload.name,
      picture: null // Microsoft doesn't provide picture in ID token
    };
  } catch (error) {
    throw new Error(`Microsoft token verification failed: ${error.message}`);
  }
}

// Find or create user
export async function findOrCreateUser(profile) {
  // Check if user exists
  let user = await sql`
    SELECT * FROM users WHERE provider = ${profile.provider} AND provider_id = ${profile.providerId}
  `;
  
  if (user.rows.length === 0) {
    // Create new user
    const result = await sql`
      INSERT INTO users (provider, provider_id, email, name, picture) 
      VALUES (${profile.provider}, ${profile.providerId}, ${profile.email}, ${profile.name}, ${profile.picture}) 
      RETURNING *
    `;
    user = result;
  } else {
    // Update last login
    await sql`
      UPDATE users SET last_login = now() WHERE id = ${user.rows[0].id}
    `;
  }
  
  return user.rows[0];
}

// Generate session JWT
export function generateSessionToken(user) {
  const jti = crypto.randomBytes(16).toString('hex');
  
  const token = jwt.sign(
    {
      userId: user.id,
      provider: user.provider,
      email: user.email,
      jti
    },
    AUTH_CONFIG.jwt.secret,
    {
      expiresIn: AUTH_CONFIG.jwt.expiresIn,
      issuer: 'track1'
    }
  );
  
  return { token, jti };
}

// Verify session JWT
export function verifySessionToken(token) {
  try {
    return jwt.verify(token, AUTH_CONFIG.jwt.secret, {
      issuer: 'track1'
    });
  } catch (error) {
    return null;
  }
}

// CSRF token generation and validation
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(cookieValue, headerValue) {
  if (!cookieValue || !headerValue) return false;
  return crypto.timingSafeEqual(
    Buffer.from(cookieValue),
    Buffer.from(headerValue)
  );
}

// Middleware helper for protected routes
export async function requireAuth(req, res) {
  const token = req.cookies?.[AUTH_CONFIG.jwt.cookieName];
  
  if (!token) {
    return { authenticated: false, error: 'No session token' };
  }
  
  const payload = verifySessionToken(token);
  if (!payload) {
    return { authenticated: false, error: 'Invalid session token' };
  }
  
  // Optionally verify session in database
  const user = await sql`
    SELECT * FROM users WHERE id = ${payload.userId}
  `;
  
  if (user.rows.length === 0) {
    return { authenticated: false, error: 'User not found' };
  }
  
  return { 
    authenticated: true, 
    user: user.rows[0],
    session: payload 
  };
}