import { beforeAll, afterAll, beforeEach } from 'vitest';
import knex from '../database/connection';
import { Model } from 'objection';

// Ensure we're using test database
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = './data/test.db';

beforeAll(async () => {
  // Run migrations for test database
  await knex.migrate.latest();
});

beforeEach(async () => {
  // Clean up database before each test
  await knex('sessions').delete();
  await knex('file_operations').delete();
  await knex('folder_permissions').delete();
  await knex('shared_folders').delete();
  await knex('repositories').delete();
  await knex('users').delete();
});

afterAll(async () => {
  // Close database connection
  await knex.destroy();
});