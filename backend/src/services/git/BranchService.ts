import { gitCommand, GitError } from './GitCommand';
import { Repository } from '../../models';
import { logger } from '../../utils/logger';

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
}

export class BranchService {
  /**
   * List all branches in a repository
   */
  async listBranches(repository: Repository): Promise<BranchInfo[]> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const currentBranch = await gitCommand.getCurrentBranch({ cwd: repository.local_path });
    const branches = await gitCommand.listBranches({ cwd: repository.local_path });
    
    const branchInfos: BranchInfo[] = [];

    for (const branch of branches) {
      const info: BranchInfo = {
        name: branch,
        isCurrent: branch === currentBranch
      };

      // Get last commit info
      try {
        const result = await gitCommand.execute([
          'log',
          '-1',
          '--pretty=format:%H|%s|%an|%at',
          branch
        ], { cwd: repository.local_path });

        if (result.exitCode === 0 && result.stdout) {
          const [hash, message, author, timestamp] = result.stdout.split('|');
          info.lastCommit = {
            hash,
            message,
            author,
            date: new Date(parseInt(timestamp) * 1000)
          };
        }
      } catch (error) {
        logger.warn(`Failed to get last commit for branch ${branch}:`, error);
      }

      branchInfos.push(info);
    }

    return branchInfos;
  }

  /**
   * Create a new branch
   */
  async createBranch(
    repository: Repository,
    branchName: string,
    fromBranch?: string
  ): Promise<void> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    if (!this.isValidBranchName(branchName)) {
      throw new Error('Invalid branch name. Use only letters, numbers, hyphens, underscores, and slashes.');
    }

    const args = ['checkout', '-b', branchName];
    if (fromBranch) {
      args.push(fromBranch);
    }

    const result = await gitCommand.execute(args, { cwd: repository.local_path });

    if (result.exitCode !== 0) {
      if (result.stderr.includes('already exists')) {
        throw new Error('Branch already exists');
      }
      throw new GitError(`Failed to create branch: ${result.stderr}`, 'CREATE_BRANCH_FAILED');
    }

    logger.info(`Created branch ${branchName} in repository ${repository.name}`);
  }

  /**
   * Switch to a different branch
   */
  async switchBranch(repository: Repository, branchName: string): Promise<void> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const result = await gitCommand.execute(['checkout', branchName], { 
      cwd: repository.local_path 
    });

    if (result.exitCode !== 0) {
      if (result.stderr.includes('did not match any file')) {
        throw new Error('Branch not found');
      }
      if (result.stderr.includes('Your local changes')) {
        throw new Error('Cannot switch branch: You have uncommitted changes');
      }
      throw new GitError(`Failed to switch branch: ${result.stderr}`, 'SWITCH_BRANCH_FAILED');
    }

    logger.info(`Switched to branch ${branchName} in repository ${repository.name}`);
  }

  /**
   * Delete a branch
   */
  async deleteBranch(repository: Repository, branchName: string, force: boolean = false): Promise<void> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    // Prevent deletion of current branch
    const currentBranch = await gitCommand.getCurrentBranch({ cwd: repository.local_path });
    if (currentBranch === branchName) {
      throw new Error('Cannot delete the current branch');
    }

    // Prevent deletion of main/master
    if (['main', 'master'].includes(branchName.toLowerCase())) {
      throw new Error('Cannot delete the main branch');
    }

    const args = ['branch'];
    args.push(force ? '-D' : '-d');
    args.push(branchName);

    const result = await gitCommand.execute(args, { cwd: repository.local_path });

    if (result.exitCode !== 0) {
      if (result.stderr.includes('not found')) {
        throw new Error('Branch not found');
      }
      if (result.stderr.includes('not fully merged')) {
        throw new Error('Branch has unmerged changes. Use force delete to override.');
      }
      throw new GitError(`Failed to delete branch: ${result.stderr}`, 'DELETE_BRANCH_FAILED');
    }

    logger.info(`Deleted branch ${branchName} from repository ${repository.name}`);
  }

  /**
   * Merge a branch into current branch
   */
  async mergeBranch(
    repository: Repository,
    sourceBranch: string,
    message?: string
  ): Promise<void> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const currentBranch = await gitCommand.getCurrentBranch({ cwd: repository.local_path });
    if (!currentBranch) {
      throw new Error('Could not determine current branch');
    }

    const args = ['merge', sourceBranch];
    if (message) {
      args.push('-m', message);
    }

    const result = await gitCommand.execute(args, { cwd: repository.local_path });

    if (result.exitCode !== 0) {
      if (result.stderr.includes('CONFLICT')) {
        throw new Error('Merge conflict detected. Manual resolution required.');
      }
      if (result.stderr.includes('not something we can merge')) {
        throw new Error('Source branch not found');
      }
      throw new GitError(`Failed to merge branch: ${result.stderr}`, 'MERGE_FAILED');
    }

    logger.info(`Merged branch ${sourceBranch} into ${currentBranch} in repository ${repository.name}`);
  }

  /**
   * Get branch comparison (ahead/behind commits)
   */
  async compareBranches(
    repository: Repository,
    branch1: string,
    branch2: string
  ): Promise<{ ahead: number; behind: number }> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    // Get commits in branch1 not in branch2 (ahead)
    const aheadResult = await gitCommand.execute([
      'rev-list',
      '--count',
      `${branch2}..${branch1}`
    ], { cwd: repository.local_path });

    // Get commits in branch2 not in branch1 (behind)
    const behindResult = await gitCommand.execute([
      'rev-list',
      '--count',
      `${branch1}..${branch2}`
    ], { cwd: repository.local_path });

    return {
      ahead: parseInt(aheadResult.stdout) || 0,
      behind: parseInt(behindResult.stdout) || 0
    };
  }

  /**
   * Validate branch name
   */
  private isValidBranchName(name: string): boolean {
    // Git branch name rules
    if (!name || name.length === 0) return false;
    if (name.startsWith('-') || name.endsWith('/')) return false;
    if (name.includes('..') || name.includes('//')) return false;
    if (name.includes(' ') || name.includes('~') || name.includes('^') || name.includes(':')) return false;
    if (name.includes('?') || name.includes('*') || name.includes('[')) return false;
    
    // Additional restrictions
    const reserved = ['HEAD', 'FETCH_HEAD', 'ORIG_HEAD'];
    if (reserved.includes(name.toUpperCase())) return false;
    
    return /^[a-zA-Z0-9/_-]+$/.test(name);
  }
}

// Export singleton instance
export const branchService = new BranchService();