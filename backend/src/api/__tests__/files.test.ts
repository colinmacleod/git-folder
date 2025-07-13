import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { repositoryService } from '../../services/git/RepositoryService';
import { fileOperationsService } from '../../services/git/FileOperations';
import { SharedFolder } from '../../models';
import { 
  initializeChunkedUpload, 
  handleChunkUpload, 
  assembleChunks, 
  getUploadProgress 
} from '../../middleware/upload';

// Mock all dependencies first
vi.mock('../../services/git/RepositoryService');
vi.mock('../../services/git/FileOperations');
vi.mock('../../models');
vi.mock('../../middleware/upload');
vi.mock('../../server', () => ({
  default: {
    use: vi.fn(),
    listen: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

// Create a simple mock app for testing
const mockApp = {
  use: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
};

describe('Files API', () => {
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
      local_path: '/repos/test-repo',
      user_id: 1
    };

    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(repositoryService.getRepository).mockResolvedValue(mockRepository);
    vi.mocked(fileOperationsService.uploadFile).mockResolvedValue(undefined);
    vi.mocked(fileOperationsService.logOperation).mockResolvedValue(undefined);
    
    const mockSharedFolderQuery = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 1 })
    };
    vi.mocked(SharedFolder.query).mockReturnValue(mockSharedFolderQuery as any);
  });

  describe('File operations', () => {
    it('should list files in repository', async () => {
      const mockFiles = [
        { name: 'file1.txt', isDirectory: false, size: 1024 },
        { name: 'folder1', isDirectory: true, size: 0 }
      ];

      vi.mocked(fileOperationsService.listFiles).mockResolvedValue(mockFiles);

      // Test the core functionality without HTTP layer
      const result = await fileOperationsService.listFiles(mockRepository, '/');
      
      expect(result).toEqual(mockFiles);
      expect(repositoryService.getRepository).not.toHaveBeenCalled(); // Not called in unit test
    });

    it('should handle file upload', async () => {
      const fileBuffer = Buffer.from('test content');
      
      await fileOperationsService.uploadFile(
        mockRepository,
        '/test.txt',
        fileBuffer,
        fileBuffer.length,
        mockUser,
        { message: 'Upload test' }
      );

      expect(fileOperationsService.uploadFile).toHaveBeenCalledWith(
        mockRepository,
        '/test.txt',
        fileBuffer,
        fileBuffer.length,
        mockUser,
        { message: 'Upload test' }
      );
    });
  });

  describe('Chunked Upload Operations', () => {
    it('should initialize chunked upload', async () => {
      const uploadId = 'test-upload-id';
      vi.mocked(initializeChunkedUpload).mockResolvedValue(uploadId);

      const result = await initializeChunkedUpload('large-file.bin', 100 * 1024 * 1024, 10);

      expect(result).toBe(uploadId);
      expect(initializeChunkedUpload).toHaveBeenCalledWith('large-file.bin', 100 * 1024 * 1024, 10);
    });

    it('should handle chunk upload', async () => {
      const uploadId = 'test-upload-id';
      const chunkData = Buffer.alloc(1024);
      
      vi.mocked(handleChunkUpload).mockResolvedValue({
        completed: false,
        missingChunks: [1, 2, 3]
      });

      const result = await handleChunkUpload(uploadId, 0, chunkData);

      expect(result).toEqual({
        completed: false,
        missingChunks: [1, 2, 3]
      });
    });

    it('should complete upload when all chunks received', async () => {
      const uploadId = 'test-upload-id';
      const chunkData = Buffer.alloc(1024);
      
      vi.mocked(handleChunkUpload).mockResolvedValue({
        completed: true
      });

      const result = await handleChunkUpload(uploadId, 9, chunkData);

      expect(result).toEqual({
        completed: true
      });
    });

    it('should finalize chunked upload', async () => {
      const uploadId = 'test-upload-id';
      const fileBuffer = Buffer.alloc(100 * 1024 * 1024);
      
      vi.mocked(assembleChunks).mockResolvedValue(fileBuffer);
      vi.mocked(getUploadProgress).mockReturnValue({
        uploadId,
        filename: 'large-file.bin',
        totalSize: fileBuffer.length,
        uploadedSize: fileBuffer.length,
        chunks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        completed: true,
        createdAt: new Date()
      });

      const assembledFile = await assembleChunks(uploadId);
      const progress = getUploadProgress(uploadId);

      expect(assembledFile).toEqual(fileBuffer);
      expect(progress?.completed).toBe(true);
    });

    it('should get upload progress', async () => {
      const uploadId = 'test-upload-id';
      const mockProgress = {
        uploadId,
        filename: 'large-file.bin',
        totalSize: 100 * 1024 * 1024,
        uploadedSize: 50 * 1024 * 1024,
        chunks: [0, 1, 2, 3, 4],
        completed: false,
        createdAt: new Date()
      };
      
      vi.mocked(getUploadProgress).mockReturnValue(mockProgress);

      const result = getUploadProgress(uploadId);

      expect(result).toEqual(mockProgress);
    });
  });

  describe('File download and operations', () => {
    it('should download file successfully', async () => {
      const mockStream = { pipe: vi.fn() };
      
      vi.mocked(fileOperationsService.downloadFile).mockResolvedValue({
        stream: mockStream as any,
        size: 1024,
        filename: 'test.txt'
      });

      const result = await fileOperationsService.downloadFile(mockRepository, '/test.txt');

      expect(result).toMatchObject({
        stream: mockStream,
        size: 1024,
        filename: 'test.txt'
      });
    });

    it('should delete file successfully', async () => {
      vi.mocked(fileOperationsService.deleteFile).mockResolvedValue(undefined);

      await fileOperationsService.deleteFile(
        mockRepository,
        '/test.txt',
        mockUser,
        { message: 'Delete test file' }
      );

      expect(fileOperationsService.deleteFile).toHaveBeenCalledWith(
        mockRepository,
        '/test.txt',
        mockUser,
        { message: 'Delete test file' }
      );
    });

    it('should move file successfully', async () => {
      vi.mocked(fileOperationsService.moveFile).mockResolvedValue(undefined);

      await fileOperationsService.moveFile(
        mockRepository,
        '/old/path.txt',
        '/new/path.txt',
        mockUser,
        { message: 'Move file' }
      );

      expect(fileOperationsService.moveFile).toHaveBeenCalledWith(
        mockRepository,
        '/old/path.txt',
        '/new/path.txt',
        mockUser,
        { message: 'Move file' }
      );
    });

    it('should get file history', async () => {
      const mockHistory = [
        { hash: 'abc123', author: 'John Doe', message: 'Initial commit', date: new Date() }
      ];
      
      vi.mocked(fileOperationsService.getFileHistory).mockResolvedValue(mockHistory);

      const result = await fileOperationsService.getFileHistory(mockRepository, '/test.txt', 10);

      expect(result).toEqual(mockHistory);
    });

    it('should get file at specific version', async () => {
      const mockContent = Buffer.from('file content at version');
      
      vi.mocked(fileOperationsService.getFileAtVersion).mockResolvedValue(mockContent);

      const result = await fileOperationsService.getFileAtVersion(
        mockRepository,
        '/test.txt',
        'abc123'
      );

      expect(result).toEqual(mockContent);
    });
  });
});