import { redactSecrets } from "../core/guard/redaction.js";
export function redactObjectStrings(payload, patterns) {
    let hits = 0;
    function walk(value) {
        if (typeof value === "string") {
            const result = redactSecrets(value, patterns);
            hits += result.hits;
            return result.redacted;
        }
        if (Array.isArray(value)) {
            return value.map((item) => walk(item));
        }
        if (value && typeof value === "object") {
            const output = {};
            for (const [key, entry] of Object.entries(value)) {
                output[key] = walk(entry);
            }
            return output;
        }
        return value;
    }
    return { redacted: walk(payload), hits };
}
//# sourceMappingURL=redact-object.js.map