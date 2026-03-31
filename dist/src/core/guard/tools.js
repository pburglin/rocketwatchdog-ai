import Ajv from "ajv";
import addFormats from "ajv-formats";
import { detectPromptInjection } from "./injection.js";
const AjvCtor = Ajv;
const applyFormats = addFormats;
const ajv = new AjvCtor({ allErrors: true, strict: false });
applyFormats(ajv);
const validatorCache = new WeakMap();
const writeIntentPattern = /\b(write|delete|remove|update|create|exec|run|shell|sql|post|put|patch|upload|download|file|database)\b/i;
const sensitiveIntentPattern = /\b(system\s+prompt|api\s*key|password|token|credentials?|private\s+key|ssh\s+key)\b/i;
function getValidator(schema) {
    if (!schema || typeof schema !== "object") {
        return { validate: ajv.compile({}) };
    }
    const cached = validatorCache.get(schema);
    if (cached)
        return { validate: cached };
    try {
        const compiled = ajv.compile(schema);
        validatorCache.set(schema, compiled);
        return { validate: compiled };
    }
    catch (error) {
        return { error: error instanceof Error ? error.message : "unknown_schema_error" };
    }
}
function createReasonCollector() {
    const reasons = [];
    const seen = new Set();
    const addReason = (reason) => {
        if (!seen.has(reason)) {
            seen.add(reason);
            reasons.push(reason);
        }
    };
    return { reasons, addReason };
}
function validateAllowlist(items, allowlist, addReason) {
    if (!items)
        return;
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
function validateInvocationSchemas(invocations, schemas, addReason) {
    if (!invocations)
        return;
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
function requiresWriteConfirmation(invocation) {
    if (!invocation.name)
        return false;
    if (writeIntentPattern.test(invocation.name))
        return true;
    const serialized = JSON.stringify(invocation.arguments ?? "");
    return writeIntentPattern.test(serialized);
}
function hasSuspiciousIntent(invocation) {
    const serialized = JSON.stringify(invocation.arguments ?? "");
    if (detectPromptInjection(serialized).length > 0)
        return true;
    return sensitiveIntentPattern.test(serialized);
}
export function validateTools(policy, tools, invocations, toolSchemas) {
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
    const insecureToolingReasons = reasons.filter((reason) => reason.startsWith("TOOL_ALLOWLIST_EMPTY") ||
        reason.startsWith("TOOL_SCHEMA_MISSING") ||
        reason.startsWith("TOOL_SCHEMA_INVALID") ||
        reason.startsWith("TOOL_SCHEMA_INVALID_DEFINITION"));
    if (insecureToolingReasons.length > 0) {
        addReason("LLM07_INSECURE_TOOLING");
    }
    return { allowed: reasons.length === 0, reasons };
}
//# sourceMappingURL=tools.js.map