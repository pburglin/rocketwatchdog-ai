import { describe, expect, it } from "vitest";
import { authenticateRequest } from "../src/auth/auth.js";
import type { PlatformConfig } from "../src/types/config.js";

const basePlatform: PlatformConfig = {
  server: { host: "0.0.0.0", port: 8080, request_timeout_ms: 30000, max_body_size_kb: 1024 },
  routing: { workload_header: "x-rwd-workload", allow_client_workload_override: true },
  security: {
    default_level: "L1",
    fail_closed_on_invalid_config: true,
    normalize_unicode: true,
    redact_secrets_in_logs: false,
    default_action_on_guard_error: "block"
  },
  llm_backends: {},
  mcp_backends: {},
  logging: { level: "info", access_log: false, decision_log: false },
  redaction: { secret_patterns: [] },
  tools: []
};

describe("authenticateRequest", () => {
  it("allows when mode none", () => {
    const result = authenticateRequest({ headers: {} } as any, basePlatform);
    expect(result.allowed).toBe(true);
  });

  it("rejects invalid api key", () => {
    process.env.RWD_API_KEY = "secret";
    const platform = { ...basePlatform, auth: { mode: "api_key", api_key_env: "RWD_API_KEY" } };
    const result = authenticateRequest({ headers: { "x-api-key": "nope" } } as any, platform);
    expect(result.allowed).toBe(false);
  });
});
