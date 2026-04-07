import { describe, expect, it } from "vitest";
import { getDebugLogs, recordDebugLog } from "../src/logging/debug-capture.js";
import type { PlatformConfig } from "../src/types/config.js";

const platform: PlatformConfig = {
  server: { host: "0.0.0.0", port: 8080, request_timeout_ms: 30000, max_body_size_kb: 1024 },
  routing: { workload_header: "x-rwd-workload", allow_client_workload_override: false },
  security: {
    default_level: "L1",
    fail_closed_on_invalid_config: true,
    normalize_unicode: true,
    redact_secrets_in_logs: false,
    default_action_on_guard_error: "block"
  },
  llm_backends: {},
  mcp_backends: {},
  logging: {
    level: "info",
    access_log: false,
    decision_log: false,
    debug_capture: { max_entries: 2, max_payload_chars: 40 }
  },
  redaction: { secret_patterns: [] }
};

describe("debug capture", () => {
  it("truncates long payload strings and honors max entry retention", () => {
    recordDebugLog(platform, {
      stage: "request",
      message: "first",
      payload: { prompt: "a".repeat(100) }
    });
    recordDebugLog(platform, {
      stage: "request",
      message: "second",
      payload: { prompt: "short" }
    });
    recordDebugLog(platform, {
      stage: "request",
      message: "third",
      payload: { prompt: "still short" }
    });

    const entries = getDebugLogs(10);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.message).toBe("third");
    expect(entries[1]?.message).toBe("second");

    recordDebugLog(platform, {
      stage: "request",
      message: "truncate-check",
      payload: { prompt: "b".repeat(100) }
    });

    const latest = getDebugLogs(1)[0];
    expect(latest?.payload).toEqual({
      prompt: expect.stringContaining("[truncated 60 chars]")
    });
  });
});
