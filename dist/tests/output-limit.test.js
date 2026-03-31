import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyOpenAI } from "../src/adapters/openai.js";
const snapshot = {
    platform: {
        server: { host: "0.0.0.0", port: 8080, request_timeout_ms: 30000, max_body_size_kb: 1024 },
        routing: { workload_header: "x", allow_client_workload_override: false },
        security: {
            default_level: "L1",
            fail_closed_on_invalid_config: true,
            normalize_unicode: true,
            redact_secrets_in_logs: false,
            default_action_on_guard_error: "block"
        },
        llm_backends: {
            primary: {
                provider: "openai",
                base_url: "http://example.com",
                timeout_ms: 30000,
                models: []
            }
        },
        mcp_backends: {},
        logging: { level: "info", access_log: false, decision_log: false },
        redaction: { secret_patterns: [] }
    },
    workloads: [],
    toolSchemas: {},
    loadedAt: "now"
};
afterEach(() => {
    vi.restoreAllMocks();
});
const policy = {
    workload_id: "default",
    level: "L1",
    max_prompt_chars: 12000,
    max_output_chars: 1,
    input_guards: { heuristic_prompt_injection: false, schema_validation: false },
    output_guards: { secret_redaction: false, pii_redaction: false },
    tool_guards: { require_tool_allowlist: false, require_tool_schema_validation: false },
    allowed_llm_backends: ["primary"],
    allowed_models: [],
    allowed_mcp_backends: [],
    allowed_tools: [],
    require_user_id: false,
    require_session_id: false
};
describe("output limit", () => {
    it("blocks when output exceeds max_output_chars", async () => {
        const request = { body: { messages: [] }, log: { info: () => { } } };
        const reply = {
            code: (status) => {
                reply.status = status;
                return reply;
            },
            send: (payload) => {
                reply.payload = payload;
            },
            headers: () => { }
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            text: async () => "too long",
            headers: new Headers({ "content-type": "application/json" }),
            status: 200
        }));
        await proxyOpenAI(request, reply, snapshot, policy, {
            requestId: "1",
            timestamp: "now",
            route: "/v1",
            headers: {},
            payload: {},
            messages: [],
            metadata: {}
        });
        expect(reply.status).toBe(413);
        expect(reply.payload.error).toBe("output_too_large");
    });
});
//# sourceMappingURL=output-limit.test.js.map