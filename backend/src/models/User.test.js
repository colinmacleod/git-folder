"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const User_1 = require("./User");
const Repository_1 = require("./Repository");
const objection_1 = require("objection");
(0, vitest_1.describe)('User Model', () => {
    (0, vitest_1.describe)('basic CRUD operations', () => {
        (0, vitest_1.it)('should create a new user', async () => {
            const user = await User_1.User.query().insert({
                oauth_provider: 'github',
                oauth_id: 'github-123',
                email: 'test@github.com',
                username: 'githubuser',
                display_name: 'GitHub User'
            });
            (0, vitest_1.expect)(user.id).toBeTruthy();
            (0, vitest_1.expect)(user.oauth_provider).toBe('github');
            (0, vitest_1.expect)(user.oauth_id).toBe('github-123');
            (0, vitest_1.expect)(user.email).toBe('test@github.com');
            (0, vitest_1.expect)(user.username).toBe('githubuser');
            (0, vitest_1.expect)(user.created_at).toBeTruthy();
            (0, vitest_1.expect)(user.updated_at).toBeTruthy();
        });
        (0, vitest_1.it)('should find user by id', async () => {
            const created = await User_1.User.query().insert({
                oauth_provider: 'google',
                oauth_id: 'google-456',
                email: 'test@google.com',
                username: 'googleuser'
            });
            const found = await User_1.User.query().findById(created.id);
            (0, vitest_1.expect)(found).toBeTruthy();
            (0, vitest_1.expect)(found.id).toBe(created.id);
            (0, vitest_1.expect)(found.username).toBe('googleuser');
        });
        (0, vitest_1.it)('should update user', async () => {
            const user = await User_1.User.query().insert({
                oauth_provider: 'discord',
                oauth_id: 'discord-789',
                email: 'test@discord.com',
                username: 'discorduser'
            });
            const updated = await user.$query().patchAndFetch({
                display_name: 'Updated Discord User',
                avatar_url: 'https://example.com/avatar.png'
            });
            (0, vitest_1.expect)(updated.display_name).toBe('Updated Discord User');
            (0, vitest_1.expect)(updated.avatar_url).toBe('https://example.com/avatar.png');
        });
        (0, vitest_1.it)('should delete user', async () => {
            const user = await User_1.User.query().insert({
                oauth_provider: 'test',
                oauth_id: 'test-delete',
                email: 'delete@test.com',
                username: 'deleteuser'
            });
            await user.$query().delete();
            const found = await User_1.User.query().findById(user.id);
            (0, vitest_1.expect)(found).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('validation', () => {
        (0, vitest_1.it)('should require oauth_provider', async () => {
            await (0, vitest_1.expect)(User_1.User.query().insert({
                oauth_id: 'test-123',
                email: 'test@test.com',
                username: 'testuser'
            })).rejects.toThrow(objection_1.ValidationError);
        });
        (0, vitest_1.it)('should require oauth_id', async () => {
            await (0, vitest_1.expect)(User_1.User.query().insert({
                oauth_provider: 'test',
                email: 'test@test.com',
                username: 'testuser'
            })).rejects.toThrow(objection_1.ValidationError);
        });
        (0, vitest_1.it)('should require email', async () => {
            await (0, vitest_1.expect)(User_1.User.query().insert({
                oauth_provider: 'test',
                oauth_id: 'test-123',
                username: 'testuser'
            })).rejects.toThrow(objection_1.ValidationError);
        });
        (0, vitest_1.it)('should require username', async () => {
            await (0, vitest_1.expect)(User_1.User.query().insert({
                oauth_provider: 'test',
                oauth_id: 'test-123',
                email: 'test@test.com'
            })).rejects.toThrow(objection_1.ValidationError);
        });
        (0, vitest_1.it)('should enforce max length on oauth_provider', async () => {
            await (0, vitest_1.expect)(User_1.User.query().insert({
                oauth_provider: 'a'.repeat(21), // max is 20
                oauth_id: 'test-123',
                email: 'test@test.com',
                username: 'testuser'
            })).rejects.toThrow(objection_1.ValidationError);
        });
    });
    (0, vitest_1.describe)('unique constraints', () => {
        (0, vitest_1.it)('should enforce unique oauth_provider + oauth_id', async () => {
            await User_1.User.query().insert({
                oauth_provider: 'github',
                oauth_id: 'unique-123',
                email: 'first@test.com',
                username: 'firstuser'
            });
            await (0, vitest_1.expect)(User_1.User.query().insert({
                oauth_provider: 'github',
                oauth_id: 'unique-123',
                email: 'second@test.com',
                username: 'seconduser'
            })).rejects.toThrow();
        });
        (0, vitest_1.it)('should enforce unique email', async () => {
            await User_1.User.query().insert({
                oauth_provider: 'github',
                oauth_id: 'email-1',
                email: 'unique@test.com',
                username: 'user1'
            });
            await (0, vitest_1.expect)(User_1.User.query().insert({
                oauth_provider: 'google',
                oauth_id: 'email-2',
                email: 'unique@test.com',
                username: 'user2'
            })).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('relationships', () => {
        (0, vitest_1.it)('should fetch user with repositories', async () => {
            const user = await User_1.User.query().insert({
                oauth_provider: 'github',
                oauth_id: 'rel-123',
                email: 'rel@test.com',
                username: 'reluser'
            });
            await Repository_1.Repository.query().insert({
                name: 'test-repo',
                git_url: 'https://github.com/test/repo.git',
                owner_id: user.id
            });
            const userWithRepos = await User_1.User.query()
                .findById(user.id)
                .withGraphFetched('repositories');
            (0, vitest_1.expect)(userWithRepos.repositories).toBeTruthy();
            (0, vitest_1.expect)(userWithRepos.repositories.length).toBe(1);
            (0, vitest_1.expect)(userWithRepos.repositories[0].name).toBe('test-repo');
        });
    });
    (0, vitest_1.describe)('timestamps', () => {
        (0, vitest_1.it)('should auto-set created_at and updated_at on insert', async () => {
            const before = new Date();
            const user = await User_1.User.query().insert({
                oauth_provider: 'test',
                oauth_id: 'timestamp-1',
                email: 'timestamp@test.com',
                username: 'timestampuser'
            });
            const after = new Date();
            (0, vitest_1.expect)(user.created_at).toBeTruthy();
            (0, vitest_1.expect)(user.updated_at).toBeTruthy();
            (0, vitest_1.expect)(new Date(user.created_at).getTime()).toBeGreaterThanOrEqual(before.getTime());
            (0, vitest_1.expect)(new Date(user.created_at).getTime()).toBeLessThanOrEqual(after.getTime());
            (0, vitest_1.expect)(user.created_at).toEqual(user.updated_at);
        });
        (0, vitest_1.it)('should update updated_at on update', async () => {
            const user = await User_1.User.query().insert({
                oauth_provider: 'test',
                oauth_id: 'timestamp-2',
                email: 'timestamp2@test.com',
                username: 'timestampuser2'
            });
            const originalUpdatedAt = user.updated_at;
            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));
            await user.$query().patch({ display_name: 'Updated' });
            const updated = await User_1.User.query().findById(user.id);
            (0, vitest_1.expect)(new Date(updated.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
        });
    });
});
