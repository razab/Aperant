import { describe, expect, it } from 'vitest';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';

import { buildSerializableMcpOptions } from '../session-config';

describe('buildSerializableMcpOptions', () => {
  it('collects project-level MCP flags, custom servers, and registry credentials', () => {
    const projectDir = mkdtempSync(path.join(tmpdir(), 'mcp-session-config-'));
    const autoBuildPath = '.auto-claude';

    try {
      mkdirSync(path.join(projectDir, autoBuildPath), { recursive: true });
      writeFileSync(
        path.join(projectDir, autoBuildPath, '.env'),
        [
          'CONTEXT7_ENABLED=false',
          'GRAPHITI_ENABLED=true',
          'LINEAR_API_KEY=lin-project-key',
          'ELECTRON_MCP_ENABLED=true',
          'AGENT_MCP_qa_reviewer_ADD=my-http',
          'AGENT_MCP_qa_reviewer_REMOVE=context7',
          'CUSTOM_MCP_SERVERS=[{"id":"my-http","name":"My HTTP","type":"http","url":"https://mcp.example.com","headers":{"Authorization":"Bearer 123"}}]',
        ].join('\n'),
        'utf-8',
      );
      mkdirSync(path.join(projectDir, '.auto-claude'), { recursive: true });
      writeFileSync(
        path.join(projectDir, '.auto-claude', 'project_index.json'),
        JSON.stringify({
          services: {
            desktop: {
              framework: 'react',
              dependencies: ['electron'],
              dev_dependencies: ['vite'],
            },
          },
        }),
        'utf-8',
      );

      const options = buildSerializableMcpOptions({
        agentType: 'qa_reviewer',
        projectDir,
        autoBuildPath,
        processEnv: { GRAPHITI_MCP_URL: 'http://memory.local' },
      });

      expect(options.resolveOptions.context7Enabled).toBe(false);
      expect(options.resolveOptions.memoryEnabled).toBe(true);
      expect(options.resolveOptions.linearEnabled).toBe(true);
      expect(options.resolveOptions.electronMcpEnabled).toBe(true);
      expect(options.resolveOptions.agentMcpAdd).toBe('my-http');
      expect(options.resolveOptions.agentMcpRemove).toBe('context7');
      expect(options.resolveOptions.projectCapabilities?.is_electron).toBe(true);
      expect(options.resolveOptions.customServerIds).toEqual(['my-http']);

      expect(options.registryOptions.linearApiKey).toBe('lin-project-key');
      expect(options.registryOptions.memoryMcpUrl).toBe('http://memory.local');
      expect(options.registryOptions.customServers).toHaveLength(1);
      expect(options.registryOptions.customServers?.[0].id).toBe('my-http');
      expect(options.registryOptions.env).toEqual({
        LINEAR_API_KEY: 'lin-project-key',
        GRAPHITI_MCP_URL: 'http://memory.local',
      });
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
