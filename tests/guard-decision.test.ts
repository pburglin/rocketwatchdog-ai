import { describe, expect, it } from "vitest";
import { runGuards } from "../src/core/guard/index.js";
import type { EffectivePolicy, PlatformConfig } from "../src/types/config.js";

const platform: PlatformConfig = {
  server: {
    host: "0.0.0.0",
    port: 8080,
    body_limit_kb: 1024,
    request_timeout_ms: 30000
  },
  routing: {
    workload_header: "x-rwd-workload",
    source_app_header: "x-rwd-source-app",
    allow_header_override: true
  },
  security: {
    normalize_unicode: true,
    redact_secrets_in_logs: true
  },
  logging: {
    level: "info",
    decision_log: true
  },
  redaction: {
    secret_patterns: ["sk-[A-Za-z0-9]{10,}"],
    pii_patterns: []
  },
  llm_backends: {},
  mcp_backends: {},
  tools: []
};

const policy: EffectivePolicy = {
  workload_id: "default",
  level: "L1",
  max_prompt_chars: 12000,
  input_guards: { heuristic_prompt_injection: true, schema_validation: true },
  output_guards: { secret_redaction: true, pii_redaction: false },
  tool_guards: { require_tool_allowlist: false, require_tool_schema_validation: false },
  allowed_llm_backends: [],
  allowed_mcp_backends: [],
  allowed_tools: []
};

describe("runGuards decision", () => {
  it("returns allow_with_annotations when redaction hits", () => {
    const result = runGuards(
      { text: "token sk-1234567890ABCDE" },
      policy,
      platform,
      {}
    );
    expect(result.decision.action).toBe("allow_with_annotations");
    expect(result.decision.annotations?.redacted).toBe(true);
  });
});
