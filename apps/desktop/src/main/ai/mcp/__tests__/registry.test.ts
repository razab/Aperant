/**
 * Tests for MCP Server Registry
 *
 * Validates server configuration resolution, required server lookup,
 * and option-based server filtering.
 */

import { describe, expect, it } from 'vitest';
import { getMcpServerConfig, resolveMcpServers } from '../registry';

// =============================================================================
// getMcpServerConfig
// =============================================================================

describe('getMcpServerConfig', () => {
  describe('context7', () => {
    it('returns the context7 server config', () => {
      const config = getMcpServerConfig('context7');
      expect(config).not.toBeNull();
      expect(config?.id).toBe('context7');
      expect(config?.enabledByDefault).toBe(true);
    });

    it('uses stdio transport with npx', () => {
      const config = getMcpServerConfig('context7');
      expect(config?.transport.type).toBe('stdio');
      if (config?.transport.type === 'stdio') {
        expect(config.transport.command).toBe('npx');
      }
    });
  });

  describe('linear', () => {
    it('returns null when no API key provided', () => {
      const config = getMcpServerConfig('linear', {});
      expect(config).toBeNull();
    });

    it('returns config when linearApiKey is provided', () => {
      const config = getMcpServerConfig('linear', { linearApiKey: 'lin_api_123' });
      expect(config).not.toBeNull();
      expect(config?.id).toBe('linear');
    });

    it('returns config when LINEAR_API_KEY is in env option', () => {
      const config = getMcpServerConfig('linear', { env: { LINEAR_API_KEY: 'lin_env_456' } });
      expect(config).not.toBeNull();
    });

    it('injects LINEAR_API_KEY into the transport env', () => {
      const config = getMcpServerConfig('linear', { linearApiKey: 'lin_inject' });
      expect(config?.transport.type).toBe('stdio');
      if (config?.transport.type === 'stdio') {
        expect(config.transport.env?.LINEAR_API_KEY).toBe('lin_inject');
      }
    });
  });

  describe('memory', () => {
    it('returns null when no memory URL provided', () => {
      const config = getMcpServerConfig('memory', {});
      expect(config).toBeNull();
    });

    it('returns config with streamable-http transport when URL is provided', () => {
      const config = getMcpServerConfig('memory', { memoryMcpUrl: 'http://localhost:8080/mcp' });
      expect(config).not.toBeNull();
      expect(config?.transport.type).toBe('streamable-http');
      if (config?.transport.type === 'streamable-http') {
        expect(config.transport.url).toBe('http://localhost:8080/mcp');
      }
    });

    it('reads URL from env.GRAPHITI_MCP_URL option', () => {
      const config = getMcpServerConfig('memory', { env: { GRAPHITI_MCP_URL: 'http://graphiti.local' } });
      expect(config?.transport.type).toBe('streamable-http');
    });
  });

  describe('electron', () => {
    it('returns the electron server config', () => {
      const config = getMcpServerConfig('electron');
      expect(config).not.toBeNull();
      expect(config?.id).toBe('electron');
      expect(config?.enabledByDefault).toBe(false);
    });

    it('uses stdio transport', () => {
      const config = getMcpServerConfig('electron');
      expect(config?.transport.type).toBe('stdio');
    });
  });

  describe('puppeteer', () => {
    it('returns the puppeteer server config', () => {
      const config = getMcpServerConfig('puppeteer');
      expect(config).not.toBeNull();
      expect(config?.id).toBe('puppeteer');
    });

    it('uses stdio transport', () => {
      const config = getMcpServerConfig('puppeteer');
      expect(config?.transport.type).toBe('stdio');
    });
  });

  describe('auto-claude', () => {
    it('does not resolve auto-claude as an MCP server anymore', () => {
      const config = getMcpServerConfig('auto-claude', {});
      expect(config).toBeNull();
    });
  });

  describe('unknown server', () => {
    it('returns null for unrecognized server ID', () => {
      const config = getMcpServerConfig('nonexistent-server');
      expect(config).toBeNull();
    });
  });
});

// =============================================================================
// resolveMcpServers
// =============================================================================

describe('resolveMcpServers', () => {
  it('returns configs for all recognized server IDs', () => {
    const configs = resolveMcpServers(['context7', 'electron', 'puppeteer']);
    expect(configs).toHaveLength(3);
    expect(configs.map((c) => c.id)).toEqual(['context7', 'electron', 'puppeteer']);
  });

  it('filters out servers that cannot be configured (e.g. linear without API key)', () => {
    const configs = resolveMcpServers(['context7', 'linear'], {});
    expect(configs).toHaveLength(1);
    expect(configs[0].id).toBe('context7');
  });

  it('includes linear when API key option is provided', () => {
    const configs = resolveMcpServers(['context7', 'linear'], { linearApiKey: 'lin_test' });
    expect(configs).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    const configs = resolveMcpServers([]);
    expect(configs).toEqual([]);
  });

  it('skips unrecognized server IDs silently', () => {
    const configs = resolveMcpServers(['context7', 'bogus-server-id']);
    expect(configs).toHaveLength(1);
    expect(configs[0].id).toBe('context7');
  });

  it('includes memory server when memoryMcpUrl is provided', () => {
    const configs = resolveMcpServers(['memory'], { memoryMcpUrl: 'http://memory.local' });
    expect(configs).toHaveLength(1);
    expect(configs[0].id).toBe('memory');
  });

  it('filters out auto-claude because it is now builtin', () => {
    const specDir = '/my-project/.auto-claude/specs/042-auth';
    const configs = resolveMcpServers(['auto-claude'], { specDir });
    expect(configs).toEqual([]);
  });

  it('resolves custom command MCP servers from registry options', () => {
    const configs = resolveMcpServers(['my-command'], {
      customServers: [
        {
          id: 'my-command',
          name: 'My Command Server',
          type: 'command',
          command: 'npx',
          args: ['-y', 'my-server'],
        },
      ],
    });

    expect(configs).toHaveLength(1);
    expect(configs[0].id).toBe('my-command');
    expect(configs[0].transport.type).toBe('stdio');
  });

  it('resolves custom HTTP MCP servers from registry options', () => {
    const configs = resolveMcpServers(['my-http'], {
      customServers: [
        {
          id: 'my-http',
          name: 'My HTTP Server',
          type: 'http',
          url: 'https://mcp.example.com',
          headers: { Authorization: 'Bearer 123' },
        },
      ],
    });

    expect(configs).toHaveLength(1);
    expect(configs[0].id).toBe('my-http');
    expect(configs[0].transport.type).toBe('streamable-http');
    if (configs[0].transport.type === 'streamable-http') {
      expect(configs[0].transport.headers).toEqual({ Authorization: 'Bearer 123' });
    }
  });
});
