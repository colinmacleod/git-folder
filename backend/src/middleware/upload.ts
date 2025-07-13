import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export interface UploadProgress {
  uploadId: string;
  filename: string;
  totalSize: number;
  uploadedSize: number;
  chunks: number[];
  completed: boolean;
  createdAt: Date;
}

// Store upload progress in memory (in production, use Redis or database)
const uploadProgress = new Map<string, UploadProgress>();

// Clean up old uploads every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, progress] of uploadProgress.entries()) {
    if (progress.createdAt < oneHourAgo && !progress.completed) {
      uploadProgress.delete(id);
      logger.info(`Cleaned up expired upload: ${id}`);
    }
  }
}, 60 * 60 * 1000);

/**
 * Middleware to track upload progress
 */
export function trackUploadProgress(req: Request, res: Response, next: NextFunction) {
  const uploadId = req.headers['x-upload-id'] as string;
  const contentLength = parseInt(req.headers['content-length'] || '0');
  
  if (uploadId && contentLength > 0) {
    let bytesReceived = 0;
    
    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      
      // Update progress
      const progress = uploadProgress.get(uploadId);
      if (progress) {
        progress.uploadedSize = bytesReceived;
        
        // Emit progress event (in production, use WebSocket or SSE)
        logger.debug(`Upload progress: ${uploadId} - ${bytesReceived}/${contentLength}`);
      }
    });
  }
  
  next();
}

/**
 * Initialize chunked upload
 */
export async function initializeChunkedUpload(
  filename: string,
  totalSize: number,
  totalChunks: number
): Promise<string> {
  const uploadId = crypto.randomBytes(16).toString('hex');
  
  uploadProgress.set(uploadId, {
    uploadId,
    filename,
    totalSize,
    uploadedSize: 0,
    chunks: [],
    completed: false,
    createdAt: new Date()
  });
  
  // Create temporary directory for chunks
  const tempDir = path.join(process.cwd(), 'temp', 'uploads', uploadId);
  await fs.mkdir(tempDir, { recursive: true });
  
  logger.info(`Initialized chunked upload: ${uploadId} for ${filename}`);
  
  return uploadId;
}

/**
 * Handle chunk upload
 */
export async function handleChunkUpload(
  uploadId: string,
  chunkNumber: number,
  chunkData: Buffer
): Promise<{ completed: boolean; missingChunks?: number[] }> {
  const progress = uploadProgress.get(uploadId);
  if (!progress) {
    throw new Error('Upload not found');
  }
  
  // Save chunk to temporary file
  const tempDir = path.join(process.cwd(), 'temp', 'uploads', uploadId);
  const chunkPath = path.join(tempDir, `chunk-${chunkNumber}`);
  await fs.writeFile(chunkPath, chunkData);
  
  // Update progress
  progress.chunks.push(chunkNumber);
  progress.uploadedSize += chunkData.length;
  
  // Check if all chunks are uploaded
  const totalChunks = Math.ceil(progress.totalSize / (10 * 1024 * 1024)); // 10MB chunks
  const missingChunks = [];
  
  for (let i = 0; i < totalChunks; i++) {
    if (!progress.chunks.includes(i)) {
      missingChunks.push(i);
    }
  }
  
  if (missingChunks.length === 0) {
    progress.completed = true;
  }
  
  return {
    completed: progress.completed,
    missingChunks: missingChunks.length > 0 ? missingChunks : undefined
  };
}

/**
 * Assemble chunks into final file
 */
export async function assembleChunks(uploadId: string): Promise<Buffer> {
  const progress = uploadProgress.get(uploadId);
  if (!progress || !progress.completed) {
    throw new Error('Upload not completed');
  }
  
  const tempDir = path.join(process.cwd(), 'temp', 'uploads', uploadId);
  const chunks: Buffer[] = [];
  
  // Read and concatenate all chunks in order
  const sortedChunks = progress.chunks.sort((a, b) => a - b);
  for (const chunkNumber of sortedChunks) {
    const chunkPath = path.join(tempDir, `chunk-${chunkNumber}`);
    const chunkData = await fs.readFile(chunkPath);
    chunks.push(chunkData);
  }
  
  // Clean up temporary files
  await fs.rm(tempDir, { recursive: true, force: true });
  uploadProgress.delete(uploadId);
  
  return Buffer.concat(chunks);
}

/**
 * Get upload progress
 */
export function getUploadProgress(uploadId: string): UploadProgress | null {
  return uploadProgress.get(uploadId) || null;
}

/**
 * Configure multer for standard and chunked uploads
 */
export const uploadConfig = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '1024') * 1024 * 1024 // MB to bytes
  },
  storage: multer.memoryStorage()
});

/**
 * Configure multer for chunk uploads (larger limit)
 */
export const chunkUploadConfig = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per chunk
  },
  storage: multer.memoryStorage()
});