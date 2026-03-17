import { describe, expect, it } from "vitest";
import { resolveWorkload } from "../src/core/workload.js";
import type { PlatformConfig, WorkloadConfig } from "../src/types/config.js";

const platform: PlatformConfig = {
  server: { host: "0.0.0.0", port: 8080, request_timeout_ms: 1000, max_body_size_kb: 128 },
  routing: {
    workload_header: "x-rwd-workload",
    allow_client_workload_override: true,
    trusted_override_source_apps: ["rocketclaw"],
    metadata_paths: { workload: "$.meta.workload" },
    default_workload: "default"
  },
  security: {
    default_level: "L0",
    fail_closed_on_invalid_config: true,
    normalize_unicode: true,
    redact_secrets_in_logs: true,
    default_action_on_guard_error: "block"
  },
  llm_backends: {},
  mcp_backends: {},
  logging: { level: "info", access_log: true, decision_log: true },
  redaction: { secret_patterns: [] }
};

const workloads: WorkloadConfig[] = [
  {
    id: "by-header",
    match: { headers: { "x-rwd-workload": "by-header" } },
    policy: { level: "L0" }
  },
  {
    id: "by-route",
    match: { routes: ["/proxy"] },
    policy: { level: "L0" }
  },
  {
    id: "default",
    match: { routes: ["/"] },
    policy: { level: "L0" }
  }
];

describe("resolveWorkload", () => {
  it("matches by header", () => {
    const workload = resolveWorkload(platform, workloads, {
      route: "/v1/chat/completions",
      headers: { "x-rwd-workload": "by-header" }
    });
    expect(workload?.id).toBe("by-header");
  });

  it("matches by route", () => {
    const workload = resolveWorkload(platform, workloads, {
      route: "/proxy/openai",
      headers: {}
    });
    expect(workload?.id).toBe("by-route");
  });

  it("returns default when no match", () => {
    const workload = resolveWorkload(platform, workloads, {
      route: "/other",
      headers: {}
    });
    expect(workload?.id).toBe("default");
  });
});
