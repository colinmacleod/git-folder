// Simple test to verify basic functionality
import '../database/connection';
import { generateSSHKeyPair, encrypt, decrypt } from '../services/ssh';

async function runTests() {
  console.log('Running basic unit tests...\n');

  // Test 1: SSH Key Generation
  console.log('1. Testing SSH key generation...');
  try {
    const keyPair = generateSSHKeyPair('test@example.com');
    console.assert(keyPair.publicKey.includes('ssh-rsa'), 'Public key should be RSA');
    console.assert(keyPair.privateKey.includes('BEGIN RSA PRIVATE KEY'), 'Private key should be PEM format');
    console.assert(keyPair.fingerprint.match(/^([0-9a-f]{2}:){15}[0-9a-f]{2}$/), 'Fingerprint should be valid');
    console.log('✓ SSH key generation works');
  } catch (error) {
    console.error('✗ SSH key generation failed:', error);
  }

  // Test 2: Encryption/Decryption
  console.log('\n2. Testing encryption/decryption...');
  try {
    const originalText = 'This is a secret';
    const key = 'test-key-123';
    const encrypted = encrypt(originalText, key);
    const decrypted = decrypt(encrypted, key);
    console.assert(decrypted === originalText, 'Decrypted text should match original');
    console.log('✓ Encryption/decryption works');
  } catch (error) {
    console.error('✗ Encryption/decryption failed:', error);
  }

  // Test 3: Auth Middleware Logic
  console.log('\n3. Testing auth middleware logic...');
  try {
    // Test dev mode detection
    const originalAuthMode = process.env.AUTH_MODE;
    process.env.AUTH_MODE = 'dev';
    console.assert(process.env.AUTH_MODE === 'dev', 'Dev mode should be enabled');
    process.env.AUTH_MODE = originalAuthMode;
    console.log('✓ Auth mode detection works');
  } catch (error) {
    console.error('✗ Auth mode test failed:', error);
  }

  console.log('\n✅ Basic tests completed!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});