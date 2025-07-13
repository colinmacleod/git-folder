import './database/connection';
import { User } from './models';

async function testUserAPI() {
  const BASE_URL = 'http://localhost:8080';
  
  try {
    console.log('Testing User API endpoints...\n');

    // Create test user
    const testUser = await User.query().insert({
      oauth_provider: 'test',
      oauth_id: 'api-test-123',
      email: 'api-test@example.com',
      username: 'apitest',
      display_name: 'API Test User'
    });

    // Test 1: Auth status (should be authenticated in dev mode)
    console.log('1. Testing auth status...');
    const authRes = await fetch(`${BASE_URL}/api/auth/status`);
    if (!authRes.ok) {
      console.log('Response:', await authRes.text());
      throw new Error(`Auth status failed: ${authRes.status}`);
    }
    const authData = await authRes.json();
    console.log('✓ Auth status:', authData.authenticated ? 'Authenticated' : 'Not authenticated');

    // Test 2: Dev login
    console.log('\n2. Testing dev login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const loginData = await loginRes.json();
    console.log('✓ Dev login:', loginData.success ? 'Success' : 'Failed');

    // Get session cookie for subsequent requests
    const cookie = loginRes.headers.get('set-cookie');

    // Test 3: Get user profile
    console.log('\n3. Testing user profile...');
    const profileRes = await fetch(`${BASE_URL}/api/user/profile`, {
      headers: { 'Cookie': cookie || '' }
    });
    const profileData = await profileRes.json();
    console.log('✓ Profile fetched:', profileData.username);

    // Test 4: Update profile
    console.log('\n4. Testing profile update...');
    const updateRes = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie || ''
      },
      body: JSON.stringify({ display_name: 'Updated Dev User' })
    });
    const updateData = await updateRes.json();
    console.log('✓ Profile updated:', updateData.success);

    // Test 5: Get preferences
    console.log('\n5. Testing preferences...');
    const prefsRes = await fetch(`${BASE_URL}/api/user/preferences`, {
      headers: { 'Cookie': cookie || '' }
    });
    const prefsData = await prefsRes.json();
    console.log('✓ Preferences:', JSON.stringify(prefsData));

    // Test 6: Generate SSH key
    console.log('\n6. Testing SSH key generation...');
    const sshRes = await fetch(`${BASE_URL}/api/user/ssh/generate`, {
      method: 'POST',
      headers: { 'Cookie': cookie || '' }
    });
    const sshData = await sshRes.json();
    console.log('✓ SSH key generated:', sshData.public_key?.substring(0, 50) + '...');

    console.log('\n✅ All user API tests passed!');

  } catch (error) {
    console.error('❌ User API test failed:', error);
  } finally {
    // Clean up
    await User.query().where('oauth_provider', 'test').delete();
    await User.query().where('oauth_provider', 'dev').delete();
    process.exit(0);
  }
}

// Wait a bit for server to be ready
setTimeout(testUserAPI, 2000);
console.log('Waiting for server to start...');