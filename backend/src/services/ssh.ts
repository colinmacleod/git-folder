import forge from 'node-forge';
import crypto from 'crypto';
import { User } from '../models';
import { logger } from '../utils/logger';

export interface SSHKeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}

/**
 * Generate a new SSH key pair for a user
 */
export function generateSSHKeyPair(comment?: string): SSHKeyPair {
  // Generate RSA key pair
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  
  // Convert to OpenSSH format
  const publicKeyPem = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, comment);
  const privateKeyPem = forge.ssh.privateKeyToOpenSSH(keypair.privateKey);
  
  // Generate fingerprint
  const publicKeyDer = forge.pki.publicKeyToPem(keypair.publicKey);
  const fingerprint = crypto
    .createHash('md5')
    .update(publicKeyDer)
    .digest('hex')
    .match(/.{2}/g)!
    .join(':');

  return {
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
    fingerprint
  };
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(text: string, key: string): string {
  const algorithm = 'aes-256-gcm';
  const salt = crypto.randomBytes(32);
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  });
}

/**
 * Decrypt data encrypted with encrypt()
 */
export function decrypt(encryptedData: string, key: string): string {
  const { encrypted, salt, iv, authTag } = JSON.parse(encryptedData);
  const algorithm = 'aes-256-gcm';
  
  const derivedKey = crypto.pbkdf2Sync(
    key,
    Buffer.from(salt, 'hex'),
    100000,
    32,
    'sha256'
  );
  
  const decipher = crypto.createDecipheriv(
    algorithm,
    derivedKey,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate SSH keys for a user and save them encrypted
 */
export async function generateUserSSHKeys(user: User): Promise<void> {
  try {
    // Generate new key pair
    const keyPair = generateSSHKeyPair(`git-folder-${user.username}@${user.oauth_provider}`);
    
    // Encrypt private key using a combination of user ID and secret
    const encryptionKey = `${process.env.SECRET_KEY}-${user.id}-${user.oauth_id}`;
    const encryptedPrivateKey = encrypt(keyPair.privateKey, encryptionKey);
    
    // Update user with keys
    await user.$query().patch({
      ssh_public_key: keyPair.publicKey,
      ssh_private_key: encryptedPrivateKey
    });
    
    logger.info(`SSH keys generated for user ${user.username} (${user.id})`);
  } catch (error) {
    logger.error('Error generating SSH keys:', error);
    throw error;
  }
}

/**
 * Get decrypted private key for a user
 */
export function getUserPrivateKey(user: User): string | null {
  if (!user.ssh_private_key) {
    return null;
  }
  
  try {
    const encryptionKey = `${process.env.SECRET_KEY}-${user.id}-${user.oauth_id}`;
    return decrypt(user.ssh_private_key, encryptionKey);
  } catch (error) {
    logger.error('Error decrypting private key:', error);
    return null;
  }
}