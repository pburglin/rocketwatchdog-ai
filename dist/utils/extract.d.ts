export declare function extractTextFromMessages(messages: unknown): string;
export declare function extractToolDefinitions(tools: unknown): {
    name: string;
    parameters?: unknown;
}[];
export declare function extractToolInvocations(payload: unknown): {
    name: string;
    arguments?: unknown;
}[];
