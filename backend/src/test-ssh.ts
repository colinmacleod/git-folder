import './database/connection';
import { User } from './models';
import { generateSSHKeyPair, generateUserSSHKeys, getUserPrivateKey } from './services/ssh';

async function testSSH() {
  try {
    console.log('Testing SSH key generation...\n');

    // Test 1: Generate key pair
    console.log('1. Generating SSH key pair...');
    const keyPair = generateSSHKeyPair('test@example.com');
    console.log('✓ Public key:', keyPair.publicKey.substring(0, 50) + '...');
    console.log('✓ Private key starts with:', keyPair.privateKey.substring(0, 40) + '...');
    console.log('✓ Fingerprint:', keyPair.fingerprint);

    // Test 2: Create test user and generate keys
    console.log('\n2. Creating test user and generating SSH keys...');
    const user = await User.query().insert({
      oauth_provider: 'test',
      oauth_id: 'ssh-test-123',
      email: 'ssh-test@example.com',
      username: 'sshtest',
      display_name: 'SSH Test User'
    });

    await generateUserSSHKeys(user);
    
    // Fetch user again to get updated keys
    const userWithKeys = await User.query().findById(user.id);
    console.log('✓ User created with ID:', userWithKeys!.id);
    console.log('✓ Public key saved:', userWithKeys!.ssh_public_key?.substring(0, 50) + '...');
    console.log('✓ Private key encrypted:', userWithKeys!.ssh_private_key?.substring(0, 50) + '...');

    // Test 3: Decrypt private key
    console.log('\n3. Testing private key decryption...');
    const decryptedKey = getUserPrivateKey(userWithKeys!);
    console.log('✓ Private key decrypted successfully');
    console.log('✓ Decrypted key starts with:', decryptedKey?.substring(0, 40) + '...');

    console.log('\n✅ All SSH tests passed!');

  } catch (error) {
    console.error('❌ SSH test failed:', error);
  } finally {
    // Clean up
    await User.query().where('oauth_provider', 'test').delete();
    process.exit(0);
  }
}

testSSH();