import { AUTH_CONFIG } from '../../lib/config.js';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Clear session cookie
  res.setHeader('Set-Cookie', cookie.serialize(
    AUTH_CONFIG.jwt.cookieName,
    '',
    {
      ...AUTH_CONFIG.jwt.cookieOptions,
<<<<<<< HEAD
      maxAge: 0
=======
      maxAge: 0,
      expires: new Date(0)
>>>>>>> origin/dev
    }
  ));
  
  return res.status(200).json({ success: true });
}