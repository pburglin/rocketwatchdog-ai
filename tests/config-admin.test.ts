import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import fastify from "fastify";
import { ConfigSnapshotManager } from "../src/config/snapshot.js";
import { registerCors } from "../src/http/cors.js";
import { registerRoutes } from "../src/http/routes.js";
import type { EffectivePolicy, PlatformConfig } from "../src/types/config.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeConfigDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rwd-admin-"));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, "workloads"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "platform.yaml"),
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
  redact_secrets_in_logs: true
  default_action_on_guard_error: block
logging:
  level: info
  access_log: false
  decision_log: false
redaction:
  secret_patterns: ["secret"]
llm_backends:
  primary:
    provider: openai
    base_url: https://example.com
    timeout_ms: 30000
    models: [gpt-main]
mcp_backends:
  tools:
    transport: http
    base_url: http://localhost:9001
    timeout_ms: 10000
`
  );
  fs.writeFileSync(
    path.join(dir, "workloads/default.yaml"),
    `
id: default
match: {}
policy:
  level: L1
  allowed_llm_backends: [primary]
  allowed_models: [gpt-main]
`
  );
  return dir;
}

function makeConfigDirWithApiKeyAuth() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rwd-admin-auth-"));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, "workloads"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "platform.yaml"),
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
  redact_secrets_in_logs: true
  default_action_on_guard_error: block
logging:
  level: info
  access_log: false
  decision_log: false
redaction:
  secret_patterns: ["secret"]
llm_backends:
  primary:
    provider: openai
    base_url: https://example.com
    timeout_ms: 30000
    models: [gpt-main]
mcp_backends: {}
auth:
  mode: api_key
  api_key_env: RWD_TEST_API_KEY
`
  );
  fs.writeFileSync(
    path.join(dir, "workloads/default.yaml"),
    `
id: default
match: {}
policy:
  level: L1
  allowed_llm_backends: [primary]
  allowed_models: [gpt-main]
`
  );
  return dir;
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

describe("config admin endpoints", () => {
  it("returns a sanitized effective snapshot instead of hiding workloads", async () => {
    const dir = makeConfigDir();
    const snapshotManager = new ConfigSnapshotManager(dir);
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const res = await app.inject({ method: "GET", url: "/v1/config/effective" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      workloads: [{ id: "default" }],
      platform: {
        redaction: {
          secret_patterns: ["[redacted-pattern]"]
        }
      }
    });
  });

  it("creates or updates workload config files", async () => {
    const dir = makeConfigDir();
    const snapshotManager = new ConfigSnapshotManager(dir);
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const res = await app.inject({
      method: "POST",
      url: "/v1/config/workloads",
      payload: {
        id: "route-policy",
        match: {
          routes: ["/v1/proxy/llm"],
          headers: {
            "x-team": "security"
          }
        },
        policy: {
          level: "L2",
          allowed_llm_backends: ["primary"],
          allowed_models: ["gpt-main"]
        },
        guards: {
          input: {
            heuristic_prompt_injection: true
          }
        }
      }
    });

    expect(res.statusCode).toBe(200);
    const stored = fs.readFileSync(path.join(dir, "workloads/route-policy.yaml"), "utf-8");
    expect(stored).toContain("x-team");
    expect(snapshotManager.get().workloads.some((workload) => workload.id === "route-policy")).toBe(true);
  });

  it("deletes workload config files", async () => {
    const dir = makeConfigDir();
    fs.writeFileSync(
      path.join(dir, "workloads/remove-me.yaml"),
      `
id: remove-me
match:
  routes:
    - "/v1/remove"
policy:
  level: L1
  allowed_llm_backends: [primary]
  allowed_models: [gpt-main]
`
    );
    const snapshotManager = new ConfigSnapshotManager(dir);
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const res = await app.inject({
      method: "DELETE",
      url: "/v1/config/workloads/remove-me"
    });

    expect(res.statusCode).toBe(200);
    expect(fs.existsSync(path.join(dir, "workloads/remove-me.yaml"))).toBe(false);
  });

  it("applies workload matching on custom POST /v1/* paths", async () => {
    const dir = makeConfigDir();
    fs.writeFileSync(
      path.join(dir, "workloads/custom-route.yaml"),
      `
id: custom-route
match:
  routes:
    - "/v1/abc"
policy:
  level: L1
  allowed_llm_backends: [primary]
  allowed_models: [gpt-main]
  max_prompt_chars: 1
actions:
  on_block:
    http_status: 451
    message: "Custom route blocked."
`
    );

    const snapshotManager = new ConfigSnapshotManager(dir);
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const res = await app.inject({
      method: "POST",
      url: "/v1/abc",
      payload: {
        messages: [{ role: "user", content: "too long" }]
      }
    });

    expect(res.statusCode).toBe(451);
    expect(res.json()).toMatchObject({
      error: "guard_rejected",
      message: "Custom route blocked."
    });
  });

  it("requires auth for the recent traffic endpoint", async () => {
    process.env.RWD_TEST_API_KEY = "test-key";
    const dir = makeConfigDirWithApiKeyAuth();
    const snapshotManager = new ConfigSnapshotManager(dir);
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const unauthorized = await app.inject({
      method: "GET",
      url: "/v1/traffic/recent"
    });
    expect(unauthorized.statusCode).toBe(401);

    const authorized = await app.inject({
      method: "GET",
      url: "/v1/traffic/recent",
      headers: {
        "x-api-key": "test-key"
      }
    });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toEqual({ items: [] });

    delete process.env.RWD_TEST_API_KEY;
  });
});
