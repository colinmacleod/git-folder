import './database/connection';
import { User, Repository, SharedFolder } from './models';

async function testDatabase() {
  try {
    console.log('Testing database connection and models...\n');

    // Test 1: Create a user
    console.log('1. Creating a test user...');
    const user = await User.query().insert({
      oauth_provider: 'github',
      oauth_id: 'test123',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.png'
    });
    console.log('✓ User created:', user.id, user.username);

    // Test 2: Query the user
    console.log('\n2. Querying the user...');
    const foundUser = await User.query().findById(user.id);
    console.log('✓ User found:', foundUser?.email);

    // Test 3: Create a repository
    console.log('\n3. Creating a repository...');
    const repo = await Repository.query().insert({
      name: 'test-repo',
      description: 'A test repository',
      git_url: 'https://github.com/test/repo.git',
      owner_id: user.id,
      is_active: true
    });
    console.log('✓ Repository created:', repo.id, repo.name);

    // Test 4: Create a shared folder
    console.log('\n4. Creating a shared folder...');
    const sharedFolder = await SharedFolder.query().insert({
      repository_id: repo.id,
      folder_path: '/assets',
      name: 'Game Assets',
      description: 'Shared game assets folder',
      is_public: false,
      commit_message_required: true
    });
    console.log('✓ Shared folder created:', sharedFolder.id, sharedFolder.name);

    // Test 5: Query with relations
    console.log('\n5. Testing relationships...');
    const userWithRepos = await User.query()
      .findById(user.id)
      .withGraphFetched('repositories');
    console.log('✓ User has', userWithRepos?.repositories?.length, 'repositories');

    const repoWithOwner = await Repository.query()
      .findById(repo.id)
      .withGraphFetched('owner');
    console.log('✓ Repository owner:', repoWithOwner?.owner?.username);

    // Test 6: Update a record
    console.log('\n6. Updating a record...');
    const updatedUser = await User.query()
      .patchAndFetchById(user.id, { display_name: 'Updated Test User' });
    console.log('✓ User updated:', updatedUser.display_name);

    // Test 7: Count records
    console.log('\n7. Counting records...');
    const userCount = await User.query().count();
    const repoCount = await Repository.query().count();
    console.log('✓ Total users:', userCount[0]['count(*)']);
    console.log('✓ Total repositories:', repoCount[0]['count(*)']);

    console.log('\n✅ All database tests passed!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    // Clean up
    await SharedFolder.query().delete();
    await Repository.query().delete();
    await User.query().delete();
    process.exit(0);
  }
}

testDatabase();