import { describe, it, expect, beforeEach, vi } from 'vitest';
import { branchService } from '../BranchService';

// Mock GitCommand module completely
vi.mock('../GitCommand', () => ({
  GitCommand: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
    getCurrentBranch: vi.fn(),
    listBranches: vi.fn()
  })),
  gitCommand: {
    execute: vi.fn(),
    getCurrentBranch: vi.fn(),
    listBranches: vi.fn()
  },
  GitError: class GitError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'GitError';
    }
  }
}));

// Import after mocking
import { gitCommand } from '../GitCommand';

describe('BranchService', () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      id: 1,
      name: 'test-repo',
      local_path: '/repos/test-repo',
      user_id: 1
    };

    vi.clearAllMocks();
  });

  describe('listBranches', () => {
    it('should list all branches successfully', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '* main\n  feature-branch\n  develop',
        stderr: '',
        exitCode: 0
      });

      const result = await branchService.listBranches(mockRepository);

      expect(result).toEqual({
        branches: ['main', 'feature-branch', 'develop'],
        current: 'main'
      });
      expect(gitCommand.execute).toHaveBeenCalledWith(['branch'], { cwd: mockRepository.local_path });
    });

    it('should handle repository with single branch', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '* main',
        stderr: '',
        exitCode: 0
      });

      const result = await branchService.listBranches(mockRepository);

      expect(result).toEqual({
        branches: ['main'],
        current: 'main'
      });
    });

    it('should handle git command failure', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 1
      });

      await expect(
        branchService.listBranches(mockRepository)
      ).rejects.toThrow('Failed to list branches: fatal: not a git repository');
    });
  });

  describe('createBranch', () => {
    it('should create new branch successfully', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0
      });

      await branchService.createBranch(mockRepository, 'new-feature');

      expect(gitCommand.execute).toHaveBeenCalledWith(['checkout', '-b', 'new-feature'], { cwd: mockRepository.local_path });
    });

    it('should create branch from specific source branch', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0
      });

      await branchService.createBranch(mockRepository, 'new-feature', 'develop');

      expect(gitCommand.execute).toHaveBeenCalledWith(['checkout', '-b', 'new-feature', 'develop'], { cwd: mockRepository.local_path });
    });

    it('should handle branch creation failure', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: A branch named \'existing\' already exists.',
        exitCode: 1
      });

      await expect(
        branchService.createBranch(mockRepository, 'existing')
      ).rejects.toThrow('Failed to create branch: fatal: A branch named \'existing\' already exists.');
    });

    it('should validate branch name', async () => {
      await expect(
        branchService.createBranch(mockRepository, '')
      ).rejects.toThrow('Branch name is required');

      await expect(
        branchService.createBranch(mockRepository, 'invalid..name')
      ).rejects.toThrow('Invalid branch name format');

      await expect(
        branchService.createBranch(mockRepository, 'invalid name with spaces')
      ).rejects.toThrow('Invalid branch name format');
    });
  });

  describe('switchBranch', () => {
    it('should switch to existing branch successfully', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: 'Switched to branch \'feature\'',
        stderr: '',
        exitCode: 0
      });

      await branchService.switchBranch(mockRepository, 'feature');

      expect(gitCommand.execute).toHaveBeenCalledWith(['checkout', 'feature'], { cwd: mockRepository.local_path });
    });

    it('should handle switch to non-existent branch', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '',
        stderr: 'error: pathspec \'nonexistent\' did not match any file(s) known to git',
        exitCode: 1
      });

      await expect(
        branchService.switchBranch(mockRepository, 'nonexistent')
      ).rejects.toThrow('Failed to switch branch');
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch successfully', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: 'Deleted branch feature (was abc123).',
        stderr: '',
        exitCode: 0
      });

      await branchService.deleteBranch(mockRepository, 'feature');

      expect(gitCommand.execute).toHaveBeenCalledWith(['branch', '-d', 'feature'], { cwd: mockRepository.local_path });
    });

    it('should force delete branch when specified', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: 'Deleted branch feature (was abc123).',
        stderr: '',
        exitCode: 0
      });

      await branchService.deleteBranch(mockRepository, 'feature', true);

      expect(gitCommand.execute).toHaveBeenCalledWith(['branch', '-D', 'feature'], { cwd: mockRepository.local_path });
    });

    it('should prevent deletion of main/master branch', async () => {
      await expect(
        branchService.deleteBranch(mockRepository, 'main')
      ).rejects.toThrow('Cannot delete main/master branch');

      await expect(
        branchService.deleteBranch(mockRepository, 'master')
      ).rejects.toThrow('Cannot delete main/master branch');
    });
  });

  describe('mergeBranch', () => {
    it('should merge branch successfully', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: 'Merge made by the \'recursive\' strategy.',
        stderr: '',
        exitCode: 0
      });

      await branchService.mergeBranch(mockRepository, 'feature');

      expect(gitCommand.execute).toHaveBeenCalledWith(['merge', 'feature'], { cwd: mockRepository.local_path });
    });

    it('should merge with custom message', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: 'Merge made by the \'recursive\' strategy.',
        stderr: '',
        exitCode: 0
      });

      await branchService.mergeBranch(mockRepository, 'feature', 'Custom merge message');

      expect(gitCommand.execute).toHaveBeenCalledWith([
        'merge', 'feature', '-m', 'Custom merge message'
      ], { cwd: mockRepository.local_path });
    });

    it('should handle merge conflicts', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '',
        stderr: 'CONFLICT (content): Merge conflict in file.txt',
        exitCode: 1
      });

      await expect(
        branchService.mergeBranch(mockRepository, 'feature')
      ).rejects.toThrow('Failed to merge branch');
    });
  });

  describe('compareBranches', () => {
    it('should compare branches successfully', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: 'abc123 Add new feature\ndef456 Fix bug in component',
        stderr: '',
        exitCode: 0
      });

      const result = await branchService.compareBranches(mockRepository, 'main', 'feature');

      expect(result).toEqual([
        { hash: 'abc123', message: 'Add new feature' },
        { hash: 'def456', message: 'Fix bug in component' }
      ]);
      expect(gitCommand.execute).toHaveBeenCalledWith([
        'log', '--oneline', 'main..feature'
      ], { cwd: mockRepository.local_path });
    });

    it('should handle no differences between branches', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0
      });

      const result = await branchService.compareBranches(mockRepository, 'main', 'feature');

      expect(result).toEqual([]);
    });
  });
});