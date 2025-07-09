#!/usr/bin/env node
import { verifySessionToken, generateSessionToken, generateCSRFToken, validateCSRFToken } from '../lib/auth.js';
import { sql } from '../lib/database.js';

console.log('🔐 Testing Authentication Implementation\n');

// Test 1: Check if user tables were created
console.log('1. Checking user tables...');
try {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'user_sessions')
    ORDER BY table_name
  `;
  console.log('✅ Found tables:', tables.rows.map(r => r.table_name).join(', '));
} catch (error) {
  console.error('❌ Error checking tables:', error.message);
}

// Test 2: Test JWT functions
console.log('\n2. Testing JWT functions...');
try {
  const mockUser = { id: 1, email: 'test@example.com', provider: 'google' };
  const { token, jti } = generateSessionToken(mockUser);
  console.log('✅ Generated token:', token.substring(0, 20) + '...');
  
  const verified = verifySessionToken(token);
  console.log('✅ Token verified:', { userId: verified.userId, email: verified.email });
} catch (error) {
  console.error('❌ JWT test failed:', error.message);
}

// Test 3: Test CSRF functions
console.log('\n3. Testing CSRF functions...');
try {
  const csrfToken = generateCSRFToken();
  console.log('✅ Generated CSRF token:', csrfToken.substring(0, 20) + '...');
  
  const isValid = validateCSRFToken(csrfToken, csrfToken);
  console.log('✅ CSRF validation:', isValid ? 'PASSED' : 'FAILED');
} catch (error) {
  console.error('❌ CSRF test failed:', error.message);
}

// Test 4: Check auth configuration
console.log('\n4. Checking auth configuration...');
try {
  const { AUTH_CONFIG } = await import('../lib/config.js');
  console.log('✅ Auth config loaded:');
  console.log('   - Google client ID:', AUTH_CONFIG.google.clientId ? 'SET' : 'NOT SET');
  console.log('   - Microsoft client ID:', AUTH_CONFIG.microsoft.clientId ? 'SET' : 'NOT SET');
  console.log('   - JWT secret:', AUTH_CONFIG.jwt.secret ? 'SET' : 'NOT SET');
} catch (error) {
  console.error('❌ Config check failed:', error.message);
}

console.log('\n✨ Auth implementation test complete!\n');
process.exit(0);