import { existsSync, readFileSync } from 'fs';
import path from 'path';

import type { AgentType, McpServerResolveOptions } from '../config/agent-configs';
import { detectProjectCapabilities, loadProjectIndex } from '../prompts/prompt-loader';
import { parseEnvFile } from '../../ipc-handlers/utils';
import type { CustomMcpServer } from '../../../shared/types/project';
import type { McpRegistryOptions } from './registry';

export interface SerializableMcpOptions {
  resolveOptions: McpServerResolveOptions;
  registryOptions: McpRegistryOptions;
}

interface BuildSerializableMcpOptionsParams {
  agentType: AgentType;
  projectDir: string;
  autoBuildPath?: string;
  processEnv?: NodeJS.ProcessEnv;
}

function parseCustomMcpServers(rawValue: string | undefined): CustomMcpServer[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? parsed as CustomMcpServer[] : [];
  } catch {
    return [];
  }
}

function loadProjectEnvVars(projectDir: string, autoBuildPath?: string): Record<string, string> {
  if (!autoBuildPath) return {};

  const envPath = path.join(projectDir, autoBuildPath, '.env');
  if (!existsSync(envPath)) return {};

  try {
    return parseEnvFile(readFileSync(envPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function buildSerializableMcpOptions(
  params: BuildSerializableMcpOptionsParams,
): SerializableMcpOptions {
  const {
    agentType,
    projectDir,
    autoBuildPath,
    processEnv = process.env,
  } = params;

  const envVars = loadProjectEnvVars(projectDir, autoBuildPath);
  const customServers = parseCustomMcpServers(envVars.CUSTOM_MCP_SERVERS);
  const linearApiKey = envVars.LINEAR_API_KEY ?? processEnv.LINEAR_API_KEY;
  const memoryMcpUrl = envVars.GRAPHITI_MCP_URL ?? processEnv.GRAPHITI_MCP_URL;
  const projectCapabilities = detectProjectCapabilities(loadProjectIndex(projectDir));
  const registryEnv: Record<string, string> = {};

  if (linearApiKey) {
    registryEnv.LINEAR_API_KEY = linearApiKey;
  }
  if (memoryMcpUrl) {
    registryEnv.GRAPHITI_MCP_URL = memoryMcpUrl;
  }

  return {
    resolveOptions: {
      context7Enabled: envVars.CONTEXT7_ENABLED?.toLowerCase() !== 'false',
      memoryEnabled:
        envVars.GRAPHITI_ENABLED?.toLowerCase() === 'true' || Boolean(memoryMcpUrl),
      linearEnabled: Boolean(linearApiKey),
      electronMcpEnabled: envVars.ELECTRON_MCP_ENABLED?.toLowerCase() === 'true',
      puppeteerMcpEnabled: envVars.PUPPETEER_MCP_ENABLED?.toLowerCase() === 'true',
      projectCapabilities,
      agentMcpAdd: envVars[`AGENT_MCP_${agentType}_ADD`],
      agentMcpRemove: envVars[`AGENT_MCP_${agentType}_REMOVE`],
      customServerIds: customServers.map((server) => server.id),
    },
    registryOptions: {
      linearApiKey,
      memoryMcpUrl,
      customServers,
      env: Object.keys(registryEnv).length > 0 ? registryEnv : undefined,
    },
  };
}
