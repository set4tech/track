// Webhook proxy for handling dynamic preview deployments
// This endpoint can be deployed to a stable URL and proxy to the correct preview deployment

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, cc } = req.body;
  
  // Determine which environment based on the email address
  let targetUrl;
  
  if (to?.includes('decisions@bot.set4.io') || cc?.includes('decisions@bot.set4.io')) {
    // Production
    targetUrl = 'https://track-set4.vercel.app/api/webhook-inbound';
  } else if (to?.includes('@preview.bot.set4.io') || cc?.includes('@preview.bot.set4.io')) {
    // Preview - you could store the latest preview URL in an environment variable
    // or use a database to track active preview deployments
    targetUrl = process.env.PREVIEW_WEBHOOK_URL || 'https://track-set4.vercel.app/api/webhook-inbound';
  } else if (to?.includes('@dev.bot.set4.io') || cc?.includes('@dev.bot.set4.io')) {
    // Development
    targetUrl = process.env.DEV_WEBHOOK_URL || 'http://localhost:3000/api/webhook-inbound';
  } else {
    return res.status(400).json({ error: 'Unknown recipient domain' });
  }
  
  console.log(`Proxying webhook to: ${targetUrl}`);
  
  try {
    // Forward the request
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Failed to proxy webhook' });
  }
}