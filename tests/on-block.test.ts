import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import fastify from "fastify";
import { registerRoutes } from "../src/http/routes.js";
import { ConfigSnapshotManager } from "../src/config/snapshot.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeConfigDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rwd-on-block-"));
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
  max_prompt_chars: 1
guards:
  input:
    heuristic_prompt_injection: false
actions:
  on_block:
    http_status: 451
    message: "Blocked by test policy."
`
  );
  return dir;
}

describe("on_block override", () => {
  it("returns configured status/message", async () => {
    const snapshotManager = new ConfigSnapshotManager(makeConfigDir());
    const app = fastify();
    registerRoutes(app, snapshotManager, () => {
      throw new Error("resolvePolicy should not be called when pipeline resolves workload");
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/proxy/llm",
      payload: { messages: [{ role: "user", content: "too long" }] }
    });
    expect(res.statusCode).toBe(451);
    expect(res.json()).toMatchObject({
      error: "guard_rejected",
      message: "Blocked by test policy."
    });
  });
});
