import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs');

import * as fs from 'node:fs';

import { updateQaStatusTool } from '../update-qa-status';
import type { ToolContext } from '../../types';

const baseContext: ToolContext = {
  cwd: '/test/project',
  projectDir: '/test/project',
  specDir: '/test/specs/001',
  securityProfile: null,
} as unknown as ToolContext;

describe('updateQaStatusTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.renameSync).mockImplementation(() => undefined);
  });

  it('preserves existing findings when marking fixes_applied and appends history', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        qa_signoff: {
          status: 'rejected',
          qa_session: 2,
          issues_found: [{ title: 'Missing test', type: 'critical' }],
          tests_passed: {},
          timestamp: '2026-03-29T10:00:00.000Z',
          ready_for_qa_revalidation: false,
          fix_request_file: 'QA_FIX_REQUEST.md',
        },
      }),
    );

    const result = updateQaStatusTool.config.execute(
      { status: 'fixes_applied' },
      baseContext,
    );

    expect(result).toContain("Updated QA status to 'fixes_applied'");
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

    const [, serialized] = vi.mocked(fs.writeFileSync).mock.calls[0] ?? [];
    const writtenPlan = JSON.parse(String(serialized));

    expect(writtenPlan.qa_signoff.status).toBe('fixes_applied');
    expect(writtenPlan.qa_signoff.qa_session).toBe(2);
    expect(writtenPlan.qa_signoff.issues_found).toEqual([
      { title: 'Missing test', type: 'critical' },
    ]);
    expect(writtenPlan.qa_iteration_history).toHaveLength(1);
    expect(writtenPlan.qa_iteration_history[0]).toMatchObject({
      status: 'fixes_applied',
      qa_session: 2,
      issues_found: [{ title: 'Missing test', type: 'critical' }],
      ready_for_qa_revalidation: true,
    });
  });
});
