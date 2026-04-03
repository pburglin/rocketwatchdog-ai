const DEFAULT_ALLOWED_HEADERS = [
    "content-type",
    "authorization",
    "x-api-key",
    "x-rwd-workload",
    "x-rwd-data-class",
    "x-rwd-source-app",
    "x-request-id"
];
const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "DELETE", "OPTIONS"];
function getAllowedOrigin(origin) {
    if (!origin)
        return "*";
    return origin;
}
function applyCorsHeaders(request, reply) {
    const originHeader = request.headers.origin;
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    reply.header("access-control-allow-origin", getAllowedOrigin(origin));
    reply.header("access-control-allow-credentials", "true");
    reply.header("access-control-allow-methods", DEFAULT_ALLOWED_METHODS.join(", "));
    reply.header("access-control-allow-headers", DEFAULT_ALLOWED_HEADERS.join(", "));
    reply.header("access-control-expose-headers", "content-type, x-request-id");
    reply.header("vary", "Origin");
}
export function registerCors(app) {
    app.addHook("onRequest", async (request, reply) => {
        applyCorsHeaders(request, reply);
        if (request.method === "OPTIONS") {
            reply.code(204).send();
        }
    });
}
//# sourceMappingURL=cors.js.map