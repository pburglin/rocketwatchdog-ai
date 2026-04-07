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
const MAX_DEBUG_ENTRIES = 300;

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

export function getDebugLogs(limit = 100, query?: string) {
  const normalized = query?.trim().toLowerCase();
  const filtered = normalized
    ? entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(normalized))
    : entries;
  return filtered.slice(-limit).reverse();
}
