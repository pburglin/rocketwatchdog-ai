import { describe, expect, it } from "vitest";
import { validateTools } from "../src/core/guard/tools.js";
import type { EffectivePolicy } from "../src/types/config.js";

const policy: EffectivePolicy = {
  workload_id: "test",
  level: "L1",
  data_classification: "D0",
  allowed_llm_backends: [],
  allowed_models: [],
  allowed_mcp_backends: [],
  allowed_tools: ["allowed"],
  require_user_id: false,
  require_session_id: false,
  max_prompt_chars: 1000,
  max_output_chars: 1000,
  input_guards: {},
  output_guards: {},
  tool_guards: { require_tool_schema_validation: true, require_tool_allowlist: true }
};

const toolSchemas = {
  allowed: {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: {
      id: { type: "string" }
    }
  }
};

describe("validateTools", () => {
  it("rejects non-allowlisted tools", () => {
    const result = validateTools(policy, [{ name: "blocked" }], undefined, toolSchemas);
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toContain("TOOL_NOT_ALLOWED");
  });

  it("flags missing tool names", () => {
    const result = validateTools(policy, [{ name: "" }], [{ name: "" }], toolSchemas);
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toContain("TOOL_NAME_MISSING");
  });

  it("flags missing tool schema when validation is required", () => {
    const policyWithMissing = { ...policy, allowed_tools: ["allowed", "missing"] };
    const result = validateTools(
      policyWithMissing,
      [{ name: "allowed" }],
      [{ name: "missing", arguments: { id: "1" } }],
      toolSchemas
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toContain("TOOL_SCHEMA_MISSING");
  });

  it("validates tool invocation schema", () => {
    const result = validateTools(
      policy,
      [{ name: "allowed" }],
      [{ name: "allowed", arguments: {} }],
      toolSchemas
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toContain("TOOL_SCHEMA_INVALID");
  });

  it("accepts valid tool invocation", () => {
    const result = validateTools(
      policy,
      [{ name: "allowed" }],
      [{ name: "allowed", arguments: { id: "123" } }],
      toolSchemas
    );
    expect(result.allowed).toBe(true);
  });

  it("rejects tool usage when allowlist is empty", () => {
    const result = validateTools(
      { ...policy, allowed_tools: [] },
      [{ name: "allowed" }],
      [{ name: "allowed", arguments: { id: "123" } }],
      toolSchemas
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("TOOL_ALLOWLIST_EMPTY");
  });
});
