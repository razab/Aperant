import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { SpecOrchestrator } from '../spec-orchestrator';

describe('SpecOrchestrator', () => {
  it('does not treat max_steps as a successful phase even if files were written', async () => {
    const specDir = await mkdtemp(join(tmpdir(), 'spec-orchestrator-'));
    let runCount = 0;

    try {
      const orchestrator = new SpecOrchestrator({
        specDir,
        projectDir: specDir,
        taskDescription: 'Create a simple spec',
        complexityOverride: 'simple',
        generatePrompt: async () => 'prompt',
        runSession: async ({ specPhase }) => {
          runCount++;
          if (specPhase === 'quick_spec') {
            await writeFile(join(specDir, 'spec.md'), '# Spec', 'utf-8');
            await writeFile(
              join(specDir, 'implementation_plan.json'),
              JSON.stringify({
                phases: [
                  {
                    name: 'Phase 1',
                    subtasks: [
                      { id: 'subtask-1', description: 'Implement', status: 'pending' },
                    ],
                  },
                ],
              }, null, 2),
              'utf-8',
            );
          }

          return {
            outcome: 'max_steps',
            stepsExecuted: 25,
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            messages: [],
            durationMs: 1,
            toolCallCount: 1,
          };
        },
      });

      const outcome = await orchestrator.run();

      expect(outcome.success).toBe(false);
      expect(outcome.phasesExecuted).toEqual(['quick_spec']);
      expect(runCount).toBe(3);
    } finally {
      await rm(specDir, { recursive: true, force: true });
    }
  });
});
