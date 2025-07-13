import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

export interface AuthRequest extends Request {
  user?: User;
  isAuthenticated?: boolean;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Check if we're in dev mode
    if (process.env.AUTH_MODE === 'dev') {
      // In dev mode, create/get a default dev user
      let devUser = await User.query()
        .where('oauth_provider', 'dev')
        .where('oauth_id', 'dev-user')
        .first();

      if (!devUser) {
        devUser = await User.query().insert({
          oauth_provider: 'dev',
          oauth_id: 'dev-user',
          email: 'dev@localhost',
          username: 'devuser',
          display_name: 'Development User'
        });
      }

      req.user = devUser;
      req.isAuthenticated = true;
      return next();
    }

    // In production mode, check session
    if (req.session && (req.session as any).userId) {
      const user = await User.query().findById((req.session as any).userId);
      if (user) {
        req.user = user;
        req.isAuthenticated = true;
        return next();
      }
    }

    // Not authenticated
    req.isAuthenticated = false;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.isAuthenticated = false;
    next();
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // Just continue - auth status has already been determined
  next();
}