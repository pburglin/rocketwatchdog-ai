import type { EffectivePolicy, PlatformConfig } from "../../types/config.js";
import type { GuardDecision } from "../../types/decisions.js";
import { type ToolDefinition, type ToolInvocation } from "./tools.js";
export interface GuardInput {
    text: string;
    tools?: ToolDefinition[];
    toolInvocations?: ToolInvocation[];
}
export interface GuardResult {
    decision: GuardDecision;
    normalizedText: string;
    redactedText: string;
    redactionHits: number;
}
export declare function runGuards(input: GuardInput, policy: EffectivePolicy, platform: PlatformConfig, toolSchemas: Record<string, Record<string, unknown>>): GuardResult;
