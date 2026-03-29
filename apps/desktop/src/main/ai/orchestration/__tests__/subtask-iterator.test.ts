import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { iterateSubtasks } from '../subtask-iterator';

describe('iterateSubtasks', () => {
  it('does not leave a subtask completed after max_steps', async () => {
    const specDir = await mkdtemp(join(tmpdir(), 'subtask-iterator-'));
    const planPath = join(specDir, 'implementation_plan.json');

    try {
      await writeFile(
        planPath,
        JSON.stringify({
          phases: [
            {
              name: 'Phase 1',
              subtasks: [
                {
                  id: 'subtask-1',
                  title: 'Test subtask',
                  description: 'Should remain incomplete',
                  status: 'pending',
                },
              ],
            },
          ],
        }, null, 2),
        'utf-8',
      );

      let attempts = 0;
      const result = await iterateSubtasks({
        specDir,
        projectDir: specDir,
        maxRetries: 1,
        autoContinueDelayMs: 0,
        runSubtaskSession: async () => {
          attempts++;
          if (attempts === 1) {
            await writeFile(
              planPath,
              JSON.stringify({
                phases: [
                  {
                    name: 'Phase 1',
                    subtasks: [
                      {
                        id: 'subtask-1',
                        title: 'Test subtask',
                        description: 'Should remain incomplete',
                        status: 'completed',
                      },
                    ],
                  },
                ],
              }, null, 2),
              'utf-8',
            );
            return {
              outcome: 'max_steps',
              stepsExecuted: 10,
              usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
              messages: [],
              durationMs: 1,
              toolCallCount: 0,
            };
          }

          return {
            outcome: 'completed',
            stepsExecuted: 1,
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            messages: [],
            durationMs: 1,
            toolCallCount: 0,
          };
        },
      });

      const plan = JSON.parse(await readFile(planPath, 'utf-8')) as {
        phases: Array<{ subtasks: Array<{ status: string }> }>;
      };

      expect(result.stuckSubtasks).toEqual(['subtask-1']);
      expect(result.completedSubtasks).toBe(0);
      expect(plan.phases[0].subtasks[0].status).toBe('in_progress');
    } finally {
      await rm(specDir, { recursive: true, force: true });
    }
  });
});
