import type { EffectivePolicy } from "../../types/config.js";
export interface ToolDefinition {
    name: string;
    parameters?: unknown;
}
export interface ToolInvocation {
    name: string;
    arguments?: unknown;
}
export interface ToolValidationResult {
    allowed: boolean;
    reasons: string[];
}
export declare function validateTools(policy: EffectivePolicy, tools: ToolDefinition[] | undefined, invocations: ToolInvocation[] | undefined, toolSchemas: Record<string, Record<string, unknown>>): ToolValidationResult;
