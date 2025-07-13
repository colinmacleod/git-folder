import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeChunkedUpload,
  handleChunkUpload,
  assembleChunks,
  getUploadProgress,
  trackUploadProgress
} from '../upload';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('Upload Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('test'));
    vi.mocked(fs.rm).mockResolvedValue(undefined);
  });

  describe('initializeChunkedUpload', () => {
    it('should initialize chunked upload successfully', async () => {
      const uploadId = await initializeChunkedUpload('test-file.bin', 1024, 2);

      expect(uploadId).toMatch(/^[a-f0-9]{32}$/); // 32 char hex string
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(uploadId),
        { recursive: true }
      );

      const progress = getUploadProgress(uploadId);
      expect(progress).toMatchObject({
        uploadId,
        filename: 'test-file.bin',
        totalSize: 1024,
        uploadedSize: 0,
        chunks: [],
        completed: false
      });
    });
  });

  describe('handleChunkUpload', () => {
    it('should handle chunk upload successfully', async () => {
      const uploadId = await initializeChunkedUpload('test-file.bin', 1024, 2);
      const chunkData = Buffer.alloc(512);

      const result = await handleChunkUpload(uploadId, 0, chunkData);

      expect(result).toEqual({
        completed: false,
        missingChunks: [1]
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('chunk-0'),
        chunkData
      );

      const progress = getUploadProgress(uploadId);
      expect(progress?.chunks).toEqual([0]);
      expect(progress?.uploadedSize).toBe(512);
    });

    it('should complete upload when all chunks received', async () => {
      const uploadId = await initializeChunkedUpload('small-file.bin', 1024, 2);
      const chunkData = Buffer.alloc(512);

      // Upload first chunk
      await handleChunkUpload(uploadId, 0, chunkData);
      
      // Upload second chunk
      const result = await handleChunkUpload(uploadId, 1, chunkData);

      expect(result).toEqual({
        completed: true
      });

      const progress = getUploadProgress(uploadId);
      expect(progress?.completed).toBe(true);
      expect(progress?.chunks).toEqual([0, 1]);
    });

    it('should throw error for non-existent upload', async () => {
      const chunkData = Buffer.alloc(1024);

      await expect(
        handleChunkUpload('non-existent-upload', 0, chunkData)
      ).rejects.toThrow('Upload not found');
    });
  });

  describe('assembleChunks', () => {
    it('should assemble chunks successfully', async () => {
      // Mock fs.readFile to return specific data per chunk
      vi.mocked(fs.readFile).mockImplementation((filePath) => {
        const fileName = filePath.toString();
        if (fileName.includes('chunk-0')) return Promise.resolve(Buffer.from('chunk0'));
        if (fileName.includes('chunk-1')) return Promise.resolve(Buffer.from('chunk1'));
        return Promise.resolve(Buffer.alloc(0));
      });

      const uploadId = await initializeChunkedUpload('test-file.txt', 12, 2);
      
      // Simulate uploading chunks
      await handleChunkUpload(uploadId, 0, Buffer.from('chunk0'));
      await handleChunkUpload(uploadId, 1, Buffer.from('chunk1'));

      const assembledFile = await assembleChunks(uploadId);

      expect(assembledFile).toEqual(Buffer.from('chunk0chunk1'));
      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining(uploadId),
        { recursive: true, force: true }
      );

      // Upload should be removed after assembly
      expect(getUploadProgress(uploadId)).toBeNull();
    });

    it('should throw error for incomplete upload', async () => {
      const uploadId = await initializeChunkedUpload('test-file.bin', 1024, 2);
      
      // Only upload one chunk
      await handleChunkUpload(uploadId, 0, Buffer.alloc(512));

      await expect(assembleChunks(uploadId)).rejects.toThrow('Upload not completed');
    });

    it('should throw error for non-existent upload', async () => {
      await expect(
        assembleChunks('non-existent-upload')
      ).rejects.toThrow('Upload not completed');
    });
  });

  describe('getUploadProgress', () => {
    it('should return upload progress', async () => {
      const uploadId = await initializeChunkedUpload('test-file.bin', 1024, 2);
      
      const progress = getUploadProgress(uploadId);

      expect(progress).toMatchObject({
        uploadId,
        filename: 'test-file.bin',
        totalSize: 1024,
        uploadedSize: 0,
        chunks: [],
        completed: false
      });
    });

    it('should return null for non-existent upload', () => {
      const progress = getUploadProgress('non-existent-upload');
      expect(progress).toBeNull();
    });
  });

  describe('trackUploadProgress', () => {
    it('should track upload progress for requests with upload-id header', () => {
      const mockReq = {
        headers: {
          'x-upload-id': 'test-upload-id',
          'content-length': '1024'
        },
        on: vi.fn()
      };
      const mockRes = {};
      const mockNext = vi.fn();

      trackUploadProgress(mockReq as any, mockRes as any, mockNext);

      expect(mockReq.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip tracking for requests without upload-id header', () => {
      const mockReq = {
        headers: {},
        on: vi.fn()
      };
      const mockRes = {};
      const mockNext = vi.fn();

      trackUploadProgress(mockReq as any, mockRes as any, mockNext);

      expect(mockReq.on).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});