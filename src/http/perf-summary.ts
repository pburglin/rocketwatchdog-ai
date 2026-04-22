import type { RecentRequestEntry } from "../logging/recent-requests.js";

export type PerfSummary = {
  count: number;
  avg_ms: number;
  p95_ms: number;
  slowest: RecentRequestEntry[];
  request_shapes: Array<{
    key: string;
    count: number;
    avg_ms: number;
    p95_ms: number;
    retries: number;
    retried_requests: number;
  }>;
  retries: {
    total: number;
    retried_requests: number;
    retry_after_ms_max: number;
  };
};

export function summarizeRecentRequests(items: RecentRequestEntry[]): PerfSummary {
  const sorted = [...items].sort((a, b) => (b.duration_ms ?? 0) - (a.duration_ms ?? 0));
  const avg = items.length
    ? items.reduce((sum, item) => sum + (item.duration_ms ?? 0), 0) / items.length
    : 0;

  const shapeBuckets = new Map<string, RecentRequestEntry[]>();
  let totalRetries = 0;
  let retriedRequests = 0;
  let retryAfterMsMax = 0;

  for (const item of items) {
    const key = [item.method, item.path, item.backend ?? "unknown", item.integration_mode ?? "proxy"].join(" ");
    const bucket = shapeBuckets.get(key) ?? [];
    bucket.push(item);
    shapeBuckets.set(key, bucket);

    const retries = item.retry_count ?? 0;
    totalRetries += retries;
    if (retries > 0) retriedRequests += 1;
    retryAfterMsMax = Math.max(retryAfterMsMax, item.retry_after_ms ?? 0);
  }

  const request_shapes = [...shapeBuckets.entries()]
    .map(([key, bucket]) => ({
      key,
      count: bucket.length,
      avg_ms: round(mean(bucket.map((item) => item.duration_ms ?? 0))),
      p95_ms: percentile95(bucket.map((item) => item.duration_ms ?? 0)),
      retries: bucket.reduce((sum, item) => sum + (item.retry_count ?? 0), 0),
      retried_requests: bucket.filter((item) => (item.retry_count ?? 0) > 0).length
    }))
    .sort((a, b) => b.avg_ms - a.avg_ms)
    .slice(0, 5);

  return {
    count: items.length,
    avg_ms: round(avg),
    p95_ms: percentile95(items.map((item) => item.duration_ms ?? 0)),
    slowest: sorted.slice(0, 5),
    request_shapes,
    retries: {
      total: totalRetries,
      retried_requests: retriedRequests,
      retry_after_ms_max: retryAfterMsMax
    }
  };
}

function percentile95(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Number(value.toFixed(2));
}
