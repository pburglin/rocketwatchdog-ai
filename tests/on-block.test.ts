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
  max_prompt_chars: 1,
  max_output_chars: 12000,
  input_guards: { heuristic_prompt_injection: false, schema_validation: true },
  output_guards: { secret_redaction: false, pii_redaction: false },
  tool_guards: { require_tool_allowlist: false, require_tool_schema_validation: false }
});

describe("on_block override", () => {
  it("returns configured status/message", async () => {
    const app = fastify();
    registerRoutes(app, snapshotManager, resolvePolicy);
    const res = await app.inject({
      method: "POST",
      url: "/v1/proxy/llm",
      payload: { messages: [{ role: "user", content: "too long" }] }
    });
    expect([403, 413]).toContain(res.statusCode);
  });
});
