import sgMail from '@sendgrid/mail';
import { getDatabaseInfo } from './database.js';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email configuration based on environment
export function getEmailConfig() {
  const dbInfo = getDatabaseInfo();
  const isProduction = dbInfo.isProduction;
  const environment = dbInfo.environment;
  
  return {
    isProduction,
    environment,
    shouldSend: isProduction || process.env.FORCE_SEND_EMAILS === 'true',
    senderEmail: process.env.SENDER_EMAIL || 'notifications@track.app',
    senderName: isProduction ? 'Track Decisions' : `Track Decisions (${environment})`,
    subjectPrefix: isProduction ? '' : `[${environment.toUpperCase()}] `,
    testRecipient: process.env.TEST_EMAIL_RECIPIENT
  };
}

// Send email with environment handling
export async function sendEmail({ to, subject, html, text }) {
  const config = getEmailConfig();
  
  // Build email configuration
  const msg = {
    to: config.isProduction ? to : (config.testRecipient || to),
    from: {
      email: config.senderEmail,
      name: config.senderName
    },
    subject: `${config.subjectPrefix}${subject}`,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    headers: {
      'X-Environment': config.environment,
      'X-Track-Env': config.isProduction ? 'production' : 'development'
    }
  };
  
  // Add environment notice for non-production
  if (!config.isProduction) {
    msg.html = `
      <div style="background: #fff3cd; border: 1px solid #ffeebb; padding: 10px; margin-bottom: 20px;">
        <strong>⚠️ Non-Production Email (${config.environment})</strong><br>
        Original recipient: ${to}
      </div>
      ${html}
    `;
  }
  
  // Log email details in non-production
  if (!config.isProduction) {
    console.log('📧 Email Preview:', {
      environment: config.environment,
      to: msg.to,
      originalTo: to,
      subject: msg.subject,
      wouldSend: config.shouldSend
    });
  }
  
  // Only send if in production or explicitly forced
  if (!config.shouldSend) {
    return {
      success: true,
      skipped: true,
      reason: 'Non-production environment',
      preview: msg
    };
  }
  
  try {
    const response = await sgMail.send(msg);
    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode
    };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

// Helper to send decision confirmation email
export async function sendDecisionConfirmation(decision, confirmationUrl) {
  const html = `
    <h2>New Decision Recorded</h2>
    <p><strong>Summary:</strong> ${decision.summary}</p>
    <p><strong>Decision Maker:</strong> ${decision.decision_maker}</p>
    <p><strong>Date:</strong> ${new Date(decision.decision_date).toLocaleDateString()}</p>
    
    <p>Please confirm this decision by clicking the link below:</p>
    <p><a href="${confirmationUrl}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Decision</a></p>
    
    <p>If you did not make this decision, please ignore this email.</p>
  `;
  
  return sendEmail({
    to: decision.decision_maker,
    subject: 'Please confirm your decision',
    html
  });
}