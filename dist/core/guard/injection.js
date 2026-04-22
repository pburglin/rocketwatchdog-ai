const defaultPatterns = [
    // Core system-prompt override patterns
    /ignore\s+(?:all\s+(?:previous\s+)?|the\s+)?instructions/i,
    /system\s+(?:prompt|message|instructions?)/i,
    /developer\s+(?:prompt|message|mode)/i,
    /jailbreak/i,
    /override\s+(?:the\s+)?(?:safety\s+|content\s+)?policy/i,
    /forget(?:\s+\w+)*\s+know/i, // "forget everything you know", "forget all you know"
    /new\s+instructions?:/i,
    /ama\s+ignore\s+(?:previous|laws)/i,
    /you\s+are\s+now\s+(?:in\s+)?(?:developer\s+mode|a\s+jailbreak)/i,
    // XML/markup system prompt embedding
    /<\/?system\s*\/?>/i,
    / role: ?"?system"?/i,
    /set\s+system\s+prompt/i,
    // base64 / hex / hex-encoded injection attempts
    /(?:base64|hex|encode[dk]?)\s*:?[\s\/][A-Za-z0-9+\/=]{20,}/i,
    /\\x[0-9a-f]{2}/i, // single \xHH escape
    /(?:\\x[0-9a-f]{2}){3,}/i, // 3+ \xHH escapes (hex-encoded payload)
    // markdown / xml / code-block obfuscation of system prompts
    /<\?xml[^>]*>[\s\S]*?<system\b/i,
    // privilege escalation
    /elevate(?:\s+privilege|\s+to\s+admin)/i,
    /sudo\s+(?:everything|all|root|mode|admin)/i,
    /unlock\s+(?:the\s+)?(?:secret|developer|hidden)/i,
    // multi-turn / follow-up injection sequences
    /ignore(?:ance)?\s+above\s+and\s+(?:just\s+)?(?:tell|say|output|respond)/i,
    // embedded / escaped delimiter tricks
    /(?:^|[;\n])drop\s+(?:the\s+)?(?:system\s+)?prompt/im,
    /\\[\s]*\[[\s\S]*?system[\s\S]*?\]/im,
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