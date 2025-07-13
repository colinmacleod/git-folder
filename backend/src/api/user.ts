import express from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { generateUserSSHKeys, getUserPrivateKey } from '../services/ssh';
import { logger } from '../utils/logger';

const router = express.Router();

// Get current user profile
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      display_name: req.user.display_name,
      avatar_url: req.user.avatar_url,
      provider: req.user.oauth_provider,
      has_ssh_key: !!req.user.ssh_public_key,
      ssh_public_key: req.user.ssh_public_key,
      created_at: req.user.created_at,
      updated_at: req.user.updated_at
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { display_name } = req.body;
    const updates: any = {};

    if (display_name && display_name !== req.user.display_name) {
      updates.display_name = display_name;
    }

    if (Object.keys(updates).length > 0) {
      await req.user.$query().patch(updates);
      logger.info(`User ${req.user.username} updated profile`);
    }

    res.json({ success: true, updates });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user preferences
router.get('/preferences', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, return default preferences
    // In future, these could be stored in a separate table or JSON column
    res.json({
      theme: 'dark',
      commit_message_required: false,
      default_commit_message: 'Updated files',
      email_notifications: true
    });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.patch('/preferences', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, just acknowledge the update
    // In future, store these in database
    const { theme, commit_message_required, default_commit_message, email_notifications } = req.body;
    
    logger.info(`User ${req.user.username} updated preferences`);
    res.json({ 
      success: true,
      preferences: {
        theme: theme || 'dark',
        commit_message_required: commit_message_required || false,
        default_commit_message: default_commit_message || 'Updated files',
        email_notifications: email_notifications !== false
      }
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// SSH Key Management

// Generate new SSH key
router.post('/ssh/generate', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await generateUserSSHKeys(req.user);
    
    // Reload user to get updated keys
    await req.user.$query();
    
    res.json({
      success: true,
      public_key: req.user.ssh_public_key
    });
  } catch (error) {
    logger.error('Error generating SSH key:', error);
    res.status(500).json({ error: 'Failed to generate SSH key' });
  }
});

// Upload custom SSH key
router.post('/ssh/upload', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { public_key, private_key } = req.body;

    if (!public_key || !private_key) {
      return res.status(400).json({ error: 'Both public and private keys are required' });
    }

    // Validate SSH key format
    if (!public_key.startsWith('ssh-rsa ') && !public_key.startsWith('ssh-ed25519 ')) {
      return res.status(400).json({ error: 'Invalid public key format' });
    }

    if (!private_key.includes('BEGIN') || !private_key.includes('PRIVATE KEY')) {
      return res.status(400).json({ error: 'Invalid private key format' });
    }

    // Encrypt the private key
    const { encrypt } = require('../services/ssh');
    const encryptionKey = `${process.env.SECRET_KEY}-${req.user.id}-${req.user.oauth_id}`;
    const encryptedPrivateKey = encrypt(private_key, encryptionKey);

    // Update user with new keys
    await req.user.$query().patch({
      ssh_public_key: public_key.trim(),
      ssh_private_key: encryptedPrivateKey
    });

    logger.info(`User ${req.user.username} uploaded custom SSH keys`);

    res.json({
      success: true,
      public_key: public_key.trim()
    });
  } catch (error) {
    logger.error('Error uploading SSH key:', error);
    res.status(500).json({ error: 'Failed to upload SSH key' });
  }
});

// Delete SSH key
router.delete('/ssh', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await req.user.$query().patch({
      ssh_public_key: null,
      ssh_private_key: null
    });

    logger.info(`User ${req.user.username} deleted SSH keys`);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting SSH key:', error);
    res.status(500).json({ error: 'Failed to delete SSH key' });
  }
});

// Download private key (one-time, for user backup)
router.get('/ssh/download-private', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!req.user.ssh_private_key) {
      return res.status(404).json({ error: 'No SSH key found' });
    }

    const privateKey = getUserPrivateKey(req.user);
    if (!privateKey) {
      return res.status(500).json({ error: 'Failed to decrypt private key' });
    }

    logger.info(`User ${req.user.username} downloaded private SSH key`);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="id_rsa_gitfolder_${req.user.username}"`);
    res.send(privateKey);
  } catch (error) {
    logger.error('Error downloading private key:', error);
    res.status(500).json({ error: 'Failed to download private key' });
  }
});

export default router;