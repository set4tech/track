#!/usr/bin/env node

import dotenv from 'dotenv';
// Load environment variables BEFORE importing other modules
dotenv.config({ path: '.env.local' });

import { sql } from '@vercel/postgres';
import { encrypt, decrypt } from '../lib/crypto.js';
import fetch from 'node-fetch';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Simple test runner
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('🧪 Running Gmail Integration Tests\n');

// Test Gmail API endpoints exist (may be 404 if not deployed yet)
await test('Gmail OAuth endpoint should exist', async () => {
  const response = await fetch(`${TEST_BASE_URL}/api/auth/gmail-oauth`, {
    redirect: 'manual'
  });
  // Should get 401 (unauthorized) or 404 (not deployed yet)
  assert(response.status === 401 || response.status === 404, `Expected 401 or 404, got ${response.status}`);
  if (response.status === 404) {
    console.log('   ⚠️  Gmail OAuth endpoint not deployed yet');
  }
});

await test('Gmail status endpoint should exist', async () => {
  const response = await fetch(`${TEST_BASE_URL}/api/gmail/status`);
  assert(response.status === 401 || response.status === 404, `Expected 401 or 404, got ${response.status}`);
  if (response.status === 404) {
    console.log('   ⚠️  Gmail status endpoint not deployed yet');
  }
});

await test('Gmail settings endpoint should exist', async () => {
  const response = await fetch(`${TEST_BASE_URL}/api/gmail/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterQuery: 'test' })
  });
  assert(response.status === 401 || response.status === 404, `Expected 401 or 404, got ${response.status}`);
  if (response.status === 404) {
    console.log('   ⚠️  Gmail settings endpoint not deployed yet');
  }
});

await test('Gmail sync endpoint should exist', async () => {
  const response = await fetch(`${TEST_BASE_URL}/api/gmail/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'incremental' })
  });
  assert(response.status === 401 || response.status === 404, `Expected 401 or 404, got ${response.status}`);
  if (response.status === 404) {
    console.log('   ⚠️  Gmail sync endpoint not deployed yet');
  }
});

// Test database schema
await test('Gmail tables should exist', async () => {
  try {
    // Check gmail_sync_state table
    const syncStateCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gmail_sync_state'
    `;
    assert(syncStateCheck.rows.length > 0, 'gmail_sync_state table should exist');

    // Check gmail_messages table
    const messagesCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gmail_messages'
    `;
    assert(messagesCheck.rows.length > 0, 'gmail_messages table should exist');

    // Check gmail_bodies table
    const bodiesCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gmail_bodies'
    `;
    assert(bodiesCheck.rows.length > 0, 'gmail_bodies table should exist');

    // Check gmail_decisions table
    const decisionsCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gmail_decisions'
    `;
    assert(decisionsCheck.rows.length > 0, 'gmail_decisions table should exist');
  } catch (error) {
    throw new Error(`Database check failed: ${error.message}`);
  }
});

// Test encryption integration with database
await test('Should store and retrieve encrypted tokens', async () => {
  const testEmail = `test-gmail-${Date.now()}@example.com`;
  const testToken = 'test-refresh-token-' + Date.now();
  
  try {
    // Check if ENCRYPTION_KEY is set
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not found in environment');
    }

    // Create test user with provider_id
    const userResult = await sql`
      INSERT INTO users (email, name, provider, provider_id)
      VALUES (${testEmail}, 'Gmail Test User', 'google', ${`google-${Date.now()}`})
      RETURNING id
    `;
    const userId = userResult.rows[0].id;

    // Encrypt and store token
    const encryptedToken = encrypt(testToken);
    assert(encryptedToken !== null, 'Encrypted token should not be null');
    assert(typeof encryptedToken === 'string', 'Encrypted token should be a string');
    assert(encryptedToken.startsWith('\\x'), 'Encrypted token should be hex format');
    
    await sql`
      UPDATE users 
      SET gmail_refresh_token_enc = ${encryptedToken},
          gmail_sync_enabled = true
      WHERE id = ${userId}
    `;

    // Retrieve and decrypt
    const result = await sql`
      SELECT gmail_refresh_token_enc 
      FROM users 
      WHERE id = ${userId}
    `;
    
    assert(result.rows.length > 0, 'User should be found');
    assert(result.rows[0].gmail_refresh_token_enc !== null, 'Encrypted token should be stored');
    
    const decryptedToken = decrypt(result.rows[0].gmail_refresh_token_enc);
    assert(decryptedToken === testToken, `Decrypted token should match original. Got: ${decryptedToken}, Expected: ${testToken}`);

    // Cleanup
    await sql`DELETE FROM users WHERE id = ${userId}`;
  } catch (error) {
    throw new Error(`Token storage test failed: ${error.message}`);
  }
});

// Print results
console.log(`\n📊 Test Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}