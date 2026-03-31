import { describe, expect, it } from "vitest";
import { runGuards } from "../src/core/guard/index.js";
import type { EffectivePolicy, PlatformConfig } from "../src/types/config.js";

const platform: PlatformConfig = {
  server: {
    host: "0.0.0.0",
    port: 8080,
    max_body_size_kb: 1024,
    request_timeout_ms: 30000
  },
  routing: {
    workload_header: "x-rwd-workload",
    source_app_header: "x-rwd-source-app",
    allow_client_workload_override: true
  },
  security: {
    default_level: "L1",
    fail_closed_on_invalid_config: true,
    normalize_unicode: true,
    redact_secrets_in_logs: true,
    default_action_on_guard_error: "block"
  },
  logging: {
    level: "info",
    access_log: false,
    decision_log: true
  },
  redaction: {
    secret_patterns: ["sk-[A-Za-z0-9]{10,}"],
    pii_patterns: []
  },
  llm_backends: {},
  mcp_backends: {}
};

const policy: EffectivePolicy = {
  workload_id: "default",
  level: "L1",
  allowed_models: [],
  require_user_id: false,
  require_session_id: false,
  max_prompt_chars: 12000,
  max_output_chars: 12000,
  input_guards: { heuristic_prompt_injection: true, schema_validation: true, secret_redaction: true },
  output_guards: { secret_redaction: true, pii_redaction: false },
  tool_guards: { require_tool_allowlist: false, require_tool_schema_validation: false },
  allowed_llm_backends: [],
  allowed_mcp_backends: [],
  allowed_tools: []
};

describe("runGuards decision", () => {
  it("returns allow_with_annotations when redaction hits", () => {
    const result = runGuards({ text: "token sk-1234567890ABCDE" }, policy, platform, {});
    expect(result.decision.action).toBe("allow_with_annotations");
    expect(result.decision.annotations?.redacted).toBe(true);
  });
});
