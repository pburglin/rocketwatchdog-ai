import type { PlatformConfig, WorkloadConfig } from "../types/config.js";
import type { RequestContext } from "../types/request.js";
export type WorkloadResolutionStep = {
    stage: "header_override" | "metadata_override" | "source_app_map" | "match_rules" | "fallback" | "default";
    outcome: "matched" | "skipped" | "miss";
    detail: string;
    workloadId?: string;
};
export type WorkloadResolutionTrace = {
    selectedWorkloadId: string | null;
    selectedBy: WorkloadResolutionStep["stage"] | "none";
    steps: WorkloadResolutionStep[];
};
export declare function explainWorkloadResolution(platform: PlatformConfig, workloads: WorkloadConfig[], ctx: RequestContext): WorkloadResolutionTrace;
export declare function resolveWorkload(platform: PlatformConfig, workloads: WorkloadConfig[], ctx: RequestContext): WorkloadConfig | null;
