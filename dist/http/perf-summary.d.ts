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
    output_policy_blocks: {
        total: number;
        by_reason: Record<string, number>;
    };
};
export declare function summarizeRecentRequests(items: RecentRequestEntry[]): PerfSummary;
