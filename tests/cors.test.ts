import { describe, expect, it } from "vitest";
import fastify from "fastify";
import { registerCors } from "../src/http/cors.js";
import { registerRoutes } from "../src/http/routes.js";
import { ConfigSnapshotManager } from "../src/config/snapshot.js";
import type { EffectivePolicy } from "../src/types/config.js";

const snapshotManager = new ConfigSnapshotManager("configs");

const resolvePolicy = (): EffectivePolicy => ({
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

describe("cors", () => {
  it("answers preflight requests with access-control headers", async () => {
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const res = await app.inject({
      method: "OPTIONS",
      url: "/v1/config/status",
      headers: {
        origin: "http://localhost:5174",
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type"
      }
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
    expect(res.headers["access-control-allow-methods"]).toContain("GET");
    expect(res.headers["access-control-allow-headers"]).toContain("content-type");
  });

  it("allows DELETE preflight requests for config admin endpoints", async () => {
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const res = await app.inject({
      method: "OPTIONS",
      url: "/v1/config/workloads/default",
      headers: {
        origin: "http://localhost:5174",
        "access-control-request-method": "DELETE"
      }
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-methods"]).toContain("DELETE");
  });

  it("adds access-control headers on standard responses", async () => {
    const app = fastify();
    registerCors(app);
    registerRoutes(app, snapshotManager, resolvePolicy);

    const res = await app.inject({
      method: "GET",
      url: "/healthz",
      headers: {
        origin: "http://localhost:5174"
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
    expect(res.json()).toEqual({ status: "ok" });
  });
});
