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
//# sourceMappingURL=http.js.map