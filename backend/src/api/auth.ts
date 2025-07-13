import express from 'express';
import passport from 'passport';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get current auth status
router.get('/status', (req: AuthRequest, res) => {
  if (req.isAuthenticated && req.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        display_name: req.user.display_name,
        avatar_url: req.user.avatar_url,
        provider: req.user.oauth_provider
      }
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});

// Dev mode login
router.post('/dev-login', async (req: AuthRequest, res) => {
  if (process.env.AUTH_MODE !== 'dev') {
    return res.status(403).json({ error: 'Dev mode not enabled' });
  }

  if (req.user && req.session) {
    (req.session as any).userId = req.user.id;
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        display_name: req.user.display_name
      }
    });
  } else {
    res.status(500).json({ error: 'Failed to create dev session' });
  }
});

// Logout
router.post('/logout', (req: AuthRequest, res) => {
  req.session?.destroy((err) => {
    if (err) {
      logger.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// OAuth routes
// GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.FRONTEND_URL || '/');
  }
);

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.FRONTEND_URL || '/');
  }
);

// Discord
router.get('/discord', passport.authenticate('discord'));
router.get('/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.FRONTEND_URL || '/');
  }
);

export default router;