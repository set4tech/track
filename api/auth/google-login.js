import { verifyGoogleToken, findOrCreateUser, generateSessionToken, validateCSRFToken } from '../../lib/auth.js';
import { AUTH_CONFIG } from '../../lib/config.js';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    
    // Validate CSRF token
    const csrfCookie = cookies[AUTH_CONFIG.csrf.cookieName];
    const csrfHeader = req.headers[AUTH_CONFIG.csrf.headerName];
    
    if (!validateCSRFToken(csrfCookie, csrfHeader)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    // Extract and verify Google ID token
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'No credential provided' });
    }
    
    // Verify the token
    const profile = await verifyGoogleToken(credential);
    
    // Find or create user
    const user = await findOrCreateUser(profile);
    
    // Generate session token
    const { token, jti } = generateSessionToken(user);
    
    // Set session cookie
    res.setHeader('Set-Cookie', cookie.serialize(
      AUTH_CONFIG.jwt.cookieName,
      token,
      AUTH_CONFIG.jwt.cookieOptions
    ));
    
    // Return success with user info
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
    
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
}