import path from 'path';
import fs from 'fs/promises';
import { gitCommand, GitError } from './GitCommand';
import { Repository, User } from '../../models';
import { logger } from '../../utils/logger';
import { getUserPrivateKey } from '../ssh';
import crypto from 'crypto';

export class RepositoryService {
  private reposBasePath: string;

  constructor() {
    this.reposBasePath = process.env.REPOS_BASE_PATH || path.join(process.cwd(), 'repos');
  }

  /**
   * Initialize repository storage
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.reposBasePath, { recursive: true });
    logger.info(`Repository storage initialized at ${this.reposBasePath}`);
  }

  /**
   * Create or clone a repository for a user
   */
  async createRepository(
    user: User,
    name: string,
    gitUrl?: string,
    description?: string
  ): Promise<Repository> {
    // Validate repository name
    if (!this.isValidRepositoryName(name)) {
      throw new Error('Invalid repository name. Use only letters, numbers, hyphens, and underscores.');
    }

    // Check if repository already exists
    const existing = await Repository.query()
      .where('owner_id', user.id)
      .where('name', name)
      .first();

    if (existing) {
      throw new Error('Repository with this name already exists');
    }

    // Create repository path
    const repoPath = this.getRepositoryPath(user.id, name);
    
    // Initialize or clone repository
    if (gitUrl) {
      // Clone from remote
      await this.cloneRepository(gitUrl, repoPath, user);
    } else {
      // Initialize new repository
      await gitCommand.init(repoPath);
      
      // Initialize Git LFS if available
      if (await gitCommand.isLfsInstalled()) {
        await gitCommand.lfsInstall({ cwd: repoPath });
        
        // Set up default LFS tracking for common large files
        await this.setupDefaultLfsTracking(repoPath);
      }

      // Create initial commit
      await this.createInitialCommit(repoPath, user);
    }

    // Save to database
    const repository = await Repository.query().insert({
      name,
      description: description || `Repository ${name}`,
      git_url: gitUrl || '',
      local_path: repoPath,
      owner_id: user.id,
      is_active: true
    });

    logger.info(`Repository created: ${name} for user ${user.username}`);
    return repository;
  }

  /**
   * Clone a repository with authentication
   */
  private async cloneRepository(gitUrl: string, destination: string, user: User): Promise<void> {
    // Set up SSH authentication if user has keys
    const env = { ...process.env };
    
    if (user.ssh_private_key) {
      const sshKeyPath = await this.setupSshKey(user);
      env.GIT_SSH_COMMAND = `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no`;
    }

    try {
      await gitCommand.clone(gitUrl, destination, { env });
    } finally {
      // Clean up temporary SSH key if created
      if (user.ssh_private_key) {
        await this.cleanupSshKey(user);
      }
    }
  }

  /**
   * Set up temporary SSH key for Git operations
   */
  private async setupSshKey(user: User): Promise<string> {
    const privateKey = getUserPrivateKey(user);
    if (!privateKey) {
      throw new Error('Failed to decrypt user SSH key');
    }

    const keyDir = path.join(this.reposBasePath, '.ssh', user.id.toString());
    const keyPath = path.join(keyDir, 'id_rsa');

    await fs.mkdir(keyDir, { recursive: true, mode: 0o700 });
    await fs.writeFile(keyPath, privateKey, { mode: 0o600 });

    return keyPath;
  }

  /**
   * Clean up temporary SSH key
   */
  private async cleanupSshKey(user: User): Promise<void> {
    const keyDir = path.join(this.reposBasePath, '.ssh', user.id.toString());
    try {
      await fs.rm(keyDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to cleanup SSH key:', error);
    }
  }

  /**
   * Set up default LFS tracking patterns
   */
  private async setupDefaultLfsTracking(repoPath: string): Promise<void> {
    const patterns = [
      '*.psd', '*.psb',           // Photoshop
      '*.ai', '*.eps',            // Illustrator
      '*.sketch',                 // Sketch
      '*.fig',                    // Figma
      '*.xd',                     // Adobe XD
      '*.blend', '*.blend1',      // Blender
      '*.fbx', '*.obj', '*.dae',  // 3D models
      '*.3ds', '*.max',           // 3DS Max
      '*.mb', '*.ma',             // Maya
      '*.c4d',                    // Cinema 4D
      '*.zip', '*.rar', '*.7z',   // Archives
      '*.mov', '*.mp4', '*.avi',  // Videos
      '*.wav', '*.mp3', '*.flac', // Audio
      '*.pdf',                    // PDFs
      '*.exe', '*.dll', '*.so'    // Binaries
    ];

    for (const pattern of patterns) {
      try {
        await gitCommand.lfsTrack(pattern, { cwd: repoPath });
      } catch (error) {
        logger.warn(`Failed to track ${pattern} with LFS:`, error);
      }
    }

    // Add .gitattributes to git
    await gitCommand.add('.gitattributes', { cwd: repoPath });
  }

  /**
   * Create initial commit
   */
  private async createInitialCommit(repoPath: string, user: User): Promise<void> {
    // Create README
    const readmeContent = `# Repository

This repository was created with git-folder.

Created by: ${user.display_name || user.username}
Date: ${new Date().toISOString()}
`;

    await fs.writeFile(path.join(repoPath, 'README.md'), readmeContent);
    await gitCommand.add('README.md', { cwd: repoPath });

    // Commit
    await gitCommand.commit('Initial commit', {
      cwd: repoPath,
      author: `${user.display_name || user.username} <${user.email}>`
    });
  }

  /**
   * Get repository by ID with authorization check
   */
  async getRepository(repositoryId: number, userId: number): Promise<Repository | null> {
    const repository = await Repository.query()
      .findById(repositoryId)
      .where('owner_id', userId);

    return repository || null;
  }

  /**
   * List user's repositories
   */
  async listUserRepositories(userId: number): Promise<Repository[]> {
    return Repository.query()
      .where('owner_id', userId)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  /**
   * Delete repository
   */
  async deleteRepository(repositoryId: number, userId: number): Promise<void> {
    const repository = await this.getRepository(repositoryId, userId);
    
    if (!repository) {
      throw new Error('Repository not found');
    }

    // Mark as inactive in database
    await repository.$query().patch({ is_active: false });

    // Delete from filesystem
    try {
      await fs.rm(repository.local_path!, { recursive: true, force: true });
      logger.info(`Deleted repository files: ${repository.local_path}`);
    } catch (error) {
      logger.error('Failed to delete repository files:', error);
    }
  }

  /**
   * Check if repository name is valid
   */
  private isValidRepositoryName(name: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length <= 100;
  }

  /**
   * Get repository filesystem path
   */
  private getRepositoryPath(userId: number, repoName: string): string {
    return path.join(this.reposBasePath, userId.toString(), repoName);
  }

  /**
   * Initialize Git LFS for a repository
   */
  async initializeLfs(repositoryId: number, userId: number): Promise<void> {
    const repository = await this.getRepository(repositoryId, userId);
    
    if (!repository || !repository.local_path) {
      throw new Error('Repository not found');
    }

    if (!await gitCommand.isLfsInstalled()) {
      throw new Error('Git LFS is not installed on the server');
    }

    await gitCommand.lfsInstall({ cwd: repository.local_path });
    await this.setupDefaultLfsTracking(repository.local_path);
    
    // Commit .gitattributes if it exists
    try {
      await gitCommand.commit('Initialize Git LFS tracking', {
        cwd: repository.local_path,
        author: `git-folder <noreply@git-folder.local>`
      });
    } catch (error) {
      // Ignore if nothing to commit
      if (!error.message.includes('nothing to commit')) {
        throw error;
      }
    }

    logger.info(`Initialized Git LFS for repository ${repository.name}`);
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(repositoryId: number, userId: number): Promise<any> {
    const repository = await this.getRepository(repositoryId, userId);
    
    if (!repository || !repository.local_path) {
      throw new Error('Repository not found');
    }

    const currentBranch = await gitCommand.getCurrentBranch({ cwd: repository.local_path });
    const branches = await gitCommand.listBranches({ cwd: repository.local_path });
    const isLfsEnabled = await gitCommand.isLfsInstalled() && 
                        (await gitCommand.lfsTrackedPatterns({ cwd: repository.local_path })).length > 0;

    return {
      id: repository.id,
      name: repository.name,
      description: repository.description,
      git_url: repository.git_url,
      current_branch: currentBranch,
      branches,
      lfs_enabled: isLfsEnabled,
      created_at: repository.created_at,
      updated_at: repository.updated_at
    };
  }
}

// Export singleton instance
export const repositoryService = new RepositoryService();