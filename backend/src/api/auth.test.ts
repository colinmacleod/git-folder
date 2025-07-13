import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import authRouter from './auth';
import { authMiddleware } from '../middleware/auth';
import { User } from '../models';

// Mock passport
vi.mock('passport', () => ({
  default: {
    authenticate: vi.fn((strategy) => (req: any, res: any, next: any) => {
      if (strategy.includes('callback')) {
        // Simulate successful auth callback
        req.user = { id: 1, username: 'testuser' };
        return next();
      }
      // Simulate redirect to OAuth provider
      res.redirect(`/oauth/${strategy}`);
    })
  }
}));

describe('Auth API Endpoints', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    app.use(authMiddleware);
    app.use('/api/auth', authRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/auth/status', () => {
    it('should return authenticated status when user is logged in', async () => {
      // Create a test user
      const user = await User.query().insert({
        oauth_provider: 'test',
        oauth_id: 'status-test',
        email: 'status@test.com',
        username: 'statususer',
        display_name: 'Status User'
      });

      // Mock authenticated request
      app.use((req: any, res, next) => {
        req.user = user;
        req.isAuthenticated = true;
        next();
      });

      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          provider: user.oauth_provider
        }
      });
    });

    it('should return unauthenticated status when user is not logged in', async () => {
      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: false,
        user: null
      });
    });
  });

  describe('POST /api/auth/dev-login', () => {
    it('should login in dev mode', async () => {
      process.env.AUTH_MODE = 'dev';

      const devUser = await User.query().insert({
        oauth_provider: 'dev',
        oauth_id: 'dev-user',
        email: 'dev@localhost',
        username: 'devuser',
        display_name: 'Development User'
      });

      // Mock the auth middleware behavior for dev mode
      app.use((req: any, res, next) => {
        if (process.env.AUTH_MODE === 'dev') {
          req.user = devUser;
          req.isAuthenticated = true;
        }
        next();
      });

      const response = await request(app)
        .post('/api/auth/dev-login')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: {
          id: devUser.id,
          username: devUser.username,
          email: devUser.email,
          display_name: devUser.display_name
        }
      });
    });

    it('should reject dev login in production mode', async () => {
      process.env.AUTH_MODE = 'production';

      const response = await request(app)
        .post('/api/auth/dev-login')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Dev mode not enabled'
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should destroy session on logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toEqual({
        success: true
      });
    });

    it('should handle logout errors', async () => {
      // Mock session destroy to throw error
      app.use((req: any, res, next) => {
        req.session = {
          destroy: (cb: any) => cb(new Error('Session error'))
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to logout'
      });
    });
  });

  describe('OAuth routes', () => {
    it('should redirect to GitHub OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/github')
        .expect(302);

      expect(response.headers.location).toBe('/oauth/github');
    });

    it('should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302);

      expect(response.headers.location).toBe('/oauth/google');
    });

    it('should redirect to Discord OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/discord')
        .expect(302);

      expect(response.headers.location).toBe('/oauth/discord');
    });

    it('should handle OAuth callbacks', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';

      const response = await request(app)
        .get('/api/auth/github/callback')
        .expect(302);

      expect(response.headers.location).toBe('http://localhost:3000');
    });
  });
});