const unsafeReplyHeaders = new Set([
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "proxy-connection",
    "set-cookie",
    "set-cookie2",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade"
]);
export function buildSafeReplyHeaders(headers) {
    const forwarded = {};
    for (const [key, value] of headers.entries()) {
        if (unsafeReplyHeaders.has(key.toLowerCase()))
            continue;
        forwarded[key] = value;
    }
    return forwarded;
}
export function buildOutputRedactionPatterns(policy, platform) {
    const patterns = [];
    if (policy.output_guards.secret_redaction) {
        patterns.push(...platform.redaction.secret_patterns);
    }
    if (policy.output_guards.pii_redaction) {
        patterns.push(...(platform.redaction.pii_patterns ?? []));
    }
    return patterns;
}
//# sourceMappingURL=http.js.map