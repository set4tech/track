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
  
  console.log('CSRF Debug:', {
    cookieName: AUTH_CONFIG.csrf.cookieName,
    csrfCookie: csrfCookie ? `${csrfCookie.substring(0, 10)}...` : 'undefined',
    csrfHeader: csrfHeader ? `${csrfHeader.substring(0, 10)}...` : 'undefined',
    allCookies: Object.keys(cookies)
  });
  
  if (!validateCSRFToken(csrfCookie, csrfHeader)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Clear session cookie
  // Force secure: false in development to ensure cookie can be cleared
  const cookieOptions = {
    ...AUTH_CONFIG.jwt.cookieOptions,
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  };
  
  // In development, ensure secure is false so the cookie can be cleared
  if (process.env.NODE_ENV !== 'production') {
    cookieOptions.secure = false;
  }
  
  res.setHeader('Set-Cookie', cookie.serialize(
    AUTH_CONFIG.jwt.cookieName,
    '',
    cookieOptions
  ));
  
  return res.status(200).json({ success: true });
}