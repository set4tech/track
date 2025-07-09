import { sql } from '../lib/database.js';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Initialize SendGrid with error handling
try {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} catch (error) {
  console.error('SendGrid initialization error:', error);
}

export default async function handler(req, res) {
  try {
    console.log('Test webhook called:', {
      method: req.method,
      headers: req.headers,
      body: req.body
    });
    
    res.status(200).json({ 
      received: true, 
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
