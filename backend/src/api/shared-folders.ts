import express from 'express';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth';
import { Repository, SharedFolder, FolderPermission } from '../models';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = express.Router();

// List user's shared folders
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Get all shared folders where user has permissions
    const sharedFolders = await SharedFolder.query()
      .join('folder_permissions', 'shared_folders.id', 'folder_permissions.shared_folder_id')
      .where('folder_permissions.user_id', req.user!.id)
      .withGraphFetched('[repository]')
      .orderBy('shared_folders.created_at', 'desc');

    res.json({
      folders: sharedFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        folder_path: folder.folder_path,
        is_public: folder.is_public,
        public_token: folder.public_token,
        repository: {
          id: folder.repository.id,
          name: folder.repository.name
        },
        created_at: folder.created_at
      }))
    });
  } catch (error) {
    logger.error('Error listing shared folders:', error);
    res.status(500).json({ error: 'Failed to list shared folders' });
  }
});

// Create shared folder
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { repository_id, folder_path, name, description, is_public, commit_message_required } = req.body;

    if (!repository_id || !folder_path || !name) {
      return res.status(400).json({ error: 'Repository ID, folder path, and name are required' });
    }

    // Verify user owns the repository
    const repository = await Repository.query()
      .findById(repository_id)
      .where('owner_id', req.user!.id);

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Create shared folder
    const sharedFolder = await SharedFolder.query().insert({
      repository_id,
      folder_path: folder_path.startsWith('/') ? folder_path : `/${folder_path}`,
      name,
      description: description || '',
      is_public: is_public || false,
      public_token: is_public ? crypto.randomBytes(32).toString('hex') : null,
      commit_message_required: commit_message_required || false
    });

    // Grant admin permission to creator
    await FolderPermission.query().insert({
      shared_folder_id: sharedFolder.id,
      user_id: req.user!.id,
      permission_level: 'admin',
      granted_by: req.user!.id
    });

    res.status(201).json({
      id: sharedFolder.id,
      name: sharedFolder.name,
      folder_path: sharedFolder.folder_path,
      is_public: sharedFolder.is_public,
      public_token: sharedFolder.public_token,
      created_at: sharedFolder.created_at
    });
  } catch (error) {
    logger.error('Error creating shared folder:', error);
    res.status(500).json({ error: 'Failed to create shared folder' });
  }
});

// Get shared folder details
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const folderId = parseInt(req.params.id);

    // Check if user has permission
    const permission = await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('user_id', req.user!.id)
      .first();

    if (!permission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sharedFolder = await SharedFolder.query()
      .findById(folderId)
      .withGraphFetched('[repository, permissions.[user]]');

    if (!sharedFolder) {
      return res.status(404).json({ error: 'Shared folder not found' });
    }

    res.json({
      id: sharedFolder.id,
      name: sharedFolder.name,
      description: sharedFolder.description,
      folder_path: sharedFolder.folder_path,
      is_public: sharedFolder.is_public,
      public_token: sharedFolder.public_token,
      commit_message_required: sharedFolder.commit_message_required,
      repository: {
        id: sharedFolder.repository.id,
        name: sharedFolder.repository.name
      },
      permissions: sharedFolder.permissions?.map(perm => ({
        user: {
          id: perm.user.id,
          username: perm.user.username,
          display_name: perm.user.display_name
        },
        permission_level: perm.permission_level,
        created_at: perm.created_at
      })),
      user_permission: permission.permission_level,
      created_at: sharedFolder.created_at
    });
  } catch (error) {
    logger.error('Error getting shared folder:', error);
    res.status(500).json({ error: 'Failed to get shared folder' });
  }
});

// Update shared folder
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const { name, description, is_public, commit_message_required } = req.body;

    // Check if user has admin permission
    const permission = await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('user_id', req.user!.id)
      .where('permission_level', 'admin')
      .first();

    if (!permission) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (commit_message_required !== undefined) updates.commit_message_required = commit_message_required;
    
    if (is_public !== undefined) {
      updates.is_public = is_public;
      if (is_public && !req.body.public_token) {
        updates.public_token = crypto.randomBytes(32).toString('hex');
      } else if (!is_public) {
        updates.public_token = null;
      }
    }

    const sharedFolder = await SharedFolder.query()
      .patchAndFetchById(folderId, updates);

    res.json({
      id: sharedFolder.id,
      name: sharedFolder.name,
      description: sharedFolder.description,
      is_public: sharedFolder.is_public,
      public_token: sharedFolder.public_token,
      commit_message_required: sharedFolder.commit_message_required
    });
  } catch (error) {
    logger.error('Error updating shared folder:', error);
    res.status(500).json({ error: 'Failed to update shared folder' });
  }
});

// Delete shared folder
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const folderId = parseInt(req.params.id);

    // Check if user has admin permission
    const permission = await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('user_id', req.user!.id)
      .where('permission_level', 'admin')
      .first();

    if (!permission) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await SharedFolder.query().deleteById(folderId);

    res.json({ success: true, message: 'Shared folder deleted' });
  } catch (error) {
    logger.error('Error deleting shared folder:', error);
    res.status(500).json({ error: 'Failed to delete shared folder' });
  }
});

// Grant permission to user
router.post('/:id/permissions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const { user_id, permission_level } = req.body;

    if (!user_id || !permission_level) {
      return res.status(400).json({ error: 'User ID and permission level are required' });
    }

    if (!['viewer', 'contributor', 'admin'].includes(permission_level)) {
      return res.status(400).json({ error: 'Invalid permission level' });
    }

    // Check if requester has admin permission
    const adminPermission = await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('user_id', req.user!.id)
      .where('permission_level', 'admin')
      .first();

    if (!adminPermission) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if permission already exists
    const existing = await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('user_id', user_id)
      .first();

    if (existing) {
      // Update existing permission
      await existing.$query().patch({ permission_level });
    } else {
      // Create new permission
      await FolderPermission.query().insert({
        shared_folder_id: folderId,
        user_id,
        permission_level,
        granted_by: req.user!.id
      });
    }

    res.json({ success: true, message: 'Permission granted' });
  } catch (error) {
    logger.error('Error granting permission:', error);
    res.status(500).json({ error: 'Failed to grant permission' });
  }
});

// Revoke permission
router.delete('/:id/permissions/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    // Check if requester has admin permission
    const adminPermission = await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('user_id', req.user!.id)
      .where('permission_level', 'admin')
      .first();

    if (!adminPermission) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Don't allow removing last admin
    const adminCount = await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('permission_level', 'admin')
      .count('* as count');

    if (adminCount[0].count === 1) {
      const targetPermission = await FolderPermission.query()
        .where('shared_folder_id', folderId)
        .where('user_id', userId)
        .first();

      if (targetPermission?.permission_level === 'admin') {
        return res.status(400).json({ error: 'Cannot remove last admin' });
      }
    }

    await FolderPermission.query()
      .where('shared_folder_id', folderId)
      .where('user_id', userId)
      .delete();

    res.json({ success: true, message: 'Permission revoked' });
  } catch (error) {
    logger.error('Error revoking permission:', error);
    res.status(500).json({ error: 'Failed to revoke permission' });
  }
});

// Public access endpoint (no auth required)
router.get('/public/:token', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const token = req.params.token;

    const sharedFolder = await SharedFolder.query()
      .where('public_token', token)
      .where('is_public', true)
      .withGraphFetched('[repository]')
      .first();

    if (!sharedFolder) {
      return res.status(404).json({ error: 'Public folder not found' });
    }

    res.json({
      id: sharedFolder.id,
      name: sharedFolder.name,
      description: sharedFolder.description,
      folder_path: sharedFolder.folder_path,
      repository: {
        id: sharedFolder.repository.id,
        name: sharedFolder.repository.name
      },
      is_authenticated: req.isAuthenticated || false,
      commit_message_required: sharedFolder.commit_message_required
    });
  } catch (error) {
    logger.error('Error accessing public folder:', error);
    res.status(500).json({ error: 'Failed to access public folder' });
  }
});

export default router;