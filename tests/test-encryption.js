#!/usr/bin/env node

import { encrypt, decrypt } from '../lib/crypto.js';

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
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

console.log('🧪 Running Encryption Tests\n');

// Test basic encryption/decryption
test('should encrypt and decrypt text successfully', () => {
  const originalText = 'This is a secret refresh token';
  
  const encrypted = encrypt(originalText);
  assert(encrypted !== null, 'Encrypted value should not be null');
  assert(encrypted !== originalText, 'Encrypted value should not equal original');
  assert(typeof encrypted === 'string', 'Encrypted value should be a string');
  assert(encrypted.startsWith('\\x'), 'Encrypted value should start with \\x');
  
  const decrypted = decrypt(encrypted);
  assert(decrypted === originalText, 'Decrypted value should match original');
});

// Test null handling
test('should handle null/empty values', () => {
  assert(encrypt(null) === null, 'encrypt(null) should return null');
  assert(encrypt('') === null, 'encrypt("") should return null');
  assert(decrypt(null) === null, 'decrypt(null) should return null');
});

// Test different ciphertext for same plaintext
test('should produce different ciphertext for same plaintext', () => {
  const text = 'Same text encrypted twice';
  
  const encrypted1 = encrypt(text);
  const encrypted2 = encrypt(text);
  
  assert(encrypted1 !== encrypted2, 'Two encryptions should produce different results');
  assert(decrypt(encrypted1) === text, 'First encryption should decrypt correctly');
  assert(decrypt(encrypted2) === text, 'Second encryption should decrypt correctly');
});

// Test large text
test('should handle large text', () => {
  const largeText = 'x'.repeat(10000);
  
  const encrypted = encrypt(largeText);
  const decrypted = decrypt(encrypted);
  
  assert(decrypted === largeText, 'Large text should encrypt/decrypt correctly');
});

// Test invalid data
test('should fail with invalid encrypted data', () => {
  const invalidData = '\\xinvalidhexdata';
  let errorThrown = false;
  
  try {
    decrypt(invalidData);
  } catch (error) {
    errorThrown = true;
  }
  
  assert(errorThrown, 'Should throw error for invalid encrypted data');
});

// Test hex string format
test('should handle hex string format', () => {
  const text = 'Test with hex format';
  const encrypted = encrypt(text);
  
  // Ensure it's hex formatted
  assert(encrypted.startsWith('\\x'), 'Should start with \\x');
  
  // Can decrypt the hex string
  const decrypted = decrypt(encrypted);
  assert(decrypted === text, 'Should decrypt hex string correctly');
});

// Print results
console.log(`\n📊 Test Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}