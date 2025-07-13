import { spawn, SpawnOptions } from 'child_process';
import { logger } from '../../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export interface GitCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  maxBuffer?: number;
}

export interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class GitCommand {
  private defaultOptions: GitCommandOptions = {
    timeout: 30000, // 30 seconds default
    maxBuffer: 10 * 1024 * 1024, // 10MB default
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } // Disable git prompts
  };

  /**
   * Execute a git command
   */
  async execute(args: string[], options: GitCommandOptions = {}): Promise<GitCommandResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      logger.debug(`Executing git command: git ${args.join(' ')}`, { cwd: opts.cwd });

      const child = spawn('git', args, {
        cwd: opts.cwd,
        env: opts.env,
        timeout: opts.timeout
      } as SpawnOptions);

      let stdout = '';
      let stderr = '';
      let stdoutSize = 0;
      let stderrSize = 0;

      child.stdout?.on('data', (data) => {
        stdoutSize += data.length;
        if (stdoutSize <= opts.maxBuffer!) {
          stdout += data.toString();
        }
      });

      child.stderr?.on('data', (data) => {
        stderrSize += data.length;
        if (stderrSize <= opts.maxBuffer!) {
          stderr += data.toString();
        }
      });

      child.on('error', (error) => {
        logger.error('Git command failed to spawn:', error);
        reject(new GitError(`Failed to execute git command: ${error.message}`, 'SPAWN_ERROR'));
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const exitCode = code || 0;
        
        logger.debug(`Git command completed in ${duration}ms`, { 
          exitCode, 
          stdoutSize, 
          stderrSize 
        });

        if (stdoutSize > opts.maxBuffer! || stderrSize > opts.maxBuffer!) {
          reject(new GitError('Git command output exceeded buffer limit', 'BUFFER_EXCEEDED'));
          return;
        }

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode
        });
      });
    });
  }

  /**
   * Check if a directory is a git repository
   */
  async isGitRepository(dir: string): Promise<boolean> {
    try {
      const result = await this.execute(['rev-parse', '--is-inside-work-tree'], { cwd: dir });
      return result.exitCode === 0 && result.stdout === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Get the root directory of a git repository
   */
  async getRepositoryRoot(dir: string): Promise<string | null> {
    try {
      const result = await this.execute(['rev-parse', '--show-toplevel'], { cwd: dir });
      return result.exitCode === 0 ? result.stdout : null;
    } catch {
      return null;
    }
  }

  /**
   * Initialize a new git repository
   */
  async init(dir: string, bare: boolean = false): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    
    const args = ['init'];
    if (bare) args.push('--bare');
    
    const result = await this.execute(args, { cwd: dir });
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to initialize repository: ${result.stderr}`, 'INIT_FAILED');
    }
    
    logger.info(`Initialized git repository at ${dir}`);
  }

  /**
   * Clone a repository
   */
  async clone(url: string, destination: string, options: CloneOptions = {}): Promise<void> {
    const args = ['clone'];
    
    if (options.depth) {
      args.push('--depth', options.depth.toString());
    }
    
    if (options.branch) {
      args.push('--branch', options.branch);
    }
    
    if (options.singleBranch) {
      args.push('--single-branch');
    }
    
    args.push(url, destination);
    
    const result = await this.execute(args, { 
      cwd: path.dirname(destination),
      timeout: options.timeout || 300000 // 5 minutes for clone
    });
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to clone repository: ${result.stderr}`, 'CLONE_FAILED');
    }
    
    logger.info(`Cloned repository from ${url} to ${destination}`);
  }

  /**
   * Add files to staging
   */
  async add(files: string | string[], options: GitCommandOptions = {}): Promise<void> {
    const fileList = Array.isArray(files) ? files : [files];
    const args = ['add', ...fileList];
    
    const result = await this.execute(args, options);
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to add files: ${result.stderr}`, 'ADD_FAILED');
    }
  }

  /**
   * Commit changes
   */
  async commit(message: string, options: CommitOptions = {}): Promise<string> {
    const args = ['commit', '-m', message];
    
    if (options.author) {
      args.push('--author', options.author);
    }
    
    if (options.allowEmpty) {
      args.push('--allow-empty');
    }
    
    const result = await this.execute(args, options);
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to commit: ${result.stderr}`, 'COMMIT_FAILED');
    }
    
    // Extract commit hash from output
    const hashMatch = result.stdout.match(/\[[\w\s-]+\s+([\w]{7,})\]/);
    return hashMatch ? hashMatch[1] : '';
  }

  /**
   * Push changes to remote
   */
  async push(remote: string = 'origin', branch?: string, options: PushOptions = {}): Promise<void> {
    const args = ['push'];
    
    if (options.force) {
      args.push('--force');
    }
    
    if (options.setUpstream) {
      args.push('--set-upstream');
    }
    
    args.push(remote);
    if (branch) args.push(branch);
    
    const result = await this.execute(args, options);
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to push: ${result.stderr}`, 'PUSH_FAILED');
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(remote: string = 'origin', branch?: string, options: GitCommandOptions = {}): Promise<void> {
    const args = ['pull', remote];
    if (branch) args.push(branch);
    
    const result = await this.execute(args, options);
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to pull: ${result.stderr}`, 'PULL_FAILED');
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(options: GitCommandOptions = {}): Promise<string | null> {
    const result = await this.execute(['rev-parse', '--abbrev-ref', 'HEAD'], options);
    return result.exitCode === 0 ? result.stdout : null;
  }

  /**
   * List all branches
   */
  async listBranches(options: GitCommandOptions = {}): Promise<string[]> {
    const result = await this.execute(['branch', '--format=%(refname:short)'], options);
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to list branches: ${result.stderr}`, 'LIST_BRANCHES_FAILED');
    }
    
    return result.stdout.split('\n').filter(Boolean);
  }

  /**
   * Check if Git LFS is installed
   */
  async isLfsInstalled(): Promise<boolean> {
    try {
      const result = await this.execute(['lfs', 'version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Initialize Git LFS in repository
   */
  async lfsInstall(options: GitCommandOptions = {}): Promise<void> {
    const result = await this.execute(['lfs', 'install'], options);
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to install Git LFS: ${result.stderr}`, 'LFS_INSTALL_FAILED');
    }
  }

  /**
   * Track files with Git LFS
   */
  async lfsTrack(pattern: string, options: GitCommandOptions = {}): Promise<void> {
    const result = await this.execute(['lfs', 'track', pattern], options);
    
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to track pattern with LFS: ${result.stderr}`, 'LFS_TRACK_FAILED');
    }
  }

  /**
   * Get Git LFS tracked patterns
   */
  async lfsTrackedPatterns(options: GitCommandOptions = {}): Promise<string[]> {
    const result = await this.execute(['lfs', 'track'], options);
    
    if (result.exitCode !== 0) {
      return [];
    }
    
    // Parse output to extract patterns
    const patterns: string[] = [];
    const lines = result.stdout.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*(\S+)\s+\(.*\)$/);
      if (match) {
        patterns.push(match[1]);
      }
    }
    
    return patterns;
  }
}

export class GitError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'GitError';
  }
}

export interface CloneOptions extends GitCommandOptions {
  depth?: number;
  branch?: string;
  singleBranch?: boolean;
}

export interface CommitOptions extends GitCommandOptions {
  author?: string;
  allowEmpty?: boolean;
}

export interface PushOptions extends GitCommandOptions {
  force?: boolean;
  setUpstream?: boolean;
}

// Export singleton instance
export const gitCommand = new GitCommand();