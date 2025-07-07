export default async function handler(req, res) {
  // Allow both GET and POST for testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test basic function execution
    console.log('Function started');
    
    // Test environment variables
    const hasPostgres = !!process.env.POSTGRES_URL;
    const hasSendGrid = !!process.env.SENDGRID_API_KEY;
    
    console.log('Environment check:', { hasPostgres, hasSendGrid });
    
    res.status(200).json({ 
      message: 'Test endpoint working',
      env: { hasPostgres, hasSendGrid }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
}
