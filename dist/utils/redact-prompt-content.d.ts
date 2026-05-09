export declare function redactPromptBearingContent<T>(value: T, patterns: string[]): {
    redacted: T;
    changed: boolean;
};
