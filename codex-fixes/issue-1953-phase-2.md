# Issue 1953 Phase 2

Date: 2026-03-29

Scope:

1. Remove blind `git clean -fd` from task review rejection flow.
2. Replace it with targeted cleanup of merge-attempt artifacts only.
3. Preserve unrelated user-created untracked files in the main project.

Implementation approach:

- Keep `git reset HEAD` and `git checkout -- .` for tracked files.
- Determine task-changed paths from the task worktree diff against the effective base branch.
- Only remove untracked files in the main project when:
  - the path is part of the task diff, and
  - the file still matches the worktree version byte-for-byte.
- Remove now-empty parent directories after deleting those files.

Acceptance:

- Rejecting a staged merge no longer runs `git clean -fd` on the project root.
- An unrelated untracked file such as `notes.txt` survives review rejection.
- A merge-added untracked file copied from the worktree is removed.
