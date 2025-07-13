import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { User } from '../models';
import { logger } from '../utils/logger';
import { generateUserSSHKeys } from '../services/ssh';

// Serialize user ID to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.query().findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Helper to create or update user from OAuth profile
async function findOrCreateUser(
  provider: string,
  profile: any,
  accessToken: string,
  refreshToken: string
) {
  try {
    // Try to find existing user
    let user = await User.query()
      .where('oauth_provider', provider)
      .where('oauth_id', profile.id)
      .first();

    if (!user) {
      // Create new user
      const email = profile.emails?.[0]?.value || `${profile.id}@${provider}.local`;
      const username = profile.username || profile.displayName?.replace(/\s+/g, '') || profile.id;
      
      user = await User.query().insert({
        oauth_provider: provider,
        oauth_id: profile.id,
        email: email,
        username: username.toLowerCase(),
        display_name: profile.displayName || username,
        avatar_url: profile.photos?.[0]?.value || profile._json?.avatar_url || null
      });
      
      logger.info(`New user created: ${user.username} (${provider})`);
      
      // Generate SSH keys for new user
      await generateUserSSHKeys(user);
    } else {
      // Update existing user info
      await user.$query().patch({
        display_name: profile.displayName || user.display_name,
        avatar_url: profile.photos?.[0]?.value || profile._json?.avatar_url || user.avatar_url
      });
    }

    return user;
  } catch (error) {
    logger.error('Error in findOrCreateUser:', error);
    throw error;
  }
}

// GitHub Strategy
if (process.env.OAUTH_GITHUB_CLIENT_ID && process.env.OAUTH_GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.OAUTH_GITHUB_CLIENT_ID,
    clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/github/callback`
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const user = await findOrCreateUser('github', profile, accessToken, refreshToken);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// Google Strategy
if (process.env.OAUTH_GOOGLE_CLIENT_ID && process.env.OAUTH_GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/google/callback`
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const user = await findOrCreateUser('google', profile, accessToken, refreshToken);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// Discord Strategy
if (process.env.OAUTH_DISCORD_CLIENT_ID && process.env.OAUTH_DISCORD_CLIENT_SECRET) {
  passport.use(new DiscordStrategy({
    clientID: process.env.OAUTH_DISCORD_CLIENT_ID,
    clientSecret: process.env.OAUTH_DISCORD_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/discord/callback`,
    scope: ['identify', 'email']
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const user = await findOrCreateUser('discord', profile, accessToken, refreshToken);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

export default passport;