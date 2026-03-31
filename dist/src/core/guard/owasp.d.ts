import type { ToolInvocation } from "./tools.js";
export declare function detectOwaspInputRisks(text: string, maxPromptChars: number, toolInvocations?: ToolInvocation[]): string[];
export declare function detectOwaspOutputRisks(text: string, redactionHits: number): string[];
