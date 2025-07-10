export default async function handler(req, res) {
  try {
    const envVars = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      JWT_SECRET: !!process.env.JWT_SECRET,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL
    };
    
    // Try to import modules
    let authImportError = null;
    let dbImportError = null;
    
    try {
      await import('../lib/auth.js');
    } catch (e) {
      authImportError = e.message;
    }
    
    try {
      await import('../lib/database.js');
    } catch (e) {
      dbImportError = e.message;
    }
    
    res.status(200).json({
      status: 'ok',
      env: envVars,
      imports: {
        auth: authImportError || 'success',
        database: dbImportError || 'success'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}