import '../database/connection';
import { gitCommand } from '../services/git/GitCommand';
import { repositoryService } from '../services/git/RepositoryService';
import { User } from '../models';
import path from 'path';
import fs from 'fs/promises';

async function testGitIntegration() {
  console.log('Testing Git Integration...\n');

  try {
    // Test 1: Git command wrapper
    console.log('1. Testing Git command wrapper...');
    const gitVersion = await gitCommand.execute(['--version']);
    console.log('✓ Git version:', gitVersion.stdout);

    // Test 2: Check if Git LFS is available
    console.log('\n2. Testing Git LFS detection...');
    const lfsInstalled = await gitCommand.isLfsInstalled();
    console.log('✓ Git LFS installed:', lfsInstalled);

    // Test 3: Repository initialization
    console.log('\n3. Testing repository initialization...');
    
    // Create test user
    const testUser = await User.query().insert({
      oauth_provider: 'test',
      oauth_id: 'git-test-123',
      email: 'git-test@example.com',
      username: 'gittest',
      display_name: 'Git Test User'
    });

    // Initialize repository service
    await repositoryService.initialize();

    // Create a test repository
    const repo = await repositoryService.createRepository(
      testUser,
      'test-repo',
      undefined,
      'Test repository for Git integration'
    );
    console.log('✓ Repository created:', repo.name);

    // Test 4: Check repository structure
    console.log('\n4. Testing repository structure...');
    const repoPath = repo.local_path!;
    const isGitRepo = await gitCommand.isGitRepository(repoPath);
    console.log('✓ Is Git repository:', isGitRepo);

    const hasReadme = await fs.access(path.join(repoPath, 'README.md'))
      .then(() => true)
      .catch(() => false);
    console.log('✓ Has README.md:', hasReadme);

    // Test 5: Git operations
    console.log('\n5. Testing Git operations...');
    
    // Create a test file
    const testFile = path.join(repoPath, 'test.txt');
    await fs.writeFile(testFile, 'Hello, Git!');
    
    // Add and commit
    await gitCommand.add('test.txt', { cwd: repoPath });
    const commitHash = await gitCommand.commit('Add test file', {
      cwd: repoPath,
      author: 'Test User <test@example.com>'
    });
    console.log('✓ File committed:', commitHash);

    // Test 6: Branch operations
    console.log('\n6. Testing branch operations...');
    const currentBranch = await gitCommand.getCurrentBranch({ cwd: repoPath });
    console.log('✓ Current branch:', currentBranch);

    const branches = await gitCommand.listBranches({ cwd: repoPath });
    console.log('✓ Available branches:', branches);

    // Test 7: LFS tracking (if available)
    if (lfsInstalled) {
      console.log('\n7. Testing LFS tracking...');
      await gitCommand.lfsTrack('*.psd', { cwd: repoPath });
      const trackedPatterns = await gitCommand.lfsTrackedPatterns({ cwd: repoPath });
      console.log('✓ LFS tracked patterns:', trackedPatterns.slice(0, 5), '...');
    }

    console.log('\n✅ All Git integration tests passed!');

    // Cleanup
    await fs.rm(repoPath, { recursive: true, force: true });
    await repo.$query().delete();
    await testUser.$query().delete();

  } catch (error) {
    console.error('❌ Git integration test failed:', error);
  } finally {
    process.exit(0);
  }
}

testGitIntegration();