function parseJwtPayload(token) {
    const parts = token.split(".");
    if (parts.length < 2)
        return null;
    const payloadPart = parts[1];
    if (!payloadPart)
        return null;
    try {
        const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
        const payload = Buffer.from(`${normalized}${padding}`, "base64").toString("utf-8");
        return JSON.parse(payload);
    }
    catch {
        return null;
    }
}
function audMatches(payloadAud, expectedAud) {
    if (typeof payloadAud === "string")
        return payloadAud === expectedAud;
    if (Array.isArray(payloadAud))
        return payloadAud.includes(expectedAud);
    return false;
}
function isExpired(payload) {
    const exp = payload.exp;
    if (typeof exp !== "number")
        return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return exp <= nowSeconds;
}
export function authenticateRequest(request, platform) {
    const mode = platform.auth?.mode ?? "none";
    if (mode === "none") {
        return { allowed: true, status: 200 };
    }
    if (mode === "api_key") {
        const envKey = platform.auth?.api_key_env;
        if (!envKey || !process.env[envKey]) {
            return { allowed: false, status: 500, error: "api_key_env_missing" };
        }
        const expected = process.env[envKey];
        const headerKey = request.headers["x-api-key"];
        const bearer = request.headers.authorization?.replace("Bearer ", "");
        const provided = typeof headerKey === "string" ? headerKey : bearer;
        if (!provided || provided !== expected) {
            return { allowed: false, status: 401, error: "unauthorized" };
        }
        return { allowed: true, status: 200 };
    }
    if (mode === "jwt") {
        const bearer = request.headers.authorization?.replace("Bearer ", "");
        if (!bearer) {
            return { allowed: false, status: 401, error: "missing_token" };
        }
        const payload = parseJwtPayload(bearer);
        if (!payload) {
            return { allowed: false, status: 401, error: "invalid_token" };
        }
        if (isExpired(payload)) {
            return { allowed: false, status: 401, error: "token_expired" };
        }
        const expectedIssuer = platform.auth?.jwt_issuer;
        if (expectedIssuer && payload.iss !== expectedIssuer) {
            return { allowed: false, status: 401, error: "invalid_issuer" };
        }
        const expectedAudience = platform.auth?.jwt_audience;
        if (expectedAudience && !audMatches(payload.aud, expectedAudience)) {
            return { allowed: false, status: 401, error: "invalid_audience" };
        }
        return {
            allowed: true,
            status: 200,
            context: {
                ...(typeof payload.sub === "string" ? { userId: payload.sub } : {}),
                ...(Array.isArray(payload.roles) ? { roles: payload.roles } : {}),
                ...(typeof payload.iss === "string" ? { sourceApp: payload.iss } : {})
            }
        };
    }
    return { allowed: true, status: 200 };
}
//# sourceMappingURL=auth.js.map