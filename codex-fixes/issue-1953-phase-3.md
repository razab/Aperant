# Issue 1953 Phase 3

Date: 2026-03-29

Scope:

1. Remove the external `auto-claude-mcp-server.js` dependency.
2. Serve `auto-claude` capabilities through builtin TypeScript tools.
3. Keep the MCP layer focused on real external integrations only.

Implementation approach:

- Register all `mcp__auto-claude__*` tools in `buildToolRegistry()`.
- Make `ToolRegistry.getToolsForAgent()` merge `config.tools` with `config.autoClaudeTools`.
- Remove `auto-claude` from build/planner/QA `mcpServers` defaults.
- Stop resolving `auto-claude` in the MCP registry so no external Node server is launched.
- Update tests to assert the builtin path instead of the external MCP path.

Acceptance:

- Planner, coder, and QA receive `mcp__auto-claude__*` tools from the builtin tool registry.
- `resolveMcpServers(['auto-claude'])` returns no MCP config.
- No runtime path depends on `auto-claude-mcp-server.js`.
