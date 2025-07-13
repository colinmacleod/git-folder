import { describe, it, expect, beforeEach } from 'vitest';
import { generateSSHKeyPair, encrypt, decrypt, generateUserSSHKeys, getUserPrivateKey } from './ssh';
import { User } from '../models';

describe('SSH Service', () => {
  describe('generateSSHKeyPair', () => {
    it('should generate a valid SSH key pair', () => {
      const keyPair = generateSSHKeyPair('test@example.com');
      
      expect(keyPair.publicKey).toBeTruthy();
      expect(keyPair.privateKey).toBeTruthy();
      expect(keyPair.fingerprint).toBeTruthy();
      
      expect(keyPair.publicKey).toContain('ssh-rsa');
      expect(keyPair.publicKey).toContain('test@example.com');
      expect(keyPair.privateKey).toContain('BEGIN RSA PRIVATE KEY');
      expect(keyPair.fingerprint).toMatch(/^([0-9a-f]{2}:){15}[0-9a-f]{2}$/);
    });

    it('should generate unique keys each time', () => {
      const keyPair1 = generateSSHKeyPair();
      const keyPair2 = generateSSHKeyPair();
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
      expect(keyPair1.fingerprint).not.toBe(keyPair2.fingerprint);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'This is a secret SSH private key';
      const encryptionKey = 'test-encryption-key-123';
      
      const encrypted = encrypt(originalText, encryptionKey);
      expect(encrypted).not.toBe(originalText);
      expect(encrypted).toContain('encrypted');
      expect(encrypted).toContain('salt');
      expect(encrypted).toContain('iv');
      expect(encrypted).toContain('authTag');
      
      const decrypted = decrypt(encrypted, encryptionKey);
      expect(decrypted).toBe(originalText);
    });

    it('should fail to decrypt with wrong key', () => {
      const originalText = 'Secret data';
      const correctKey = 'correct-key';
      const wrongKey = 'wrong-key';
      
      const encrypted = encrypt(originalText, correctKey);
      
      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should generate different encrypted output for same input', () => {
      const text = 'Same text';
      const key = 'same-key';
      
      const encrypted1 = encrypt(text, key);
      const encrypted2 = encrypt(text, key);
      
      expect(encrypted1).not.toBe(encrypted2); // Different due to random salt/iv
      expect(decrypt(encrypted1, key)).toBe(text);
      expect(decrypt(encrypted2, key)).toBe(text);
    });
  });

  describe('generateUserSSHKeys', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.query().insert({
        oauth_provider: 'test',
        oauth_id: 'test-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User'
      });
    });

    it('should generate and save encrypted SSH keys for user', async () => {
      expect(testUser.ssh_public_key).toBeNull();
      expect(testUser.ssh_private_key).toBeNull();
      
      await generateUserSSHKeys(testUser);
      
      // Reload user to get updated keys
      const updatedUser = await User.query().findById(testUser.id);
      
      expect(updatedUser!.ssh_public_key).toBeTruthy();
      expect(updatedUser!.ssh_private_key).toBeTruthy();
      expect(updatedUser!.ssh_public_key).toContain('ssh-rsa');
      expect(updatedUser!.ssh_public_key).toContain(`git-folder-${testUser.username}@${testUser.oauth_provider}`);
      
      // Private key should be encrypted
      expect(updatedUser!.ssh_private_key).not.toContain('BEGIN RSA PRIVATE KEY');
      expect(updatedUser!.ssh_private_key).toContain('encrypted');
    });
  });

  describe('getUserPrivateKey', () => {
    it('should decrypt user private key correctly', async () => {
      const user = await User.query().insert({
        oauth_provider: 'test',
        oauth_id: 'test-456',
        email: 'decrypt@example.com',
        username: 'decryptuser',
        display_name: 'Decrypt User'
      });
      
      await generateUserSSHKeys(user);
      
      const updatedUser = await User.query().findById(user.id);
      const decryptedKey = getUserPrivateKey(updatedUser!);
      
      expect(decryptedKey).toBeTruthy();
      expect(decryptedKey).toContain('BEGIN RSA PRIVATE KEY');
    });

    it('should return null for user without keys', async () => {
      const user = await User.query().insert({
        oauth_provider: 'test',
        oauth_id: 'test-789',
        email: 'nokeys@example.com',
        username: 'nokeysuser',
        display_name: 'No Keys User'
      });
      
      const decryptedKey = getUserPrivateKey(user);
      expect(decryptedKey).toBeNull();
    });
  });
});