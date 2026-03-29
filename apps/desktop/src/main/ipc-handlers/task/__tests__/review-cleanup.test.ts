import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { IPC_CHANNELS } from '../../../../shared/constants';

const ipcHandlers = new Map<string, Function>();
const mockFindTaskAndProject = vi.fn();
const mockFindTaskWorktree = vi.fn();
const mockPrepareForRestart = vi.fn();
const mockHandleUiEvent = vi.fn();
const mockSpawnSync = vi.fn();
const mockExecFileSync = vi.fn();

vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn((channel: string, handler: Function) => {
      ipcHandlers.set(channel, handler);
    }),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawnSync: (...args: unknown[]) => mockSpawnSync(...args),
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

vi.mock('../../../cli-tool-manager', () => ({
  getToolPath: vi.fn((tool: string) => tool),
}));

vi.mock('../../../file-watcher', () => ({
  fileWatcher: {
    watch: vi.fn(),
    unwatch: vi.fn(),
  },
}));

vi.mock('../shared', () => ({
  findTaskAndProject: (...args: unknown[]) => mockFindTaskAndProject(...args),
}));

vi.mock('../../../project-initializer', () => ({
  checkGitStatus: vi.fn(),
}));

vi.mock('../../../claude-profile-manager', () => ({
  initializeClaudeProfileManager: vi.fn(),
}));

vi.mock('../../../task-state-manager', () => ({
  taskStateManager: {
    prepareForRestart: (...args: unknown[]) => mockPrepareForRestart(...args),
    handleUiEvent: (...args: unknown[]) => mockHandleUiEvent(...args),
    handleManualStatusChange: vi.fn(),
    getCurrentState: vi.fn(),
  },
}));

vi.mock('../plan-file-utils', () => ({
  getPlanPath: vi.fn(),
  persistPlanStatus: vi.fn(),
  createPlanIfNotExists: vi.fn(),
  resetStuckSubtasks: vi.fn(),
  hasPlanWithSubtasks: vi.fn(),
}));

vi.mock('../../../utils/atomic-file', () => ({
  writeFileAtomicSync: vi.fn(),
}));

vi.mock('../../../worktree-paths', () => ({
  findTaskWorktree: (...args: unknown[]) => mockFindTaskWorktree(...args),
}));

vi.mock('../../../project-store', () => ({
  projectStore: {
    getProjects: vi.fn(),
    getTasks: vi.fn(),
  },
}));

vi.mock('../../../utils/git-isolation', () => ({
  getIsolatedGitEnv: vi.fn(() => ({})),
  detectWorktreeBranch: vi.fn(),
}));

vi.mock('../../agent-events-handlers', () => ({
  cancelFallbackTimer: vi.fn(),
}));

vi.mock('../../../settings-utils', () => ({
  readSettingsFile: vi.fn(() => ({ providerAccounts: [] })),
}));

describe('TASK_REVIEW cleanup', () => {
  let projectPath: string;
  let worktreePath: string;

  beforeEach(() => {
    ipcHandlers.clear();
    vi.clearAllMocks();

    projectPath = mkdtempSync(path.join(tmpdir(), 'task-review-project-'));
    worktreePath = mkdtempSync(path.join(tmpdir(), 'task-review-worktree-'));

    mockSpawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
    mockExecFileSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'rev-parse' && args[1] === '--verify') {
        return `${args[2]}\n`;
      }
      if (args[0] === 'diff' && args[1] === '--name-only') {
        return 'generated/new-file.txt\nsrc/changed.ts\n';
      }
      if (args[0] === 'status' && args[1] === '--porcelain') {
        const target = args[args.length - 1];
        return target === 'generated/new-file.txt' ? '?? generated/new-file.txt\n' : '';
      }
      return '';
    });
  });

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true });
    rmSync(worktreePath, { recursive: true, force: true });
    vi.resetModules();
  });

  it('preserves unrelated untracked files while removing merge-added artifacts', async () => {
    const specId = '001-safe-cleanup';
    const projectId = 'project-1';
    const taskId = 'task-1';
    const feedback = 'Please fix the QA issues';
    const specsBaseDir = '.auto-claude/specs';

    mkdirSync(path.join(projectPath, '.auto-claude', 'specs', specId), { recursive: true });
    mkdirSync(path.join(projectPath, 'generated'), { recursive: true });
    mkdirSync(path.join(projectPath, 'src'), { recursive: true });
    mkdirSync(path.join(worktreePath, '.auto-claude', 'specs', specId), { recursive: true });
    mkdirSync(path.join(worktreePath, 'generated'), { recursive: true });
    mkdirSync(path.join(worktreePath, 'src'), { recursive: true });

    writeFileSync(path.join(projectPath, 'notes.txt'), 'user note');
    writeFileSync(path.join(projectPath, 'generated', 'new-file.txt'), 'from merge');
    writeFileSync(path.join(projectPath, 'src', 'changed.ts'), 'tracked file placeholder');

    writeFileSync(path.join(worktreePath, 'generated', 'new-file.txt'), 'from merge');
    writeFileSync(path.join(worktreePath, 'src', 'changed.ts'), 'worktree version');

    const task = {
      id: taskId,
      specId,
      projectId,
      title: 'Safe cleanup test',
      description: 'Reject flow should not delete unrelated files',
      status: 'human_review',
      subtasks: [],
      logs: [],
      metadata: { baseBranch: 'develop' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const project = {
      id: projectId,
      name: 'Test Project',
      path: projectPath,
      autoBuildPath: '.auto-claude',
      settings: { mainBranch: 'develop' },
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    };

    mockFindTaskAndProject.mockReturnValue({ task, project });
    mockFindTaskWorktree.mockReturnValue(worktreePath);

    const mockAgentManager = {
      startQAProcess: vi.fn(),
    };

    const { registerTaskExecutionHandlers } = await import('../execution-handlers');
    registerTaskExecutionHandlers(mockAgentManager as never, () => null);

    const handler = ipcHandlers.get(IPC_CHANNELS.TASK_REVIEW);
    expect(handler).toBeDefined();

    const result = await handler?.({}, taskId, false, feedback);

    expect(result).toEqual({ success: true });
    expect(existsSync(path.join(projectPath, 'notes.txt'))).toBe(true);
    expect(readFileSync(path.join(projectPath, 'notes.txt'), 'utf-8')).toBe('user note');
    expect(existsSync(path.join(projectPath, 'generated', 'new-file.txt'))).toBe(false);
    expect(existsSync(path.join(projectPath, 'generated'))).toBe(false);
    expect(existsSync(path.join(projectPath, 'src', 'changed.ts'))).toBe(true);

    const fixRequestPath = path.join(worktreePath, specsBaseDir, specId, 'QA_FIX_REQUEST.md');
    expect(existsSync(fixRequestPath)).toBe(true);
    expect(readFileSync(fixRequestPath, 'utf-8')).toContain(feedback);

    expect(mockPrepareForRestart).toHaveBeenCalledWith(taskId);
    expect(mockAgentManager.startQAProcess).toHaveBeenCalledWith(taskId, worktreePath, specId, projectId);
    expect(mockHandleUiEvent).toHaveBeenCalledWith(
      taskId,
      { type: 'USER_RESUMED' },
      task,
      project,
    );
  });
});
