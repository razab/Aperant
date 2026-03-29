import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../subtask-iterator', async () => {
  const actual = await vi.importActual<typeof import('../subtask-iterator')>('../subtask-iterator');
  return {
    ...actual,
    iterateSubtasks: vi.fn(),
  };
});

import { iterateSubtasks } from '../subtask-iterator';
import { BuildOrchestrator } from '../build-orchestrator';

const mockIterateSubtasks = vi.mocked(iterateSubtasks);

describe('BuildOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails the build when any subtask is stuck', async () => {
    const specDir = await mkdtemp(join(tmpdir(), 'build-orchestrator-'));

    try {
      await writeFile(
        join(specDir, 'implementation_plan.json'),
        JSON.stringify({
          phases: [
            {
              id: 'phase-1',
              name: 'Phase 1',
              subtasks: [
                { id: 'subtask-1', description: 'Done', status: 'completed' },
                { id: 'subtask-2', description: 'Stuck', status: 'pending' },
              ],
            },
          ],
        }, null, 2),
        'utf-8',
      );

      mockIterateSubtasks.mockResolvedValue({
        totalSubtasks: 2,
        completedSubtasks: 1,
        stuckSubtasks: ['subtask-2'],
        cancelled: false,
      });

      const orchestrator = new BuildOrchestrator({
        specDir,
        projectDir: specDir,
        generatePrompt: async () => 'prompt',
        runSession: async () => ({
          outcome: 'completed',
          stepsExecuted: 1,
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          messages: [],
          durationMs: 1,
          toolCallCount: 0,
        }),
      });

      const outcome = await orchestrator.run();

      expect(outcome.success).toBe(false);
      expect(outcome.error).toContain('Stuck subtasks: subtask-2');
    } finally {
      await rm(specDir, { recursive: true, force: true });
    }
  });
});
