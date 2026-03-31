import type { PlatformConfig, WorkloadConfig } from "../types/config.js";
import type { RequestContext } from "../types/request.js";
export declare function resolveWorkload(platform: PlatformConfig, workloads: WorkloadConfig[], ctx: RequestContext): WorkloadConfig | null;
