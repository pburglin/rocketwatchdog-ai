import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { EffectivePolicy } from "../../types/config.js";

export interface ToolDefinition {
  name: string;
  parameters?: unknown;
}

export interface ToolInvocation {
  name: string;
  arguments?: unknown;
}

export interface ToolValidationResult {
  allowed: boolean;
  reasons: string[];
}

type AjvClass = typeof import("ajv").default;
const AjvCtor = Ajv as unknown as AjvClass;

const ajv = new AjvCtor({ allErrors: true, strict: false });
addFormats(ajv);
const validatorCache = new WeakMap<object, ValidateFunction>();

function getValidator(schema: unknown): { validate?: ValidateFunction; error?: string } {
  if (!schema || typeof schema !== "object") {
    return { validate: ajv.compile({}) };
  }
  const cached = validatorCache.get(schema as object);
  if (cached) return { validate: cached };
  try {
    const compiled = ajv.compile(schema);
    validatorCache.set(schema as object, compiled);
    return { validate: compiled };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown_schema_error" };
  }
}

function validateAllowlist(
  items: Array<ToolDefinition | ToolInvocation> | undefined,
  allowlist: string[] | undefined,
  reasons: string[]
) {
  if (!allowlist || allowlist.length === 0 || !items) return;
  for (const item of items) {
    if (!item.name || typeof item.name !== "string") {
      reasons.push("TOOL_NAME_MISSING");
      continue;
    }
    if (!allowlist.includes(item.name)) {
      reasons.push(`TOOL_NOT_ALLOWED:${item.name}`);
    }
  }
}

function validateInvocationSchemas(
  invocations: ToolInvocation[] | undefined,
  schemas: Record<string, Record<string, unknown>>,
  reasons: string[]
) {
  if (!invocations) return;
  for (const invocation of invocations) {
    if (!invocation.name || typeof invocation.name !== "string") {
      reasons.push("TOOL_NAME_MISSING");
      continue;
    }
    const schema = schemas[invocation.name];
    if (!schema) {
      reasons.push(`TOOL_SCHEMA_MISSING:${invocation.name}`);
      continue;
    }
    const { validate, error } = getValidator(schema);
    if (!validate) {
      reasons.push(`TOOL_SCHEMA_INVALID_DEFINITION:${invocation.name}:${error ?? "unknown"}`);
      continue;
    }
    const ok = validate(invocation.arguments ?? {});
    if (!ok) {
      const details = validate.errors
        ?.map((err) => `${err.instancePath} ${err.message}`)
        .join(";");
      reasons.push(`TOOL_SCHEMA_INVALID:${invocation.name}:${details ?? "unknown"}`);
    }
  }
}

export function validateTools(
  policy: EffectivePolicy,
  tools: ToolDefinition[] | undefined,
  invocations: ToolInvocation[] | undefined,
  toolSchemas: Record<string, Record<string, unknown>>
): ToolValidationResult {
  const reasons: string[] = [];
  if (policy.tool_guards.require_tool_allowlist) {
    validateAllowlist(tools, policy.allowed_tools, reasons);
    validateAllowlist(invocations, policy.allowed_tools, reasons);
  }
  if (policy.tool_guards.require_tool_schema_validation) {
    validateInvocationSchemas(invocations, toolSchemas, reasons);
  }
  return { allowed: reasons.length === 0, reasons };
}
