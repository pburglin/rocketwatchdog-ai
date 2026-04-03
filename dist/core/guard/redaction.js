const defaultPatterns = [
    /sk-[A-Za-z0-9]{20,}/g,
    /AKIA[0-9A-Z]{16}/g,
    /(?<=Bearer\s)[A-Za-z0-9._-]+/g,
    /xox[baprs]-[A-Za-z0-9-]{10,}/g,
    /ghp_[A-Za-z0-9]{36}/g
];
const inlineFlagPattern = /^\(\?([a-z]+)\)/i;
const supportedFlags = new Set(["i", "m", "s", "u", "y"]);
export function compileRedactionPattern(pattern) {
    const match = pattern.match(inlineFlagPattern);
    let source = pattern;
    const flags = new Set(["g"]);
    if (match) {
        for (const flag of match[1] ?? "") {
            if (supportedFlags.has(flag)) {
                flags.add(flag);
            }
        }
        source = pattern.slice(match[0].length);
    }
    return new RegExp(source, Array.from(flags).join(""));
}
export function redactSecrets(input, patterns) {
    const compiled = patterns?.length
        ? patterns.map((pattern) => compileRedactionPattern(pattern))
        : defaultPatterns;
    let redacted = input;
    let hits = 0;
    for (const pattern of compiled) {
        const next = redacted.replace(pattern, () => {
            hits += 1;
            return "[REDACTED]";
        });
        redacted = next;
    }
    return { redacted, hits };
}
//# sourceMappingURL=redaction.js.map