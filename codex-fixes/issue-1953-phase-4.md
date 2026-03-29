# Issue 1953 Phase 4

Date: 2026-03-29

Scope:

1. Preserve the full MCP context across the main-process → worker boundary.
2. Stop reducing MCP state to a few booleans before worker startup.
3. Allow the worker to resolve project-level MCP flags, custom servers, and credentials exactly as prepared in main.

Implementation approach:

- Introduce a serializable MCP context with `resolveOptions` and `registryOptions`.
- Build that context once from project `.auto-claude/.env` and `project_index.json`.
- Pass per-agent overrides, detected project capabilities, custom server IDs, and registry credentials to the worker.
- Extend the MCP registry to resolve custom command/http servers from serialized project config.
- Update worker MCP initialization to call `createMcpClientsForAgent(agentType, resolveOptions, registryOptions)`.

Acceptance:

- Worker receives project capabilities and per-agent MCP overrides from main.
- Custom MCP servers defined in project config can be resolved inside the worker.
- Registry credentials such as `LINEAR_API_KEY` and `GRAPHITI_MCP_URL` are no longer lost before MCP client creation.
