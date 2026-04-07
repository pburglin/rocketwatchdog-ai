import { redactObjectStrings } from "../utils/redact-object.js";
const entries = [];
let nextId = 1;
function getMaxEntries(platform) {
    return platform.logging.debug_capture?.max_entries ?? 300;
}
function truncateLongStrings(value, maxChars) {
    if (maxChars <= 0)
        return value;
    if (typeof value === "string") {
        if (value.length <= maxChars)
            return value;
        return `${value.slice(0, maxChars)}…[truncated ${value.length - maxChars} chars]`;
    }
    if (Array.isArray(value)) {
        return value.map((item) => truncateLongStrings(item, maxChars));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
            key,
            truncateLongStrings(entry, maxChars)
        ]));
    }
    return value;
}
function maybeRedact(platform, value) {
    if (!platform.security.redact_secrets_in_logs)
        return value;
    return redactObjectStrings(value, [
        ...platform.redaction.secret_patterns,
        ...(platform.redaction.pii_patterns ?? [])
    ]).redacted;
}
export function recordDebugLog(platform, entry) {
    const maxPayloadChars = platform.logging.debug_capture?.max_payload_chars ?? 4000;
    entries.push({
        ...entry,
        id: String(nextId++),
        timestamp: entry.timestamp ?? new Date().toISOString(),
        headers: entry.headers ? maybeRedact(platform, entry.headers) : undefined,
        payload: typeof entry.payload === "undefined"
            ? undefined
            : truncateLongStrings(maybeRedact(platform, entry.payload), maxPayloadChars)
    });
    const maxEntries = getMaxEntries(platform);
    if (entries.length > maxEntries) {
        entries.splice(0, entries.length - maxEntries);
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