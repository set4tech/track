export default async function handler(req, res) {
  try {
    const envCheck = {
      hasPostgres: !!process.env.POSTGRES_URL,
      hasSendGrid: !!process.env.SENDGRID_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSender: !!process.env.SENDER_EMAIL,
      nodeVersion: process.version,
      method: req.method
    };
    
    res.status(200).json({
      message: 'Debug endpoint working',
      environment: envCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
