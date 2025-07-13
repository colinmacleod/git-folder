import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, requireAuth, optionalAuth, AuthRequest } from './auth';
import { User } from '../models';

// Mock the User model
vi.mock('../models', () => ({
  User: {
    query: vi.fn()
  }
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      session: {}
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should create dev user in dev mode', async () => {
      process.env.AUTH_MODE = 'dev';
      
      const mockDevUser = {
        id: 1,
        oauth_provider: 'dev',
        oauth_id: 'dev-user',
        email: 'dev@localhost',
        username: 'devuser',
        display_name: 'Development User'
      };

      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockDevUser)
      };

      (User.query as any).mockReturnValue(mockQuery);

      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockDevUser);
      expect(mockReq.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create new dev user if not exists', async () => {
      process.env.AUTH_MODE = 'dev';
      
      const mockNewUser = {
        id: 2,
        oauth_provider: 'dev',
        oauth_id: 'dev-user',
        email: 'dev@localhost',
        username: 'devuser',
        display_name: 'Development User'
      };

      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        insert: vi.fn().mockResolvedValue(mockNewUser)
      };

      (User.query as any).mockReturnValue(mockQuery);

      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockQuery.insert).toHaveBeenCalledWith({
        oauth_provider: 'dev',
        oauth_id: 'dev-user',
        email: 'dev@localhost',
        username: 'devuser',
        display_name: 'Development User'
      });
      expect(mockReq.user).toEqual(mockNewUser);
      expect(mockReq.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should check session in production mode', async () => {
      process.env.AUTH_MODE = 'production';
      
      const mockUser = {
        id: 3,
        username: 'sessionuser'
      };

      (mockReq.session as any).userId = 3;

      const mockQuery = {
        findById: vi.fn().mockResolvedValue(mockUser)
      };

      (User.query as any).mockReturnValue(mockQuery);

      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockQuery.findById).toHaveBeenCalledWith(3);
      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.isAuthenticated).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set isAuthenticated to false when no session', async () => {
      process.env.AUTH_MODE = 'production';
      
      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.isAuthenticated).toBe(false);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      process.env.AUTH_MODE = 'dev';
      
      (User.query as any).mockImplementation(() => {
        throw new Error('Database error');
      });

      await authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.isAuthenticated).toBe(false);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should call next if authenticated', () => {
      mockReq.isAuthenticated = true;
      
      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', () => {
      mockReq.isAuthenticated = false;
      
      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should always call next', () => {
      mockReq.isAuthenticated = false;
      
      optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      
      mockReq.isAuthenticated = true;
      mockNext.mockClear();
      
      optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});