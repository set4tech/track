import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const auth = await requireAuth(req, res);
  
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.error });
  }
  
  return res.status(200).json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      picture: auth.user.picture,
      provider: auth.user.provider
    }
  });
}