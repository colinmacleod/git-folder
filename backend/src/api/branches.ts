import express from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { repositoryService } from '../services/git/RepositoryService';
import { branchService } from '../services/git/BranchService';
import { logger } from '../utils/logger';

const router = express.Router();

// List branches in repository
router.get('/repositories/:repoId/branches', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    
    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const branches = await branchService.listBranches(repository);
    
    res.json({ branches });
  } catch (error) {
    logger.error('Error listing branches:', error);
    res.status(500).json({ error: 'Failed to list branches' });
  }
});

// Create new branch
router.post('/repositories/:repoId/branches', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const { name, from } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await branchService.createBranch(repository, name, from);
    
    res.json({ success: true, message: `Branch ${name} created` });
  } catch (error) {
    logger.error('Error creating branch:', error);
    if (error.message.includes('Invalid branch name')) {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Branch already exists') {
      res.status(409).json({ error: 'Branch already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create branch' });
    }
  }
});

// Switch branch
router.post('/repositories/:repoId/branches/switch', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const { branch } = req.body;
    
    if (!branch) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await branchService.switchBranch(repository, branch);
    
    res.json({ success: true, message: `Switched to branch ${branch}` });
  } catch (error) {
    logger.error('Error switching branch:', error);
    if (error.message === 'Branch not found') {
      res.status(404).json({ error: 'Branch not found' });
    } else if (error.message.includes('uncommitted changes')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to switch branch' });
    }
  }
});

// Delete branch
router.delete('/repositories/:repoId/branches/:branchName', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const branchName = req.params.branchName;
    const force = req.query.force === 'true';

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await branchService.deleteBranch(repository, branchName, force);
    
    res.json({ success: true, message: `Branch ${branchName} deleted` });
  } catch (error) {
    logger.error('Error deleting branch:', error);
    if (error.message === 'Branch not found') {
      res.status(404).json({ error: 'Branch not found' });
    } else if (error.message.includes('Cannot delete')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('unmerged changes')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  }
});

// Merge branch
router.post('/repositories/:repoId/branches/merge', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const { source, message } = req.body;
    
    if (!source) {
      return res.status(400).json({ error: 'Source branch is required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await branchService.mergeBranch(repository, source, message);
    
    res.json({ success: true, message: `Branch ${source} merged successfully` });
  } catch (error) {
    logger.error('Error merging branch:', error);
    if (error.message === 'Source branch not found') {
      res.status(404).json({ error: 'Source branch not found' });
    } else if (error.message.includes('conflict')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to merge branch' });
    }
  }
});

// Compare branches
router.get('/repositories/:repoId/branches/compare', requireAuth, async (req: AuthRequest, res) => {
  try {
    const repoId = parseInt(req.params.repoId);
    const branch1 = req.query.branch1 as string;
    const branch2 = req.query.branch2 as string;
    
    if (!branch1 || !branch2) {
      return res.status(400).json({ error: 'Both branch1 and branch2 are required' });
    }

    const repository = await repositoryService.getRepository(repoId, req.user!.id);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const comparison = await branchService.compareBranches(repository, branch1, branch2);
    
    res.json({ 
      branch1,
      branch2,
      comparison 
    });
  } catch (error) {
    logger.error('Error comparing branches:', error);
    res.status(500).json({ error: 'Failed to compare branches' });
  }
});

export default router;