import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitCommand } from '../GitCommand';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');

describe('GitCommand', () => {
  let gitCommand: GitCommand;
  let mockSpawn: any;

  beforeEach(() => {
    gitCommand = new GitCommand('/test/repo');
    mockSpawn = vi.mocked(spawn);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute git command successfully', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.pid = 12345;

      mockSpawn.mockReturnValue(mockProcess);

      const promise = gitCommand.execute(['status']);

      // Simulate successful execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'On branch main');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await promise;

      expect(result).toEqual({
        success: true,
        stdout: 'On branch main',
        stderr: '',
        exitCode: 0
      });
      expect(mockSpawn).toHaveBeenCalledWith('git', ['status'], {
        cwd: '/test/repo',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should handle command failure with error output', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.pid = 12345;

      mockSpawn.mockReturnValue(mockProcess);

      const promise = gitCommand.execute(['invalid-command']);

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'git: invalid-command is not a git command');
        mockProcess.emit('close', 1);
      }, 10);

      const result = await promise;

      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'git: invalid-command is not a git command',
        exitCode: 1
      });
    });

    it('should handle timeout', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.pid = 12345;
      mockProcess.kill = vi.fn();

      mockSpawn.mockReturnValue(mockProcess);

      const promise = gitCommand.execute(['clone', 'huge-repo'], { timeout: 100 });

      // Don't emit close event to simulate hanging process

      await expect(promise).rejects.toThrow('Git command timed out after 100ms');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('should handle spawn error', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      mockSpawn.mockReturnValue(mockProcess);

      const promise = gitCommand.execute(['status']);

      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn ENOENT'));
      }, 10);

      await expect(promise).rejects.toThrow('spawn ENOENT');
    });

    it('should handle custom working directory', async () => {
      const customGitCommand = new GitCommand('/custom/path');
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.pid = 12345;

      mockSpawn.mockReturnValue(mockProcess);

      const promise = customGitCommand.execute(['init']);

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith('git', ['init'], {
        cwd: '/custom/path',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should handle large output data', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.pid = 12345;

      mockSpawn.mockReturnValue(mockProcess);

      const promise = gitCommand.execute(['log', '--oneline']);

      setTimeout(() => {
        // Simulate multiple data chunks
        mockProcess.stdout.emit('data', 'abc123 First commit\n');
        mockProcess.stdout.emit('data', 'def456 Second commit\n');
        mockProcess.stdout.emit('data', 'ghi789 Third commit\n');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await promise;

      expect(result.stdout).toBe('abc123 First commit\ndef456 Second commit\nghi789 Third commit');
    });

    it('should handle mixed stdout and stderr', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.pid = 12345;

      mockSpawn.mockReturnValue(mockProcess);

      const promise = gitCommand.execute(['status']);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'On branch main\n');
        mockProcess.stderr.emit('data', 'warning: LF will be replaced by CRLF\n');
        mockProcess.stdout.emit('data', 'nothing to commit\n');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await promise;

      expect(result.stdout).toBe('On branch main\nnothing to commit');
      expect(result.stderr).toBe('warning: LF will be replaced by CRLF');
      expect(result.success).toBe(true);
    });
  });
});