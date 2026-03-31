import { describe, expect, it } from "vitest";
import { authenticateRequest } from "../src/auth/auth.js";
const basePlatform = {
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
    redaction: { secret_patterns: [] }
};
function buildJwt(payload) {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.`;
}
describe("authenticateRequest", () => {
    it("allows when mode none", () => {
        const result = authenticateRequest({ headers: {} }, basePlatform);
        expect(result.allowed).toBe(true);
    });
    it("rejects invalid api key", () => {
        process.env.RWD_API_KEY = "secret";
        const platform = {
            ...basePlatform,
            auth: { mode: "api_key", api_key_env: "RWD_API_KEY" }
        };
        const result = authenticateRequest({ headers: { "x-api-key": "nope" } }, platform);
        expect(result.allowed).toBe(false);
    });
    it("enforces jwt issuer and audience when configured", () => {
        const token = buildJwt({ iss: "issuer", aud: "audience", sub: "user" });
        const platform = {
            ...basePlatform,
            auth: { mode: "jwt", jwt_issuer: "issuer", jwt_audience: "audience" }
        };
        const result = authenticateRequest({ headers: { authorization: `Bearer ${token}` } }, platform);
        expect(result.allowed).toBe(true);
    });
    it("rejects expired jwt", () => {
        const token = buildJwt({ exp: Math.floor(Date.now() / 1000) - 10 });
        const platform = { ...basePlatform, auth: { mode: "jwt" } };
        const result = authenticateRequest({ headers: { authorization: `Bearer ${token}` } }, platform);
        expect(result.allowed).toBe(false);
    });
    it("rejects jwt with wrong audience", () => {
        const token = buildJwt({ aud: "wrong" });
        const platform = {
            ...basePlatform,
            auth: { mode: "jwt", jwt_audience: "expected" }
        };
        const result = authenticateRequest({ headers: { authorization: `Bearer ${token}` } }, platform);
        expect(result.allowed).toBe(false);
    });
});
//# sourceMappingURL=auth.test.js.map