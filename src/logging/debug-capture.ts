import { redactObjectStrings } from "../utils/redact-object.js";
import type { PlatformConfig } from "../types/config.js";

export type DebugLogEntry = {
  id: string;
  timestamp: string;
  requestId?: string | undefined;
  stage: "request" | "response" | "decision";
  path?: string | undefined;
  method?: string | undefined;
  workload?: string | undefined;
  statusCode?: number | undefined;
  sourceIp?: string | undefined;
  message: string;
  headers?: Record<string, string> | undefined;
  payload?: unknown;
};

const entries: DebugLogEntry[] = [];
let nextId = 1;

function getMaxEntries(platform: PlatformConfig) {
  return platform.logging.debug_capture?.max_entries ?? 300;
}

function truncateLongStrings(value: unknown, maxChars: number): unknown {
  if (maxChars <= 0) return value;
  if (typeof value === "string") {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars)}…[truncated ${value.length - maxChars} chars]`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => truncateLongStrings(item, maxChars));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        truncateLongStrings(entry, maxChars)
      ])
    );
  }
  return value;
}

function maybeRedact<T>(platform: PlatformConfig, value: T): T {
  if (!platform.security.redact_secrets_in_logs) return value;
  return redactObjectStrings(value, [
    ...platform.redaction.secret_patterns,
    ...(platform.redaction.pii_patterns ?? [])
  ]).redacted as T;
}

export function recordDebugLog(
  platform: PlatformConfig,
  entry: Omit<DebugLogEntry, "id" | "timestamp"> & { timestamp?: string }
) {
  const maxPayloadChars = platform.logging.debug_capture?.max_payload_chars ?? 4000;
  entries.push({
    ...entry,
    id: String(nextId++),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    headers: entry.headers ? maybeRedact(platform, entry.headers) : undefined,
    payload:
      typeof entry.payload === "undefined"
        ? undefined
        : truncateLongStrings(maybeRedact(platform, entry.payload), maxPayloadChars)
  });
  const maxEntries = getMaxEntries(platform);
  if (entries.length > maxEntries) {
    entries.splice(0, entries.length - maxEntries);
  }
}

export function getDebugLogs(limit = 100, query?: string) {
  const normalized = query?.trim().toLowerCase();
  const filtered = normalized
    ? entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(normalized))
    : entries;
  return filtered.slice(-limit).reverse();
}
