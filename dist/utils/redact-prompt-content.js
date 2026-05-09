import { redactSecrets } from "../core/guard/redaction.js";
import { redactMessages } from "./redact-messages.js";
const TEXT_KEYS = new Set([
    "prompt",
    "input",
    "query",
    "response",
    "output",
    "text",
    "instructions",
    "content"
]);
const SKIP_BRANCH_KEYS = new Set([
    "tools",
    "tool_choice",
    "parameters",
    "properties",
    "$defs",
    "definitions",
    "schema",
    "json_schema",
    "response_format"
]);
const SKIP_METADATA_KEYS = new Set([
    "description",
    "title",
    "examples",
    "example",
    "enum",
    "default",
    "const",
    "required",
    "name",
    "type"
]);
const STRUCTURED_CONTEXT_KEYS = new Set([
    "previousMessages",
    "priorMessages",
    "earlierMessages",
    "messageHistory"
]);
export function redactPromptBearingContent(value, patterns) {
    const result = redactValue(value, patterns, false, 0);
    return { redacted: result.value, changed: result.changed };
}
function redactValue(value, patterns, active, depth) {
    if (depth > 6 || value === null || value === undefined) {
        return { value, changed: false };
    }
    if (typeof value === "string") {
        if (!active)
            return { value, changed: false };
        const redacted = redactSecrets(value, patterns).redacted;
        return { value: redacted, changed: redacted !== value };
    }
    if (Array.isArray(value)) {
        let changed = false;
        const redactedItems = value.map((item) => {
            const result = redactValue(item, patterns, active, depth + 1);
            changed ||= result.changed;
            return result.value;
        });
        return changed ? { value: redactedItems, changed } : { value, changed: false };
    }
    if (typeof value !== "object") {
        return { value, changed: false };
    }
    const record = value;
    let changed = false;
    const redactedRecord = { ...record };
    for (const [key, entry] of Object.entries(record)) {
        if (SKIP_BRANCH_KEYS.has(key) || SKIP_METADATA_KEYS.has(key)) {
            continue;
        }
        if (key === "messages") {
            const { redactedMessages } = redactMessages(entry, patterns);
            if (redactedMessages !== entry) {
                redactedRecord[key] = redactedMessages;
                changed = true;
            }
            continue;
        }
        const nextActive = active || TEXT_KEYS.has(key) || STRUCTURED_CONTEXT_KEYS.has(key) || key === "arguments" || key === "params";
        if (Array.isArray(entry) || (entry && typeof entry === "object") || typeof entry === "string") {
            const result = redactValue(entry, patterns, nextActive, depth + 1);
            if (result.changed) {
                redactedRecord[key] = result.value;
                changed = true;
            }
        }
    }
    return changed ? { value: redactedRecord, changed } : { value, changed: false };
}
//# sourceMappingURL=redact-prompt-content.js.map