import type {
  ConfigStatus,
  EffectiveConfigSnapshot,
  GuardPolicy,
  HealthStatus,
  Integration,
  SkillScanResult,
  TrafficLog,
  WorkloadConfig,
} from '../types/api';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(`API Error: ${response.status}`, response.status, body);
  }

  return body as T;
}

const BASE_POLICIES: GuardPolicy[] = [
  {
    id: 'heuristic_prompt_injection',
    name: 'Prompt Injection Detection',
    category: 'input',
    description: 'Heuristic screening of inbound prompts for injection patterns.',
    defaultEnabled: true,
    level: ['L1', 'L2', 'L3'],
  },
  {
    id: 'llm_security_scan',
    name: 'LLM Security Scan',
    category: 'input',
    description: 'Escalated security scanning for higher risk workloads.',
    defaultEnabled: true,
    level: ['L3'],
  },
  {
    id: 'secret_redaction',
    name: 'Secret Redaction',
    category: 'output',
    description: 'Masks API keys, bearer tokens, and other secret strings.',
    defaultEnabled: true,
    level: ['L1', 'L2', 'L3'],
  },
  {
    id: 'pii_redaction',
    name: 'PII Redaction',
    category: 'output',
    description: 'Removes sensitive identity information from responses.',
    defaultEnabled: true,
    level: ['L2', 'L3'],
  },
  {
    id: 'require_tool_allowlist',
    name: 'Tool Allowlist',
    category: 'tools',
    description: 'Requires explicit approval for tools used by a workload.',
    defaultEnabled: true,
    level: ['L1', 'L2', 'L3'],
  },
  {
    id: 'require_tool_schema_validation',
    name: 'Tool Schema Validation',
    category: 'tools',
    description: 'Validates tool arguments against registered JSON schemas.',
    defaultEnabled: true,
    level: ['L2', 'L3'],
  },
  {
    id: 'require_intent_check',
    name: 'Intent Check',
    category: 'tools',
    description: 'Flags suspicious or high-risk tool intent before execution.',
    defaultEnabled: true,
    level: ['L3'],
  },
];

function isEffectiveConfigSnapshot(value: unknown): value is EffectiveConfigSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EffectiveConfigSnapshot>;
  return (
    Array.isArray(candidate.workloads) &&
    !!candidate.platform &&
    typeof candidate.platform === 'object' &&
    !!candidate.platform.llm_backends &&
    !!candidate.platform.mcp_backends
  );
}

function isSkillScanResult(value: unknown): value is SkillScanResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SkillScanResult>;
  return (
    typeof candidate.allowed === 'boolean' &&
    typeof candidate.riskScore === 'number' &&
    typeof candidate.blocked === 'boolean' &&
    Array.isArray(candidate.reasons)
  );
}

export async function getHealth(): Promise<HealthStatus> {
  return fetchJson<HealthStatus>('/healthz');
}

export async function getReady(): Promise<HealthStatus> {
  return fetchJson<HealthStatus>('/readyz');
}

export async function getConfigStatus(): Promise<ConfigStatus> {
  return fetchJson<ConfigStatus>('/v1/config/status');
}

export async function getEffectiveConfig(): Promise<EffectiveConfigSnapshot | null> {
  try {
    const response = await fetchJson<unknown>('/v1/config/effective');
    if (!isEffectiveConfigSnapshot(response)) {
      return null;
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function reloadConfig(): Promise<{
  status: string;
  loadedAt?: string;
  message?: string;
}> {
  return fetchJson('/v1/config/reload', { method: 'POST' });
}

export async function saveWorkloadPolicy(
  workload: WorkloadConfig
): Promise<{ status: string; workloadId: string; filePath: string; loadedAt: string }> {
  return fetchJson('/v1/config/workloads', {
    method: 'POST',
    body: JSON.stringify(workload),
  });
}

export async function deleteWorkloadPolicy(
  workloadId: string
): Promise<{ status: string; workloadId: string; loadedAt: string }> {
  return fetchJson(`/v1/config/workloads/${encodeURIComponent(workloadId)}`, {
    method: 'DELETE',
  });
}

export async function scanSkill(
  content: string,
  maxRiskScore = 20
): Promise<SkillScanResult> {
  try {
    return await fetchJson<SkillScanResult>('/v1/skills/scan', {
      method: 'POST',
      body: JSON.stringify({ content, maxRiskScore }),
    });
  } catch (error) {
    if (error instanceof ApiError && isSkillScanResult(error.body)) {
      return error.body;
    }
    throw error;
  }
}

export async function getTrafficLogs(limit = 120): Promise<TrafficLog[]> {
  const response = await fetchJson<{ items: TrafficLog[] }>(
    `/v1/traffic/recent?limit=${encodeURIComponent(String(limit))}`
  );
  return response.items;
}

export async function getGuardPolicies(
  snapshot: EffectiveConfigSnapshot | null
): Promise<GuardPolicy[]> {
  if (!snapshot || !Array.isArray(snapshot.workloads)) {
    return BASE_POLICIES;
  }

  return BASE_POLICIES.map((policy) => {
    const workloadsEnabled = snapshot.workloads.filter((workload) => {
      const guards =
        policy.category === 'input'
          ? workload.guards?.input
          : policy.category === 'output'
            ? workload.guards?.output
            : workload.guards?.tools;
      return guards?.[policy.id] === true;
    }).length;

    return {
      ...policy,
      workloadsEnabled,
      totalWorkloads: snapshot.workloads.length,
    };
  });
}

export async function getIntegrations(
  snapshot: EffectiveConfigSnapshot | null,
  ready: HealthStatus | null,
  configStatus: ConfigStatus | null
): Promise<Integration[]> {
  if (
    !snapshot ||
    !snapshot.platform ||
    !snapshot.platform.llm_backends ||
    !snapshot.platform.mcp_backends
  ) {
    return [];
  }

  const llmBackends = Object.entries(snapshot.platform.llm_backends).map(
    ([name, backend]): Integration => ({
      id: `llm-${name}`,
      name,
      type: 'llm',
      status: backend.base_url.includes('example')
        ? 'attention'
        : configStatus?.lastError
          ? 'attention'
          : 'healthy',
      detail: backend.base_url.includes('example')
        ? 'Placeholder endpoint configured'
        : ready?.status === 'degraded'
          ? 'Configured while platform is degraded'
          : 'Configured in active snapshot',
      url: backend.base_url,
      lastPing: configStatus?.loadedAt ?? undefined,
      models: backend.models ?? [],
    })
  );

  const mcpBackends = Object.entries(snapshot.platform.mcp_backends).map(
    ([name, backend]): Integration => ({
      id: `mcp-${name}`,
      name,
      type: 'mcp',
      status: configStatus?.lastError ? 'attention' : 'configured',
      detail:
        backend.base_url.includes('localhost')
          ? 'Local MCP target configured'
          : 'Configured in active snapshot',
      url: backend.base_url,
      lastPing: configStatus?.loadedAt ?? undefined,
    })
  );

  return [...llmBackends, ...mcpBackends];
}
