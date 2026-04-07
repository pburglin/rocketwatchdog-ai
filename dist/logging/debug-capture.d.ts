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
export declare function recordDebugLog(platform: PlatformConfig, entry: Omit<DebugLogEntry, "id" | "timestamp"> & {
    timestamp?: string;
}): void;
export declare function getDebugLogs(limit?: number, query?: string): DebugLogEntry[];
