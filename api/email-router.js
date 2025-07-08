// Email router - forwards emails to correct deployment using Vercel API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Determine target URL based on environment or email content
    let targetUrl;
    
    // Check if email subject contains [dev] or [preview] to route to dev
    const subject = req.body.subject || '';
    const isDev = subject.toLowerCase().includes('[dev]') || subject.toLowerCase().includes('[preview]');
    
    if (isDev) {
      // Get latest dev deployment from Vercel API
      try {
        const vercelResponse = await fetch(`https://api.vercel.com/v6/deployments?projectId=${process.env.VERCEL_PROJECT_ID}&gitBranch=dev&limit=1`, {
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
          }
        });
        const deployments = await vercelResponse.json();
        
        if (deployments.deployments && deployments.deployments[0]) {
          targetUrl = `https://${deployments.deployments[0].url}/api/webhook-inbound`;
        } else {
          // Fallback to production if no dev deployment found
          targetUrl = 'https://track-sigma-nine.vercel.app/api/webhook-inbound';
        }
      } catch (apiError) {
        console.error('Vercel API error:', apiError);
        // Fallback to production
        targetUrl = 'https://track-sigma-nine.vercel.app/api/webhook-inbound';
      }
    } else {
      // Route to production
      targetUrl = 'https://track-sigma-nine.vercel.app/api/webhook-inbound';
    }
    
    // Forward the webhook to the target deployment
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-From': 'email-router'
      },
      body: JSON.stringify(req.body)
    });
    
    const result = await response.json();
    res.status(response.status).json(result);
    
  } catch (error) {
    console.error('Email router error:', error);
    res.status(500).json({ error: error.message });
  }
}
