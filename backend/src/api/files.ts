import express from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { repositoryService } from '../services/git/RepositoryService';
import { fileOperationsService } from '../services/git/FileOperations';
import { SharedFolder } from '../models';
import { logger } from '../utils/logger';
import path from 'path';
import {
  uploadConfig,
  chunkUploadConfig,
  trackUploadProgress,
  initializeChunkedUpload,
  handleChunkUpload,
  assembleChunks,
  getUploadProgress
} from '../middleware/upload';

const router = express.Router();

// List files in a repository folder
router.get('/repositories/:repoId/files', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const folderPath = req.query.path as string || '/';
    
    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const files = await fileOperationsService.listFiles(repository, folderPath);
    
    res.json({ files, path: folderPath });
  } catch (error) {
    logger.error('Error listing files:', error);
    if (error.message === 'Folder not found') {
      res.status(404).json({ error: 'Folder not found' });
    } else {
      res.status(500).json({ error: 'Failed to list files' });
    }
  }
});

// Upload file to repository
router.post('/repositories/:repoId/upload', requireAuth, uploadConfig.single('file'), trackUploadProgress, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const filePath = req.body.path || '/';
    const commitMessage = req.body.message;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Construct full file path
    const fileName = req.file.originalname;
    const fullPath = path.join(filePath, fileName).replace(/\\/g, '/');

    // Upload file
    await fileOperationsService.uploadFile(
      repository,
      fullPath,
      req.file.buffer,
      req.file.size,
      req.user!,
      { message: commitMessage }
    );

    // Log operation (if shared folder exists)
    const sharedFolder = await SharedFolder.query()
      .where('repository_id', repoId)
      .first();
    
    if (sharedFolder) {
      await fileOperationsService.logOperation(
        sharedFolder.id,
        req.user!.id,
        'upload',
        fullPath,
        req.file.size,
        undefined,
        commitMessage,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      path: fullPath,
      size: req.file.size
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Download file from repository
router.get('/repositories/:repoId/download', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { stream, size, filename } = await fileOperationsService.downloadFile(repository, filePath);

    // Set headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', size.toString());

    // Stream file
    stream.pipe(res);

    // Log operation
    const sharedFolder = await SharedFolder.query()
      .where('repository_id', repoId)
      .first();
    
    if (sharedFolder) {
      await fileOperationsService.logOperation(
        sharedFolder.id,
        req.user!.id,
        'download',
        filePath,
        size,
        undefined,
        undefined,
        req.ip,
        req.get('user-agent')
      );
    }
  } catch (error) {
    logger.error('Error downloading file:', error);
    if (error.message === 'File not found') {
      res.status(404).json({ error: 'File not found' });
    } else if (error.message === 'Cannot download a directory') {
      res.status(400).json({ error: 'Cannot download a directory' });
    } else {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
});

// Delete file or folder
router.delete('/repositories/:repoId/files', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const filePath = req.body.path;
    const commitMessage = req.body.message;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await fileOperationsService.deleteFile(
      repository,
      filePath,
      req.user!,
      { message: commitMessage }
    );

    // Log operation
    const sharedFolder = await SharedFolder.query()
      .where('repository_id', repoId)
      .first();
    
    if (sharedFolder) {
      await fileOperationsService.logOperation(
        sharedFolder.id,
        req.user!.id,
        'delete',
        filePath,
        undefined,
        undefined,
        commitMessage,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Error deleting file:', error);
    if (error.message === 'File or folder not found') {
      res.status(404).json({ error: 'File or folder not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  }
});

// Move or rename file
router.post('/repositories/:repoId/move', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const { source, destination, message } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination paths are required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await fileOperationsService.moveFile(
      repository,
      source,
      destination,
      req.user!,
      { message }
    );

    // Log operation
    const sharedFolder = await SharedFolder.query()
      .where('repository_id', repoId)
      .first();
    
    if (sharedFolder) {
      await fileOperationsService.logOperation(
        sharedFolder.id,
        req.user!.id,
        'rename',
        `${source} -> ${destination}`,
        undefined,
        undefined,
        message,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({ success: true, message: 'File moved successfully' });
  } catch (error) {
    logger.error('Error moving file:', error);
    if (error.message === 'Source file or folder not found') {
      res.status(404).json({ error: 'Source file or folder not found' });
    } else {
      res.status(500).json({ error: 'Failed to move file' });
    }
  }
});

// Get file version history
router.get('/repositories/:repoId/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const filePath = req.query.path as string;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const history = await fileOperationsService.getFileHistory(repository, filePath, limit);
    
    res.json({ history, file: filePath });
  } catch (error) {
    logger.error('Error getting file history:', error);
    res.status(500).json({ error: 'Failed to get file history' });
  }
});

// Get file content at specific version
router.get('/repositories/:repoId/version/:commitHash', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const commitHash = req.params.commitHash;
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const content = await fileOperationsService.getFileAtVersion(repository, filePath, commitHash);
    const filename = path.basename(filePath);

    // Set headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', content.length.toString());

    res.send(content);
  } catch (error) {
    logger.error('Error getting file version:', error);
    if (error.message === 'File not found in this version') {
      res.status(404).json({ error: 'File not found in this version' });
    } else {
      res.status(500).json({ error: 'Failed to get file version' });
    }
  }
});

// Initialize chunked upload
router.post('/repositories/:repoId/chunk-upload/init', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { filename, totalSize, totalChunks } = req.body;
    
    if (!filename || !totalSize || !totalChunks) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const uploadId = await initializeChunkedUpload(filename, totalSize, totalChunks);
    
    res.json({
      uploadId,
      message: 'Chunked upload initialized'
    });
  } catch (error) {
    logger.error('Error initializing chunked upload:', error);
    res.status(500).json({ error: 'Failed to initialize chunked upload' });
  }
});

// Upload chunk
router.post('/repositories/:repoId/chunk-upload/:uploadId/chunk/:chunkNumber', 
  requireAuth, 
  chunkUploadConfig.single('chunk'), 
  async (req: AuthRequest, res) => {
    try {
      const uploadId = req.params.uploadId;
      const chunkNumber = parseInt(req.params.chunkNumber);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No chunk data provided' });
      }

      const result = await handleChunkUpload(uploadId, chunkNumber, req.file.buffer);
      
      res.json({
        success: true,
        completed: result.completed,
        missingChunks: result.missingChunks
      });
    } catch (error) {
      logger.error('Error uploading chunk:', error);
      if (error.message === 'Upload not found') {
        res.status(404).json({ error: 'Upload not found' });
      } else {
        res.status(500).json({ error: 'Failed to upload chunk' });
      }
    }
  }
);

// Finalize chunked upload
router.post('/repositories/:repoId/chunk-upload/:uploadId/finalize', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const uploadId = req.params.uploadId;
    const { path: filePath = '/', message: commitMessage } = req.body;

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Assemble chunks into final file
    const fileBuffer = await assembleChunks(uploadId);
    const progress = getUploadProgress(uploadId);
    
    if (!progress) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Construct full file path
    const fullPath = path.join(filePath, progress.filename).replace(/\\/g, '/');

    // Upload assembled file
    await fileOperationsService.uploadFile(
      repository,
      fullPath,
      fileBuffer,
      fileBuffer.length,
      req.user!,
      { message: commitMessage }
    );

    // Log operation
    const sharedFolder = await SharedFolder.query()
      .where('repository_id', repoId)
      .first();
    
    if (sharedFolder) {
      await fileOperationsService.logOperation(
        sharedFolder.id,
        req.user!.id,
        'upload',
        fullPath,
        fileBuffer.length,
        undefined,
        commitMessage,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      path: fullPath,
      size: fileBuffer.length
    });
  } catch (error) {
    logger.error('Error finalizing chunked upload:', error);
    if (error.message === 'Upload not completed') {
      res.status(400).json({ error: 'Upload not completed' });
    } else if (error.message === 'Upload not found') {
      res.status(404).json({ error: 'Upload not found' });
    } else {
      res.status(500).json({ error: 'Failed to finalize upload' });
    }
  }
});

// Get upload progress
router.get('/repositories/:repoId/upload-progress/:uploadId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uploadId = req.params.uploadId;
    const progress = getUploadProgress(uploadId);
    
    if (!progress) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({
      uploadId: progress.uploadId,
      filename: progress.filename,
      totalSize: progress.totalSize,
      uploadedSize: progress.uploadedSize,
      percentage: Math.round((progress.uploadedSize / progress.totalSize) * 100),
      completed: progress.completed,
      chunksReceived: progress.chunks.length
    });
  } catch (error) {
    logger.error('Error getting upload progress:', error);
    res.status(500).json({ error: 'Failed to get upload progress' });
  }
});

export default router;