import type { ConfigSnapshot, EffectivePolicy, WorkloadConfig } from "../types/config.js";
import type { CanonicalRequest } from "../types/canonical.js";
import type { GuardDecision } from "../types/decisions.js";
export type RequestContext = {
    route: string;
    headers: Record<string, string>;
    payload: Record<string, unknown>;
    snapshot: ConfigSnapshot;
    canonical?: CanonicalRequest;
    policy?: EffectivePolicy;
    decision?: GuardDecision;
    target?: "llm" | "mcp";
    workload?: WorkloadConfig;
};
