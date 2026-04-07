import { describe, expect, it, vi, afterEach } from 'vitest';
import fastify from 'fastify';
import { ConfigSnapshotManager } from '../src/config/snapshot.js';
import { registerRoutes } from '../src/http/routes.js';
import type { EffectivePolicy } from '../src/types/config.js';
import { setDebugModeEnabled } from '../src/logging/debug-runtime.js';

const snapshotManager = new ConfigSnapshotManager('configs');
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
});

describe('debug endpoints and decision mode', () => {
  it('toggles debug mode and returns filtered logs', async () => {
    const app = fastify();
    registerRoutes(app, snapshotManager, resolvePolicy);

    await app.inject({ method: 'POST', url: '/v1/debug/status', payload: { enabled: true } });
    const status = await app.inject({ method: 'GET', url: '/v1/debug/status' });
    expect(status.statusCode).toBe(200);
    expect(status.json().enabled).toBe(true);

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
});
