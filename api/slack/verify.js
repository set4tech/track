import crypto from 'crypto';

export function verifySlackRequest(body, signature, timestamp) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  
  if (!signingSecret) {
    throw new Error('SLACK_SIGNING_SECRET not configured');
  }

  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > 300) { // 5 minutes
    return false;
  }

  // Create signature
  const baseString = `v0:${timestamp}:${body}`;
  const expectedSignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(baseString)
    .digest('hex');

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}
