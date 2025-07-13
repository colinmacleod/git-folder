import { describe, it, expect, beforeEach } from 'vitest';
import { User } from './User';
import { Repository } from './Repository';
import { ValidationError } from 'objection';

describe('User Model', () => {
  describe('basic CRUD operations', () => {
    it('should create a new user', async () => {
      const user = await User.query().insert({
        oauth_provider: 'github',
        oauth_id: 'github-123',
        email: 'test@github.com',
        username: 'githubuser',
        display_name: 'GitHub User'
      });

      expect(user.id).toBeTruthy();
      expect(user.oauth_provider).toBe('github');
      expect(user.oauth_id).toBe('github-123');
      expect(user.email).toBe('test@github.com');
      expect(user.username).toBe('githubuser');
      expect(user.created_at).toBeTruthy();
      expect(user.updated_at).toBeTruthy();
    });

    it('should find user by id', async () => {
      const created = await User.query().insert({
        oauth_provider: 'google',
        oauth_id: 'google-456',
        email: 'test@google.com',
        username: 'googleuser'
      });

      const found = await User.query().findById(created.id);
      
      expect(found).toBeTruthy();
      expect(found!.id).toBe(created.id);
      expect(found!.username).toBe('googleuser');
    });

    it('should update user', async () => {
      const user = await User.query().insert({
        oauth_provider: 'discord',
        oauth_id: 'discord-789',
        email: 'test@discord.com',
        username: 'discorduser'
      });

      const updated = await user.$query().patchAndFetch({
        display_name: 'Updated Discord User',
        avatar_url: 'https://example.com/avatar.png'
      });

      expect(updated.display_name).toBe('Updated Discord User');
      expect(updated.avatar_url).toBe('https://example.com/avatar.png');
    });

    it('should delete user', async () => {
      const user = await User.query().insert({
        oauth_provider: 'test',
        oauth_id: 'test-delete',
        email: 'delete@test.com',
        username: 'deleteuser'
      });

      await user.$query().delete();

      const found = await User.query().findById(user.id);
      expect(found).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should require oauth_provider', async () => {
      await expect(
        User.query().insert({
          oauth_id: 'test-123',
          email: 'test@test.com',
          username: 'testuser'
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should require oauth_id', async () => {
      await expect(
        User.query().insert({
          oauth_provider: 'test',
          email: 'test@test.com',
          username: 'testuser'
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should require email', async () => {
      await expect(
        User.query().insert({
          oauth_provider: 'test',
          oauth_id: 'test-123',
          username: 'testuser'
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should require username', async () => {
      await expect(
        User.query().insert({
          oauth_provider: 'test',
          oauth_id: 'test-123',
          email: 'test@test.com'
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce max length on oauth_provider', async () => {
      await expect(
        User.query().insert({
          oauth_provider: 'a'.repeat(21), // max is 20
          oauth_id: 'test-123',
          email: 'test@test.com',
          username: 'testuser'
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('unique constraints', () => {
    it('should enforce unique oauth_provider + oauth_id', async () => {
      await User.query().insert({
        oauth_provider: 'github',
        oauth_id: 'unique-123',
        email: 'first@test.com',
        username: 'firstuser'
      });

      await expect(
        User.query().insert({
          oauth_provider: 'github',
          oauth_id: 'unique-123',
          email: 'second@test.com',
          username: 'seconduser'
        })
      ).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      await User.query().insert({
        oauth_provider: 'github',
        oauth_id: 'email-1',
        email: 'unique@test.com',
        username: 'user1'
      });

      await expect(
        User.query().insert({
          oauth_provider: 'google',
          oauth_id: 'email-2',
          email: 'unique@test.com',
          username: 'user2'
        })
      ).rejects.toThrow();
    });
  });

  describe('relationships', () => {
    it('should fetch user with repositories', async () => {
      const user = await User.query().insert({
        oauth_provider: 'github',
        oauth_id: 'rel-123',
        email: 'rel@test.com',
        username: 'reluser'
      });

      await Repository.query().insert({
        name: 'test-repo',
        git_url: 'https://github.com/test/repo.git',
        owner_id: user.id
      });

      const userWithRepos = await User.query()
        .findById(user.id)
        .withGraphFetched('repositories');

      expect(userWithRepos!.repositories).toBeTruthy();
      expect(userWithRepos!.repositories!.length).toBe(1);
      expect(userWithRepos!.repositories![0].name).toBe('test-repo');
    });
  });

  describe('timestamps', () => {
    it('should auto-set created_at and updated_at on insert', async () => {
      const before = new Date();
      
      const user = await User.query().insert({
        oauth_provider: 'test',
        oauth_id: 'timestamp-1',
        email: 'timestamp@test.com',
        username: 'timestampuser'
      });

      const after = new Date();

      expect(user.created_at).toBeTruthy();
      expect(user.updated_at).toBeTruthy();
      expect(new Date(user.created_at).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(user.created_at).getTime()).toBeLessThanOrEqual(after.getTime());
      expect(user.created_at).toEqual(user.updated_at);
    });

    it('should update updated_at on update', async () => {
      const user = await User.query().insert({
        oauth_provider: 'test',
        oauth_id: 'timestamp-2',
        email: 'timestamp2@test.com',
        username: 'timestampuser2'
      });

      const originalUpdatedAt = user.updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await user.$query().patch({ display_name: 'Updated' });

      const updated = await User.query().findById(user.id);
      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });
});