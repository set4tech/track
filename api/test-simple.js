export default async function handler(req, res) {
  try {
    res.status(200).json({ 
      message: 'Simple test endpoint working!',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({ error: error.message });
  }
}
