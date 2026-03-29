# Issue 1953 Phase 5

Date: 2026-03-29

Scope:

1. Stop treating `max_steps` and `context_window` as successful completion by default.
2. Prevent stuck subtasks from advancing the build into QA.
3. Remove the clean-exit fallback that forced `QA_PASSED` without explicit terminal proof.

Implementation approach:

- Introduce shared session outcome helpers and treat only `completed` as success.
- Map incomplete outcomes to non-zero worker exit codes.
- Keep incomplete coder sessions from leaving subtasks in `completed`.
- Fail the build when any subtask becomes stuck, not only when all subtasks are stuck.
- Require QA reviewer/fixer sessions to finish with `completed` before their results are trusted.
- Replace process-exit fallback promotion with a safe `USER_STOPPED` fallback.

Acceptance:

- `max_steps/context_window` no longer auto-complete subtasks, phases, or whole tasks.
- Build orchestration stops on any stuck subtask instead of proceeding to QA.
- A clean process exit without terminal events no longer forces `QA_PASSED`.
