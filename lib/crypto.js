import crypto from 'crypto';
import { config } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function deriveKey(masterKey, salt) {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
}

export function encrypt(text) {
  if (!text) return null;
  
  const masterKey = config.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  const finalBuffer = Buffer.concat([salt, iv, tag, encrypted]);
  
  // Return as hex string prefixed with \x for PostgreSQL bytea
  return '\\x' + finalBuffer.toString('hex');
}

export function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  const masterKey = config.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  let data;
  if (typeof encryptedData === 'string' && encryptedData.startsWith('\\x')) {
    // Handle PostgreSQL hex format
    data = Buffer.from(encryptedData.slice(2), 'hex');
  } else if (Buffer.isBuffer(encryptedData)) {
    // Check if it's a JSON-encoded buffer from @vercel/postgres
    const str = encryptedData.toString();
    if (str.startsWith('{"data":[') && str.includes('"type":"Buffer"}')) {
      // Parse the JSON and reconstruct the buffer
      const parsed = JSON.parse(str);
      data = Buffer.from(parsed.data);
    } else {
      data = encryptedData;
    }
  } else {
    data = Buffer.from(encryptedData);
  }
  
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = deriveKey(masterKey, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}