import './database/connection';
import express from 'express';
import session from 'express-session';
import { authMiddleware, AuthRequest } from './middleware/auth';

const app = express();

// Session setup
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// Auth middleware
app.use(authMiddleware);

// Test route
app.get('/test', (req: AuthRequest, res) => {
  res.json({
    authenticated: req.isAuthenticated,
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      provider: req.user.oauth_provider
    } : null,
    authMode: process.env.AUTH_MODE
  });
});

// Start test server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`AUTH_MODE: ${process.env.AUTH_MODE}`);
  
  // Make test request
  setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/test`);
      const data = await response.json();
      console.log('\nTest response:', data);
      process.exit(0);
    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    }
  }, 1000);
});