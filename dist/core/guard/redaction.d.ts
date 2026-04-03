export declare function compileRedactionPattern(pattern: string): RegExp;
export declare function redactSecrets(input: string, patterns?: string[]): {
    redacted: string;
    hits: number;
};
