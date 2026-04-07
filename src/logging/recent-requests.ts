export type RecentRequestEntry = {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  workload: string;
  action: "allow" | "block" | "allow_with_annotations";
  reasonCodes: string[];
  duration_ms: number;
  source_ip?: string;
  user_agent?: string;
  status_code: number;
  request_id?: string;
  backend?: string;
  integration_mode?: "proxy" | "decision";
  request_headers?: Record<string, string>;
  response_headers?: Record<string, string>;
  request_payload?: unknown;
  response_payload?: unknown;
  log_message?: string;
};

const entries: RecentRequestEntry[] = [];
let nextId = 1;
const MAX_ENTRIES = 500;

export function recordRecentRequest(entry: Omit<RecentRequestEntry, "id">) {
  entries.push({
    ...entry,
    id: String(nextId++)
  });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

export function getRecentRequests(limit = 100) {
  return entries.slice(-limit).reverse();
}
