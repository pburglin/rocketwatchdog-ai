import { describe, expect, it } from "vitest";
import { resolveWorkload } from "../src/core/workload.js";
import type { PlatformConfig, WorkloadConfig } from "../src/types/config.js";

const platform: PlatformConfig = {
  server: { host: "0.0.0.0", port: 8080, request_timeout_ms: 30000, max_body_size_kb: 1024 },
  routing: {
    workload_header: "x-rwd-workload",
    allow_client_workload_override: false,
    trusted_override_source_apps: ["trusted"],
    source_app_header: "x-rwd-source-app",
    default_workload: "default"
  },
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
  redaction: { secret_patterns: [] }
};

const workloads: WorkloadConfig[] = [
  { id: "default", match: {}, policy: { level: "L1" } },
  { id: "trusted-only", match: {}, policy: { level: "L2" } }
];

describe("resolveWorkload", () => {
  it("blocks header overrides from untrusted apps", () => {
    const result = resolveWorkload(platform, workloads, {
      route: "/v1",
      headers: { "x-rwd-workload": "trusted-only", "x-rwd-source-app": "untrusted" },
      payload: {},
      sourceApp: "untrusted"
    });
    expect(result?.id).toBe("default");
  });

  it("allows header overrides for trusted apps", () => {
    const result = resolveWorkload(platform, workloads, {
      route: "/v1",
      headers: { "x-rwd-workload": "trusted-only", "x-rwd-source-app": "trusted" },
      payload: {},
      sourceApp: "trusted"
    });
    expect(result?.id).toBe("trusted-only");
  });
});
