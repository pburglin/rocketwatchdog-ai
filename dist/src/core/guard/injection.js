const defaultPatterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s+prompt/i,
    /developer\s+message/i,
    /jailbreak/i,
    /override\s+policy/i
];
export function detectPromptInjection(input, patterns) {
    const hits = [];
    const compiled = patterns?.length
        ? patterns.map((pattern) => new RegExp(pattern, "i"))
        : defaultPatterns;
    for (const pattern of compiled) {
        if (pattern.test(input)) {
            hits.push(pattern.toString());
        }
    }
    return hits;
}
//# sourceMappingURL=injection.js.map