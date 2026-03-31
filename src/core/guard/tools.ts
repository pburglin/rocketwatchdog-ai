import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { EffectivePolicy } from "../../types/config.js";
import { detectPromptInjection } from "./injection.js";

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
const applyFormats = addFormats as unknown as (ajvInstance: InstanceType<AjvClass>) => void;

const ajv = new AjvCtor({ allErrors: true, strict: false });
applyFormats(ajv);
const validatorCache = new WeakMap<object, ValidateFunction>();

const writeIntentPattern = /\b(write|delete|remove|update|create|exec|run|shell|sql|post|put|patch|upload|download|file|database)\b/i;
const sensitiveIntentPattern = /\b(system\s+prompt|api\s*key|password|token|credentials?|private\s+key|ssh\s+key)\b/i;

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

type ReasonSink = (reason: string) => void;

function createReasonCollector() {
  const reasons: string[] = [];
  const seen = new Set<string>();
  const addReason: ReasonSink = (reason) => {
    if (!seen.has(reason)) {
      seen.add(reason);
      reasons.push(reason);
    }
  };
  return { reasons, addReason };
}

function validateAllowlist(
  items: Array<ToolDefinition | ToolInvocation> | undefined,
  allowlist: string[] | undefined,
  addReason: ReasonSink
) {
  if (!items) return;
  const hasAllowlist = Array.isArray(allowlist) && allowlist.length > 0;
  for (const item of items) {
    if (!item.name || typeof item.name !== "string") {
      addReason("TOOL_NAME_MISSING");
      continue;
    }
    if (!hasAllowlist) {
      addReason("TOOL_ALLOWLIST_EMPTY");
      continue;
    }
    if (!allowlist.includes(item.name)) {
      addReason(`TOOL_NOT_ALLOWED:${item.name}`);
    }
  }
}

function validateInvocationSchemas(
  invocations: ToolInvocation[] | undefined,
  schemas: Record<string, Record<string, unknown>>,
  addReason: ReasonSink
) {
  if (!invocations) return;
  for (const invocation of invocations) {
    if (!invocation.name || typeof invocation.name !== "string") {
      addReason("TOOL_NAME_MISSING");
      continue;
    }
    const schema = schemas[invocation.name];
    if (!schema) {
      addReason(`TOOL_SCHEMA_MISSING:${invocation.name}`);
      continue;
    }
    const { validate, error } = getValidator(schema);
    if (!validate) {
      addReason(`TOOL_SCHEMA_INVALID_DEFINITION:${invocation.name}:${error ?? "unknown"}`);
      continue;
    }
    const ok = validate(invocation.arguments ?? {});
    if (!ok) {
      const details = validate.errors
        ?.map((err) => `${err.instancePath} ${err.message}`)
        .join(";");
      addReason(`TOOL_SCHEMA_INVALID:${invocation.name}:${details ?? "unknown"}`);
    }
  }
}

function requiresWriteConfirmation(invocation: ToolInvocation): boolean {
  if (!invocation.name) return false;
  if (writeIntentPattern.test(invocation.name)) return true;
  const serialized = JSON.stringify(invocation.arguments ?? "");
  return writeIntentPattern.test(serialized);
}

function hasSuspiciousIntent(invocation: ToolInvocation): boolean {
  const serialized = JSON.stringify(invocation.arguments ?? "");
  if (detectPromptInjection(serialized).length > 0) return true;
  return sensitiveIntentPattern.test(serialized);
}

export function validateTools(
  policy: EffectivePolicy,
  tools: ToolDefinition[] | undefined,
  invocations: ToolInvocation[] | undefined,
  toolSchemas: Record<string, Record<string, unknown>>
): ToolValidationResult {
  const { reasons, addReason } = createReasonCollector();
  if (policy.tool_guards.require_tool_allowlist) {
    validateAllowlist(tools, policy.allowed_tools, addReason);
    validateAllowlist(invocations, policy.allowed_tools, addReason);
  }
  if (policy.tool_guards.require_tool_schema_validation) {
    validateInvocationSchemas(invocations, toolSchemas, addReason);
  }
  if (policy.tool_guards.require_confirmation_for_write && invocations) {
    for (const invocation of invocations) {
      if (requiresWriteConfirmation(invocation)) {
        addReason(`TOOL_CONFIRMATION_REQUIRED:${invocation.name}`);
      }
    }
  }
  if (policy.tool_guards.require_intent_check && invocations) {
    for (const invocation of invocations) {
      if (hasSuspiciousIntent(invocation)) {
        addReason(`TOOL_INTENT_RISK:${invocation.name}`);
      }
    }
  }

  const insecureToolingReasons = reasons.filter((reason) =>
    reason.startsWith("TOOL_ALLOWLIST_EMPTY") ||
    reason.startsWith("TOOL_SCHEMA_MISSING") ||
    reason.startsWith("TOOL_SCHEMA_INVALID") ||
    reason.startsWith("TOOL_SCHEMA_INVALID_DEFINITION")
  );
  if (insecureToolingReasons.length > 0) {
    addReason("LLM07_INSECURE_TOOLING");
  }

  return { allowed: reasons.length === 0, reasons };
}
