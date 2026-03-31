import type { PlatformConfig } from "../types/config.js";
export type AuditEntry = {
    request_id?: string;
    workload_id?: string;
    level?: string;
    decision?: string;
    reason_codes?: string[];
    prompt_text?: string;
};
export declare function writeAuditLog(platform: PlatformConfig, entry: AuditEntry): void;
