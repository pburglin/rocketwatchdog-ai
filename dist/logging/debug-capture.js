import { redactObjectStrings } from "../utils/redact-object.js";
const entries = [];
let nextId = 1;
const MAX_DEBUG_ENTRIES = 300;
function maybeRedact(platform, value) {
    if (!platform.security.redact_secrets_in_logs)
        return value;
    return redactObjectStrings(value, [
        ...platform.redaction.secret_patterns,
        ...(platform.redaction.pii_patterns ?? [])
    ]).redacted;
}
export function recordDebugLog(platform, entry) {
    entries.push({
        ...entry,
        id: String(nextId++),
        timestamp: entry.timestamp ?? new Date().toISOString(),
        headers: entry.headers ? maybeRedact(platform, entry.headers) : undefined,
        payload: typeof entry.payload === "undefined" ? undefined : maybeRedact(platform, entry.payload)
    });
    if (entries.length > MAX_DEBUG_ENTRIES) {
        entries.splice(0, entries.length - MAX_DEBUG_ENTRIES);
    }
}
export function getDebugLogs(limit = 100, query) {
    const normalized = query?.trim().toLowerCase();
    const filtered = normalized
        ? entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(normalized))
        : entries;
    return filtered.slice(-limit).reverse();
}
//# sourceMappingURL=debug-capture.js.map