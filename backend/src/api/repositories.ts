import express from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { repositoryService } from '../services/git/RepositoryService';
import { logger } from '../utils/logger';

const router = express.Router();

// Initialize repository service on startup
repositoryService.initialize().catch(err => {
  logger.error('Failed to initialize repository service:', err);
});

// List user's repositories
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repositories = await repositoryService.listUserRepositories(req.user!.id);
    
    res.json({
      repositories: repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        git_url: repo.git_url,
        is_active: repo.is_active,
        created_at: repo.created_at,
        updated_at: repo.updated_at
      }))
    });
  } catch (error) {
    logger.error('Error listing repositories:', error);
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

// Get repository details
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repositoryId = parseInt(req.params.id);
    const info = await repositoryService.getRepositoryInfo(repositoryId, req.user!.id);
    
    res.json(info);
  } catch (error) {
    logger.error('Error getting repository info:', error);
    if (error.message === 'Repository not found') {
      res.status(404).json({ error: 'Repository not found' });
    } else {
      res.status(500).json({ error: 'Failed to get repository info' });
    }
  }
});

// Create new repository
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, description, git_url } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }
    
    const repository = await repositoryService.createRepository(
      req.user!,
      name,
      git_url,
      description
    );
    
    res.status(201).json({
      id: repository.id,
      name: repository.name,
      description: repository.description,
      git_url: repository.git_url,
      created_at: repository.created_at
    });
  } catch (error) {
    logger.error('Error creating repository:', error);
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else if (error.message.includes('Invalid repository name')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create repository' });
    }
  }
});

// Initialize Git LFS for repository
router.post('/:id/lfs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repositoryId = parseInt(req.params.id);
    await repositoryService.initializeLfs(repositoryId, req.user!.id);
    
    res.json({ success: true, message: 'Git LFS initialized' });
  } catch (error) {
    logger.error('Error initializing LFS:', error);
    if (error.message === 'Repository not found') {
      res.status(404).json({ error: 'Repository not found' });
    } else if (error.message.includes('not installed')) {
      res.status(503).json({ error: 'Git LFS is not available on the server' });
    } else {
      res.status(500).json({ error: 'Failed to initialize Git LFS' });
    }
  }
});

// Delete repository
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repositoryId = parseInt(req.params.id);
    await repositoryService.deleteRepository(repositoryId, req.user!.id);
    
    res.json({ success: true, message: 'Repository deleted' });
  } catch (error) {
    logger.error('Error deleting repository:', error);
    if (error.message === 'Repository not found') {
      res.status(404).json({ error: 'Repository not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete repository' });
    }
  }
});

export default router;