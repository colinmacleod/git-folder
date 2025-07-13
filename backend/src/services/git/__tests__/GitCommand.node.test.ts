import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GitCommand } from '../GitCommand';

describe('GitCommand', () => {
  test('should create GitCommand instance', () => {
    const gitCommand = new GitCommand();
    assert.ok(gitCommand);
  });

  test('should have execute method', () => {
    const gitCommand = new GitCommand();
    assert.strictEqual(typeof gitCommand.execute, 'function');
  });
});