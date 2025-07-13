import { describe, it, expect, beforeEach, vi } from 'vitest';
import { repositoryService } from '../RepositoryService';
import { Repository } from '../../../models';
import { sshService } from '../../ssh';
import fs from 'fs/promises';

// Mock all external dependencies
vi.mock('../../../models');
vi.mock('../../ssh');
vi.mock('fs/promises');

// Mock GitCommand module completely
vi.mock('../GitCommand', () => ({
  GitCommand: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    clone: vi.fn(),
    execute: vi.fn(),
    lfsInstall: vi.fn(),
    lfsTrack: vi.fn(),
    add: vi.fn(),
    commit: vi.fn()
  })),
  gitCommand: {
    init: vi.fn(),
    clone: vi.fn(),
    execute: vi.fn(),
    lfsInstall: vi.fn(),
    lfsTrack: vi.fn(),
    add: vi.fn(),
    commit: vi.fn()
  },
  GitError: class GitError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'GitError';
    }
  }
}));

describe('RepositoryService', () => {
  let mockUser: any;
  let mockRepository: any;

  beforeEach(() => {
    mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };

    mockRepository = {
      id: 1,
      name: 'test-repo',
      description: 'Test repository',
      local_path: '/repos/test-repo',
      git_url: 'https://github.com/test/repo.git',
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    vi.clearAllMocks();
  });

  describe('createRepository', () => {
    it('should create a new repository successfully', async () => {
      const mockQuery = {
        insert: vi.fn().mockResolvedValue([mockRepository])
      };
      vi.mocked(Repository.query).mockReturnValue(mockQuery as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(sshService.getDecryptedKeys).mockResolvedValue({
        privateKey: 'private-key-content',
        publicKey: 'public-key-content'
      });

      const result = await repositoryService.createRepository(
        'test-repo',
        'Test repository',
        mockUser
      );

      expect(result).toEqual(mockRepository);
      expect(mockQuery.insert).toHaveBeenCalledWith({
        name: 'test-repo',
        description: 'Test repository',
        local_path: expect.stringContaining('test-repo'),
        user_id: 1
      });
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should create repository with git_url when provided', async () => {
      const mockQuery = {
        insert: vi.fn().mockResolvedValue([mockRepository])
      };
      vi.mocked(Repository.query).mockReturnValue(mockQuery as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(sshService.getDecryptedKeys).mockResolvedValue({
        privateKey: 'private-key-content',
        publicKey: 'public-key-content'
      });

      const gitUrl = 'https://github.com/test/repo.git';
      await repositoryService.createRepository(
        'test-repo',
        'Test repository',
        mockUser,
        gitUrl
      );

      expect(mockQuery.insert).toHaveBeenCalledWith({
        name: 'test-repo',
        description: 'Test repository',
        local_path: expect.stringContaining('test-repo'),
        git_url: gitUrl,
        user_id: 1
      });
    });

    it('should throw error if user has no SSH keys', async () => {
      vi.mocked(sshService.getDecryptedKeys).mockResolvedValue(null);

      await expect(
        repositoryService.createRepository('test-repo', 'Test', mockUser)
      ).rejects.toThrow('User must have SSH keys configured');
    });
  });

  describe('getRepository', () => {
    it('should return repository when user has access', async () => {
      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRepository)
      };
      vi.mocked(Repository.query).mockReturnValue(mockQuery as any);

      const result = await repositoryService.getRepository(1, 1);

      expect(result).toEqual(mockRepository);
      expect(mockQuery.where).toHaveBeenCalledWith('id', 1);
      expect(mockQuery.andWhere).toHaveBeenCalledWith('user_id', 1);
    });

    it('should return null when repository not found', async () => {
      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };
      vi.mocked(Repository.query).mockReturnValue(mockQuery as any);

      const result = await repositoryService.getRepository(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('getUserRepositories', () => {
    it('should return user repositories', async () => {
      const repositories = [mockRepository];
      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(repositories)
      };
      vi.mocked(Repository.query).mockReturnValue(mockQuery as any);

      const result = await repositoryService.getUserRepositories(1);

      expect(result).toEqual(repositories);
      expect(mockQuery.where).toHaveBeenCalledWith('user_id', 1);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });
  });

  describe('initializeGitLFS', () => {
    it('should initialize Git LFS successfully', async () => {
      // This test doesn't need to test the actual GitCommand since it's mocked
      await expect(
        repositoryService.initializeGitLFS(mockRepository)
      ).resolves.not.toThrow();
    });
  });

  describe('deleteRepository', () => {
    it('should delete repository successfully', async () => {
      const mockGetRepo = vi.spyOn(repositoryService, 'getRepository').mockResolvedValue(mockRepository);
      const mockQuery = {
        deleteById: vi.fn().mockResolvedValue(1)
      };
      vi.mocked(Repository.query).mockReturnValue(mockQuery as any);
      vi.mocked(fs.rm).mockResolvedValue(undefined);

      await repositoryService.deleteRepository(1, 1);

      expect(mockGetRepo).toHaveBeenCalledWith(1, 1);
      expect(mockQuery.deleteById).toHaveBeenCalledWith(1);
      expect(fs.rm).toHaveBeenCalledWith(mockRepository.local_path, { 
        recursive: true, 
        force: true 
      });

      mockGetRepo.mockRestore();
    });

    it('should throw error when repository not found', async () => {
      const mockGetRepo = vi.spyOn(repositoryService, 'getRepository').mockResolvedValue(null);

      await expect(
        repositoryService.deleteRepository(999, 1)
      ).rejects.toThrow('Repository not found');

      mockGetRepo.mockRestore();
    });
  });

  describe('cloneRepository', () => {
    it('should clone repository with SSH setup', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.chmod).mockResolvedValue(undefined);
      vi.mocked(sshService.getDecryptedKeys).mockResolvedValue({
        privateKey: 'private-key-content',
        publicKey: 'public-key-content'
      });

      const gitUrl = 'git@github.com:test/repo.git';
      const repoWithGitUrl = { ...mockRepository, git_url: gitUrl };

      await expect(
        repositoryService.cloneRepository(repoWithGitUrl)
      ).resolves.not.toThrow();

      expect(fs.writeFile).toHaveBeenCalled(); // SSH key setup
      expect(fs.chmod).toHaveBeenCalledWith(expect.any(String), 0o600);
    });

    it('should throw error for repository without git_url', async () => {
      const repoWithoutGitUrl = { ...mockRepository, git_url: null };

      await expect(
        repositoryService.cloneRepository(repoWithoutGitUrl)
      ).rejects.toThrow('Repository must have a git_url to clone');
    });
  });
});