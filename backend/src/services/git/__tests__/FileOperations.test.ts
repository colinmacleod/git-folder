import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileOperationsService } from '../FileOperations';
import { FileOperation } from '../../../models';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

// Mock all external dependencies
vi.mock('../../../models');
vi.mock('fs/promises');
vi.mock('fs');

// Mock GitCommand module completely
vi.mock('../GitCommand', () => ({
  gitCommand: {
    add: vi.fn(),
    commit: vi.fn(),
    lfsTrack: vi.fn(),
    isLfsInstalled: vi.fn(),
    execute: vi.fn()
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

describe('FileOperations', () => {
  let mockRepository: any;
  let mockUser: any;

  beforeEach(() => {
    mockRepository = {
      id: 1,
      name: 'test-repo',
      local_path: '/repos/test-repo',
      user_id: 1
    };

    mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };

    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default successful git command mocks
    vi.mocked(gitCommand.add).mockResolvedValue(undefined);
    vi.mocked(gitCommand.commit).mockResolvedValue('abc123');
    vi.mocked(gitCommand.lfsTrack).mockResolvedValue(undefined);
    vi.mocked(gitCommand.isLfsInstalled).mockResolvedValue(true);
    vi.mocked(gitCommand.execute).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0
    });
  });

  describe('listFiles', () => {
    it('should list files in repository folder', async () => {
      const mockFiles = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'folder1', isDirectory: () => true },
        { name: 'image.png', isDirectory: () => false }
      ];

      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
      vi.mocked(fs.stat).mockImplementation((filePath) => {
        const fileName = path.basename(filePath as string);
        return Promise.resolve({
          isDirectory: () => fileName === 'folder1',
          size: fileName === 'folder1' ? 0 : 1024,
          mtime: new Date('2023-01-01')
        } as any);
      });

      const result = await fileOperationsService.listFiles(mockRepository, '/');

      expect(result).toHaveLength(3);
      // Directories come first (folder1), then files alphabetically
      expect(result[0]).toMatchObject({
        name: 'folder1',
        isDirectory: true,
        size: 0
      });
      expect(result[1]).toMatchObject({
        name: 'file1.txt',
        isDirectory: false,
        size: 1024
      });
      expect(result[2]).toMatchObject({
        name: 'image.png',
        isDirectory: false,
        size: 1024
      });
    });

    it('should handle empty directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await fileOperationsService.listFiles(mockRepository, '/empty');

      expect(result).toHaveLength(0);
    });

    it('should throw error for non-existent folder', async () => {
      const error = new Error('ENOENT: no such file or directory') as any;
      error.code = 'ENOENT';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      await expect(
        fileOperationsService.listFiles(mockRepository, '/nonexistent')
      ).rejects.toThrow('Folder not found');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const fileBuffer = Buffer.from('test file content');
      
      await fileOperationsService.uploadFile(
        mockRepository,
        '/test/file.txt',
        fileBuffer,
        fileBuffer.length,
        mockUser,
        { message: 'Upload test file' }
      );

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('file.txt'),
        fileBuffer
      );
      expect(gitCommand.add).toHaveBeenCalled();
      expect(gitCommand.commit).toHaveBeenCalled();
    });

    it('should detect and use Git LFS for large files', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const largeFileSize = 60 * 1024 * 1024; // 60MB
      const largeFileBuffer = Buffer.alloc(largeFileSize);

      await fileOperationsService.uploadFile(
        mockRepository,
        '/large-file.bin',
        largeFileBuffer,
        largeFileSize,
        mockUser
      );

      expect(gitCommand.lfsTrack).toHaveBeenCalledWith('*.bin', expect.any(Object));
      expect(gitCommand.add).toHaveBeenCalledWith('.gitattributes', expect.any(Object));
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockReadStream = { pipe: vi.fn() };
      vi.mocked(createReadStream).mockReturnValue(mockReadStream as any);
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false,
        size: 1024
      } as any);

      const result = await fileOperationsService.downloadFile(mockRepository, '/test/file.txt');

      expect(result).toMatchObject({
        stream: mockReadStream,
        size: 1024,
        filename: 'file.txt'
      });
    });

    it('should throw error for non-existent file', async () => {
      const error = new Error('ENOENT') as any;
      error.code = 'ENOENT';
      vi.mocked(fs.stat).mockRejectedValue(error);

      await expect(
        fileOperationsService.downloadFile(mockRepository, '/nonexistent.txt')
      ).rejects.toThrow('File not found');
    });

    it('should throw error when trying to download directory', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
        size: 0
      } as any);

      await expect(
        fileOperationsService.downloadFile(mockRepository, '/some-folder')
      ).rejects.toThrow('Cannot download a directory');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false
      } as any);

      await fileOperationsService.deleteFile(
        mockRepository,
        '/test/file.txt',
        mockUser,
        { message: 'Delete test file' }
      );

      expect(gitCommand.execute).toHaveBeenCalledWith(
        ['rm', expect.stringContaining('file.txt')],
        expect.any(Object)
      );
      expect(gitCommand.commit).toHaveBeenCalled();
    });

    it('should delete directory recursively', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true
      } as any);

      await fileOperationsService.deleteFile(
        mockRepository,
        '/test/folder',
        mockUser
      );

      expect(gitCommand.execute).toHaveBeenCalledWith(
        ['rm', '-r', expect.stringContaining('folder')],
        expect.any(Object)
      );
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false
      } as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await fileOperationsService.moveFile(
        mockRepository,
        '/old/path.txt',
        '/new/path.txt',
        mockUser,
        { message: 'Move file' }
      );

      expect(fs.mkdir).toHaveBeenCalled();
      expect(gitCommand.execute).toHaveBeenCalledWith(
        ['mv', expect.any(String), expect.any(String)],
        expect.any(Object)
      );
    });
  });

  describe('getFileHistory', () => {
    it('should get file history successfully', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({ 
        stdout: 'abc123|2023-01-01 12:00:00|John Doe|Initial commit\ndef456|2023-01-02 12:00:00|Jane Doe|Update file',
        stderr: '', 
        exitCode: 0 
      });

      const result = await fileOperationsService.getFileHistory(
        mockRepository, 
        '/test/file.txt', 
        10
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        hash: 'abc123',
        author: 'John Doe',
        message: 'Initial commit'
      });
    });
  });

  describe('getFileAtVersion', () => {
    it('should get file content at specific version', async () => {
      vi.mocked(gitCommand.execute).mockResolvedValue({ 
        stdout: 'file content at version',
        stderr: '', 
        exitCode: 0 
      });

      const result = await fileOperationsService.getFileAtVersion(
        mockRepository,
        '/test/file.txt',
        'abc123'
      );

      expect(result).toEqual(Buffer.from('file content at version'));
      expect(gitCommand.execute).toHaveBeenCalledWith([
        'show', 'abc123:test/file.txt'
      ], expect.any(Object));
    });
  });

  describe('logOperation', () => {
    it('should log file operation', async () => {
      const mockQuery = {
        insert: vi.fn().mockResolvedValue([{ id: 1 }])
      };
      vi.mocked(FileOperation.query).mockReturnValue(mockQuery as any);

      await fileOperationsService.logOperation(
        1, // shared_folder_id
        1, // user_id
        'upload',
        '/test/file.txt',
        1024,
        'old-version',
        'Upload file',
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(mockQuery.insert).toHaveBeenCalledWith({
        shared_folder_id: 1,
        user_id: 1,
        operation_type: 'upload',
        file_path: '/test/file.txt',
        file_size: 1024,
        old_version: 'old-version',
        commit_message: 'Upload file',
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0'
      });
    });
  });
});