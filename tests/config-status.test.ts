import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import fastify from "fastify";
import { ConfigSnapshotManager } from "../src/config/snapshot.js";
import { registerRoutes } from "../src/http/routes.js";
import type { EffectivePolicy } from "../src/types/config.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeConfigDir(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rwd-status-"));
  tempDirs.push(dir);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return dir;
}

function makeValidConfigDir() {
  return makeConfigDir({
    "platform.yaml": `
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
  primary:
    provider: openai
    base_url: https://example.com
    timeout_ms: 30000
    models: [gpt-main]
mcp_backends: {}
`,
    "workloads/default.yaml": `
id: default
match: {}
policy:
  level: L1
  allowed_llm_backends: [primary]
  allowed_models: [gpt-main]
`
  });
}

const resolvePolicy = (): EffectivePolicy => ({
  workload_id: "default",
  level: "L1",
  data_classification: "public",
  allowed_llm_backends: [],
  allowed_models: [],
  allowed_mcp_backends: [],
  allowed_tools: [],
  require_user_id: false,
  require_session_id: false,
  max_prompt_chars: 12000,
  max_output_chars: 12000,
  input_guards: { heuristic_prompt_injection: true, schema_validation: true },
  output_guards: { secret_redaction: true, pii_redaction: false },
  tool_guards: { require_tool_allowlist: false, require_tool_schema_validation: false }
});

describe("config status and readiness", () => {
  it("reports healthy status after initial load", async () => {
    const dir = makeValidConfigDir();
    const snapshotManager = new ConfigSnapshotManager(dir);
    snapshotManager.get();

    const app = fastify();
    registerRoutes(app, snapshotManager, resolvePolicy);

    const statusRes = await app.inject({ method: "GET", url: "/v1/config/status" });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json()).toMatchObject({
      configDir: dir,
      lastError: null,
      isUsingLastKnownGood: false,
      workloadCount: 1,
      toolSchemaCount: 0
    });

    const readyRes = await app.inject({ method: "GET", url: "/readyz" });
    expect(readyRes.statusCode).toBe(200);
    expect(readyRes.json()).toMatchObject({
      status: "ready",
      config: {
        lastError: null,
        isUsingLastKnownGood: false
      }
    });
  });

  it("reports degraded readiness after a failed reload while serving last-known-good config", async () => {
    const dir = makeValidConfigDir();
    const snapshotManager = new ConfigSnapshotManager(dir);
    snapshotManager.get();

    fs.writeFileSync(
      path.join(dir, "workloads/default.yaml"),
      `
id: default
match: {}
policy:
  level: L1
  allowed_llm_backends: [missing-backend]
`
    );

    const reloaded = snapshotManager.reload();
    expect(reloaded.workloads[0]?.id).toBe("default");

    const app = fastify();
    registerRoutes(app, snapshotManager, resolvePolicy);

    const statusRes = await app.inject({ method: "GET", url: "/v1/config/status" });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json()).toMatchObject({
      lastError: expect.stringMatching(/unknown llm_backends/i),
      isUsingLastKnownGood: true,
      workloadCount: 1
    });

    const readyRes = await app.inject({ method: "GET", url: "/readyz" });
    expect(readyRes.statusCode).toBe(200);
    expect(readyRes.json()).toMatchObject({
      status: "degraded",
      config: {
        lastError: expect.stringMatching(/unknown llm_backends/i),
        isUsingLastKnownGood: true
      }
    });
  });
});
