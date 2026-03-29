# Issue 1953 Phase 1

Date: 2026-03-29

Scope for the first pass:

1. Fix `EXDEV` risk when normalizing or repairing `implementation_plan.json`.
2. Align QA retry limits to 5 iterations in runtime and user-facing reporting.
3. Reduce oversized orchestration `maxSteps` budgets from `1000` to bounded values.
4. Guard roadmap async loads against stale project-switch writes.

Execution notes:

- Keep Phase 1 limited to low-risk, high-impact fixes.
- Do not change MCP architecture yet.
- Do not change task success semantics for `max_steps` / `context_window` yet; that is Phase 5.

Target files:

- `apps/desktop/src/main/ai/schema/structured-output.ts`
- `apps/desktop/src/main/ai/orchestration/qa-loop.ts`
- `apps/desktop/src/main/ai/orchestration/qa-reports.ts`
- `apps/desktop/src/main/ai/orchestration/build-orchestrator.ts`
- `apps/desktop/src/main/agent/agent-manager.ts`
- `apps/desktop/src/renderer/stores/roadmap-store.ts`
- `apps/desktop/src/renderer/__tests__/roadmap-store.test.ts`

Acceptance:

- No temp-file rename across filesystems during plan normalization/repair.
- QA loops stop after 5 iterations unless a lower explicit override is passed.
- Spec/build/QA worker sessions no longer default to `1000` steps.
- A stale roadmap response from project A does not overwrite project B state.
