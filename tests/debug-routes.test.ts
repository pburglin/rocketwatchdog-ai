import { describe, expect, it, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fastify from 'fastify';
import { ConfigSnapshotManager } from '../src/config/snapshot.js';
import { registerRoutes } from '../src/http/routes.js';
import type { EffectivePolicy } from '../src/types/config.js';
import { loadDebugModeState, setDebugModeEnabled } from '../src/logging/debug-runtime.js';

const tempDirs: string[] = [];

function makeConfigDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rwd-debug-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'workloads'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'platform.yaml'),
    `
server:
  host: 127.0.0.1
  port: 8080
  request_timeout_ms: 30000
  max_body_size_kb: 1024
routing:
  workload_header: x-rwd-workload
  allow_client_workload_override: false
  default_workload: default
security:
  default_level: L1
  fail_closed_on_invalid_config: true
  normalize_unicode: true
  redact_secrets_in_logs: false
  default_action_on_guard_error: block
logging:
  level: info
  access_log: false
  decision_log: false
redaction:
  secret_patterns: []
llm_backends:
  openai_primary:
    provider: openai
    base_url: https://example.com
    timeout_ms: 30000
    models: [gpt-main]
mcp_backends:
  internal_tools:
    transport: http
    base_url: https://mcp.example.com
    timeout_ms: 10000
`
  );
  fs.writeFileSync(
    path.join(dir, 'workloads/default.yaml'),
    `
id: default
match: {}
policy:
  level: L1
  allowed_llm_backends: [openai_primary]
  allowed_models: [gpt-main]
  allowed_mcp_backends: [internal_tools]
`
  );
  return dir;
}

const resolvePolicy = (): EffectivePolicy => ({
  workload_id: 'default',
  level: 'L1',
  data_classification: 'public',
  allowed_llm_backends: ['openai_primary'],
  allowed_models: ['gpt-main'],
  allowed_mcp_backends: ['internal_tools'],
  allowed_tools: [],
  require_user_id: false,
  require_session_id: false,
  max_prompt_chars: 12000,
  max_output_chars: 12000,
  input_guards: { heuristic_prompt_injection: true, secret_redaction: true },
  output_guards: { secret_redaction: true, pii_redaction: false },
  tool_guards: { require_tool_allowlist: false, require_tool_schema_validation: false }
});

afterEach(() => {
  vi.restoreAllMocks();
  setDebugModeEnabled(false);
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('debug endpoints and decision mode', () => {
  it('toggles debug mode and returns filtered logs', async () => {
    const snapshotManager = new ConfigSnapshotManager(makeConfigDir());
    const app = fastify();
    registerRoutes(app, snapshotManager, resolvePolicy);

    await app.inject({ method: 'POST', url: '/v1/debug/status', payload: { enabled: true } });
    const status = await app.inject({ method: 'GET', url: '/v1/debug/status' });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({ enabled: true, persisted: true });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json', 'x-correlation-id': 'corr-123' }),
      text: async () => JSON.stringify({ ok: true, correlationId: 'corr-123' })
    } as any));

    await app.inject({
      method: 'POST',
      url: '/v1/proxy/llm',
      payload: { model: 'gpt-main', messages: [{ role: 'user', content: 'hello corr-123' }] }
    });

    const logs = await app.inject({ method: 'GET', url: '/v1/debug/logs?q=corr-123' });
    expect(logs.statusCode).toBe(200);
    expect(logs.json().items.length).toBeGreaterThan(0);
  });

  it('returns allow decision without proxying in decision mode endpoint', async () => {
    const snapshotManager = new ConfigSnapshotManager(makeConfigDir());
    const app = fastify();
    registerRoutes(app, snapshotManager, resolvePolicy);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/decision',
      payload: { model: 'gpt-main', messages: [{ role: 'user', content: 'safe prompt' }] }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().allowed).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('restores persisted debug mode on a new snapshot manager', async () => {
    const dir = makeConfigDir();
    const firstManager = new ConfigSnapshotManager(dir);
    const firstApp = fastify();
    registerRoutes(firstApp, firstManager, resolvePolicy);

    const toggle = await firstApp.inject({ method: 'POST', url: '/v1/debug/status', payload: { enabled: true } });
    expect(toggle.statusCode).toBe(200);
    expect(loadDebugModeState(dir)).toBe(true);

    setDebugModeEnabled(false);

    const secondManager = new ConfigSnapshotManager(dir);
    secondManager.get();
    expect(secondManager.getStatus().debugModeEnabled).toBe(true);
  });
});
