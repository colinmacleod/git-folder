import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { gitCommand, GitError } from './GitCommand';
import { Repository, SharedFolder, User, FileOperation } from '../../models';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: Date;
}

export interface FileOperationOptions {
  message?: string;
  author?: string;
}

export class FileOperationsService {
  /**
   * List files in a folder
   */
  async listFiles(repository: Repository, folderPath: string = '/'): Promise<FileInfo[]> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const absolutePath = path.join(repository.local_path, folderPath);
    
    try {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        // Skip .git directory
        if (entry.name === '.git') continue;

        const fullPath = path.join(absolutePath, entry.name);
        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(repository.local_path, fullPath);

        files.push({
          name: entry.name,
          path: relativePath,
          size: stats.size,
          isDirectory: entry.isDirectory(),
          lastModified: stats.mtime
        });
      }

      return files.sort((a, b) => {
        // Directories first, then alphabetical
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Folder not found');
      }
      throw error;
    }
  }

  /**
   * Upload a file to repository
   */
  async uploadFile(
    repository: Repository,
    filePath: string,
    fileStream: NodeJS.ReadableStream,
    fileSize: number,
    user: User,
    options: FileOperationOptions = {}
  ): Promise<void> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const absolutePath = path.join(repository.local_path, filePath);
    const directory = path.dirname(absolutePath);

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Check if file should be tracked by LFS
    const shouldUseLfs = await this.shouldUseLfs(fileSize, filePath, repository.local_path);
    
    if (shouldUseLfs) {
      // Ensure the file extension is tracked by LFS
      const ext = path.extname(filePath).toLowerCase();
      if (ext) {
        await this.ensureLfsTracking(`*${ext}`, repository.local_path);
      }
    }

    // Write file
    const writeStream = createWriteStream(absolutePath);
    await pipeline(fileStream, writeStream);

    // Add to git
    await gitCommand.add(filePath, { cwd: repository.local_path });

    // Commit
    const message = options.message || `Upload ${path.basename(filePath)}`;
    const author = options.author || `${user.display_name || user.username} <${user.email}>`;
    
    try {
      await gitCommand.commit(message, {
        cwd: repository.local_path,
        author
      });
    } catch (error) {
      // If nothing to commit, that's ok
      if (!error.message.includes('nothing to commit')) {
        throw error;
      }
    }

    logger.info(`File uploaded: ${filePath} to repository ${repository.name}`);
  }

  /**
   * Download a file from repository
   */
  async downloadFile(
    repository: Repository,
    filePath: string
  ): Promise<{ stream: NodeJS.ReadableStream; size: number; filename: string }> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const absolutePath = path.join(repository.local_path, filePath);
    
    try {
      const stats = await fs.stat(absolutePath);
      
      if (stats.isDirectory()) {
        throw new Error('Cannot download a directory');
      }

      const stream = createReadStream(absolutePath);
      const filename = path.basename(filePath);

      return {
        stream,
        size: stats.size,
        filename
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteFile(
    repository: Repository,
    filePath: string,
    user: User,
    options: FileOperationOptions = {}
  ): Promise<void> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const absolutePath = path.join(repository.local_path, filePath);
    
    // Check if path exists
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error('File or folder not found');
    }

    // Remove from git
    await gitCommand.execute(['rm', '-r', filePath], { cwd: repository.local_path });

    // Commit
    const message = options.message || `Delete ${path.basename(filePath)}`;
    const author = options.author || `${user.display_name || user.username} <${user.email}>`;
    
    await gitCommand.commit(message, {
      cwd: repository.local_path,
      author
    });

    logger.info(`File deleted: ${filePath} from repository ${repository.name}`);
  }

  /**
   * Move or rename a file
   */
  async moveFile(
    repository: Repository,
    sourcePath: string,
    destinationPath: string,
    user: User,
    options: FileOperationOptions = {}
  ): Promise<void> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const absoluteSource = path.join(repository.local_path, sourcePath);
    const absoluteDestination = path.join(repository.local_path, destinationPath);
    
    // Check if source exists
    try {
      await fs.access(absoluteSource);
    } catch {
      throw new Error('Source file or folder not found');
    }

    // Ensure destination directory exists
    const destDir = path.dirname(absoluteDestination);
    await fs.mkdir(destDir, { recursive: true });

    // Use git mv
    await gitCommand.execute(['mv', sourcePath, destinationPath], { cwd: repository.local_path });

    // Commit
    const message = options.message || `Move ${path.basename(sourcePath)} to ${destinationPath}`;
    const author = options.author || `${user.display_name || user.username} <${user.email}>`;
    
    await gitCommand.commit(message, {
      cwd: repository.local_path,
      author
    });

    logger.info(`File moved: ${sourcePath} to ${destinationPath} in repository ${repository.name}`);
  }

  /**
   * Get file version history
   */
  async getFileHistory(
    repository: Repository,
    filePath: string,
    limit: number = 20
  ): Promise<any[]> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const result = await gitCommand.execute([
      'log',
      `--max-count=${limit}`,
      '--pretty=format:%H|%an|%ae|%at|%s',
      '--',
      filePath
    ], { cwd: repository.local_path });

    if (result.exitCode !== 0) {
      throw new GitError(`Failed to get file history: ${result.stderr}`, 'HISTORY_FAILED');
    }

    const commits = result.stdout.split('\n').filter(Boolean).map(line => {
      const [hash, author, email, timestamp, message] = line.split('|');
      return {
        hash,
        author,
        email,
        date: new Date(parseInt(timestamp) * 1000),
        message
      };
    });

    return commits;
  }

  /**
   * Get file content at specific version
   */
  async getFileAtVersion(
    repository: Repository,
    filePath: string,
    commitHash: string
  ): Promise<Buffer> {
    if (!repository.local_path) {
      throw new Error('Repository local path not set');
    }

    const result = await gitCommand.execute([
      'show',
      `${commitHash}:${filePath}`
    ], { cwd: repository.local_path });

    if (result.exitCode !== 0) {
      if (result.stderr.includes('does not exist')) {
        throw new Error('File not found in this version');
      }
      throw new GitError(`Failed to get file version: ${result.stderr}`, 'VERSION_FAILED');
    }

    return Buffer.from(result.stdout);
  }

  /**
   * Check if file should use LFS
   */
  private async shouldUseLfs(fileSize: number, filePath: string, repoPath: string): Promise<boolean> {
    // Check if LFS is installed
    if (!await gitCommand.isLfsInstalled()) {
      return false;
    }

    // Check size threshold
    const lfsThreshold = parseInt(process.env.LFS_THRESHOLD || '50') * 1024 * 1024; // Default 50MB
    if (fileSize > lfsThreshold) {
      return true;
    }

    // Check if file type is already tracked
    const trackedPatterns = await gitCommand.lfsTrackedPatterns({ cwd: repoPath });
    const fileName = path.basename(filePath);
    
    for (const pattern of trackedPatterns) {
      if (this.matchesPattern(fileName, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Ensure file pattern is tracked by LFS
   */
  private async ensureLfsTracking(pattern: string, repoPath: string): Promise<void> {
    const trackedPatterns = await gitCommand.lfsTrackedPatterns({ cwd: repoPath });
    
    if (!trackedPatterns.includes(pattern)) {
      await gitCommand.lfsTrack(pattern, { cwd: repoPath });
      await gitCommand.add('.gitattributes', { cwd: repoPath });
    }
  }

  /**
   * Check if filename matches pattern (simple glob)
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple pattern matching for *.ext patterns
    if (pattern.startsWith('*')) {
      const ext = pattern.substring(1);
      return filename.endsWith(ext);
    }
    return filename === pattern;
  }

  /**
   * Log file operation to database
   */
  async logOperation(
    sharedFolderId: number,
    userId: number | null,
    operationType: 'upload' | 'download' | 'delete' | 'rename',
    filePath: string,
    fileSize?: number,
    commitHash?: string,
    commitMessage?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await FileOperation.query().insert({
      shared_folder_id: sharedFolderId,
      user_id: userId,
      operation_type: operationType,
      file_path: filePath,
      file_size: fileSize,
      commit_hash: commitHash,
      commit_message: commitMessage,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }
}

// Export singleton instance
export const fileOperationsService = new FileOperationsService();