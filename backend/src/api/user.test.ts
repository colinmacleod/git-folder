import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import userRouter from './user';
import { authMiddleware } from '../middleware/auth';
import { User } from '../models';
import * as sshService from '../services/ssh';

// Mock SSH service
vi.mock('../services/ssh', () => ({
  generateUserSSHKeys: vi.fn(),
  getUserPrivateKey: vi.fn(),
  encrypt: vi.fn((text) => `encrypted-${text}`)
}));

describe('User API Endpoints', () => {
  let app: Express;
  let testUser: User;

  beforeEach(async () => {
    // Create test user
    testUser = await User.query().insert({
      oauth_provider: 'test',
      oauth_id: 'user-api-test',
      email: 'userapi@test.com',
      username: 'userapitest',
      display_name: 'User API Test'
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    
    // Mock authenticated user
    app.use((req: any, res, next) => {
      req.user = testUser;
      req.isAuthenticated = true;
      next();
    });
    
    app.use(authMiddleware);
    app.use('/api/user', userRouter);
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        display_name: testUser.display_name,
        provider: testUser.oauth_provider,
        has_ssh_key: false
      });
    });

    it('should return 401 when not authenticated', async () => {
      // Override auth for this test
      app = express();
      app.use(express.json());
      app.use((req: any, res, next) => {
        req.isAuthenticated = false;
        next();
      });
      app.use('/api/user', userRouter);

      await request(app)
        .get('/api/user/profile')
        .expect(401);
    });
  });

  describe('PATCH /api/user/profile', () => {
    it('should update display name', async () => {
      const response = await request(app)
        .patch('/api/user/profile')
        .send({ display_name: 'Updated Name' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        updates: { display_name: 'Updated Name' }
      });

      const updated = await User.query().findById(testUser.id);
      expect(updated!.display_name).toBe('Updated Name');
    });

    it('should ignore empty updates', async () => {
      const response = await request(app)
        .patch('/api/user/profile')
        .send({})
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        updates: {}
      });
    });
  });

  describe('GET /api/user/preferences', () => {
    it('should return default preferences', async () => {
      const response = await request(app)
        .get('/api/user/preferences')
        .expect(200);

      expect(response.body).toEqual({
        theme: 'dark',
        commit_message_required: false,
        default_commit_message: 'Updated files',
        email_notifications: true
      });
    });
  });

  describe('PATCH /api/user/preferences', () => {
    it('should update preferences', async () => {
      const response = await request(app)
        .patch('/api/user/preferences')
        .send({
          theme: 'light',
          commit_message_required: true,
          default_commit_message: 'Custom message',
          email_notifications: false
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preferences: {
          theme: 'light',
          commit_message_required: true,
          default_commit_message: 'Custom message',
          email_notifications: false
        }
      });
    });
  });

  describe('SSH Key Management', () => {
    describe('POST /api/user/ssh/generate', () => {
      it('should generate new SSH keys', async () => {
        testUser.ssh_public_key = 'ssh-rsa AAAAB3...';
        (sshService.generateUserSSHKeys as any).mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/user/ssh/generate')
          .expect(200);

        expect(sshService.generateUserSSHKeys).toHaveBeenCalledWith(testUser);
        expect(response.body).toMatchObject({
          success: true,
          public_key: expect.stringContaining('ssh-rsa')
        });
      });
    });

    describe('POST /api/user/ssh/upload', () => {
      it('should upload custom SSH keys', async () => {
        const publicKey = 'ssh-rsa AAAAB3NzaC1yc2EA... user@host';
        const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';

        const response = await request(app)
          .post('/api/user/ssh/upload')
          .send({
            public_key: publicKey,
            private_key: privateKey
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          public_key: publicKey
        });

        const updated = await User.query().findById(testUser.id);
        expect(updated!.ssh_public_key).toBe(publicKey);
        expect(updated!.ssh_private_key).toContain('encrypted-');
      });

      it('should validate SSH key format', async () => {
        await request(app)
          .post('/api/user/ssh/upload')
          .send({
            public_key: 'invalid-key',
            private_key: '-----BEGIN RSA PRIVATE KEY-----'
          })
          .expect(400);

        await request(app)
          .post('/api/user/ssh/upload')
          .send({
            public_key: 'ssh-rsa AAAAB3...',
            private_key: 'invalid-private-key'
          })
          .expect(400);
      });

      it('should require both keys', async () => {
        await request(app)
          .post('/api/user/ssh/upload')
          .send({ public_key: 'ssh-rsa AAAAB3...' })
          .expect(400);
      });
    });

    describe('DELETE /api/user/ssh', () => {
      it('should delete SSH keys', async () => {
        await testUser.$query().patch({
          ssh_public_key: 'ssh-rsa AAAAB3...',
          ssh_private_key: 'encrypted-key'
        });

        const response = await request(app)
          .delete('/api/user/ssh')
          .expect(200);

        expect(response.body).toEqual({ success: true });

        const updated = await User.query().findById(testUser.id);
        expect(updated!.ssh_public_key).toBeNull();
        expect(updated!.ssh_private_key).toBeNull();
      });
    });

    describe('GET /api/user/ssh/download-private', () => {
      it('should download decrypted private key', async () => {
        await testUser.$query().patch({
          ssh_private_key: 'encrypted-key'
        });

        const decryptedKey = '-----BEGIN RSA PRIVATE KEY-----\nDecrypted...';
        (sshService.getUserPrivateKey as any).mockReturnValue(decryptedKey);

        const response = await request(app)
          .get('/api/user/ssh/download-private')
          .expect(200);

        expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain(testUser.username);
        expect(response.text).toBe(decryptedKey);
      });

      it('should return 404 if no SSH key exists', async () => {
        await request(app)
          .get('/api/user/ssh/download-private')
          .expect(404);
      });

      it('should return 500 if decryption fails', async () => {
        await testUser.$query().patch({
          ssh_private_key: 'encrypted-key'
        });

        (sshService.getUserPrivateKey as any).mockReturnValue(null);

        await request(app)
          .get('/api/user/ssh/download-private')
          .expect(500);
      });
    });
  });
});