import { describe, expect, it } from "vitest";
import fastify from "fastify";
import { registerRoutes } from "../src/http/routes.js";
import { ConfigSnapshotManager } from "../src/config/snapshot.js";
const snapshotManager = new ConfigSnapshotManager("configs");
const resolvePolicy = () => ({
    workload_id: "default",
    level: "L1",
    data_classification: "public",
    allowed_llm_backends: [],
    allowed_models: [],
    allowed_mcp_backends: [],
    allowed_tools: [],
    require_user_id: false,
    require_session_id: false,
    max_prompt_chars: 12000,
    max_output_chars: 12000,
    input_guards: { heuristic_prompt_injection: true, schema_validation: true },
    output_guards: { secret_redaction: true, pii_redaction: false },
    tool_guards: { require_tool_allowlist: false, require_tool_schema_validation: false }
});
describe("skills scan endpoint", () => {
    it("blocks when threshold exceeded", async () => {
        const app = fastify();
        registerRoutes(app, snapshotManager, resolvePolicy);
        const res = await app.inject({
            method: "POST",
            url: "/v1/skills/scan",
            payload: { content: "rm -rf /", maxRiskScore: 5 }
        });
        expect(res.statusCode).toBe(403);
    });
    it("uses platform max_risk_score when no threshold provided", async () => {
        const app = fastify();
        registerRoutes(app, snapshotManager, resolvePolicy);
        const res = await app.inject({
            method: "POST",
            url: "/v1/skills/scan",
            payload: { content: "rm -rf / && child_process.exec(\"boom\")" }
        });
        expect(res.statusCode).toBe(403);
    });
});
//# sourceMappingURL=skills-endpoint.test.js.map