import { AUTH_CONFIG } from '../../lib/config.js';
import cookie from 'cookie';
import { validateCSRFToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Verify CSRF token
  const cookies = cookie.parse(req.headers.cookie || '');
  const csrfCookie = cookies[AUTH_CONFIG.csrf.cookieName];
  const csrfHeader = req.headers['x-csrf-token'];
  
  if (!validateCSRFToken(csrfCookie, csrfHeader)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Clear session cookie
  res.setHeader('Set-Cookie', cookie.serialize(
    AUTH_CONFIG.jwt.cookieName,
    '',
    {
      ...AUTH_CONFIG.jwt.cookieOptions,
      path: '/',
      maxAge: 0,
      expires: new Date(0)
    }
  ));
  
  return res.status(200).json({ success: true });
}