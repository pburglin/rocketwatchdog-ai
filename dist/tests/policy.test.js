import { describe, expect, it } from "vitest";
import { mergeEffectivePolicy } from "../src/types/policy.js";
const platform = {
    server: { host: "0.0.0.0", port: 8080, request_timeout_ms: 1000, max_body_size_kb: 128 },
    routing: { workload_header: "x", allow_client_workload_override: false },
    security: {
        default_level: "L0",
        fail_closed_on_invalid_config: true,
        normalize_unicode: true,
        redact_secrets_in_logs: true,
        default_action_on_guard_error: "block",
        max_prompt_chars: 32000,
        max_output_chars: 10000
    },
    llm_backends: {},
    mcp_backends: {},
    logging: { level: "info", access_log: true, decision_log: true },
    redaction: { secret_patterns: [] }
};
const workload = {
    id: "public-chat",
    match: { routes: ["/v1/chat/completions"] },
    policy: {
        level: "L1",
        allowed_llm_backends: ["openai_primary"],
        allowed_models: ["gpt-main"],
        max_prompt_chars: 50000,
        max_output_chars: 8000
    },
    guards: {
        input: { heuristic_prompt_injection: true },
        output: { secret_redaction: true },
        tools: { require_tool_schema_validation: true }
    }
};
describe("mergeEffectivePolicy", () => {
    it("clamps to platform caps", () => {
        const merged = mergeEffectivePolicy(platform, workload);
        expect(merged.max_prompt_chars).toBe(32000);
        expect(merged.max_output_chars).toBe(8000);
    });
    it("sets allowed backends and models", () => {
        const merged = mergeEffectivePolicy(platform, workload);
        expect(merged.allowed_llm_backends).toEqual(["openai_primary"]);
        expect(merged.allowed_models).toEqual(["gpt-main"]);
    });
});
//# sourceMappingURL=policy.test.js.map