import { randomUUID } from "node:crypto";
export function buildCanonicalRequest(request, headers, payload) {
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const metadata = typeof payload.meta === "object" && payload.meta ? payload.meta : {};
    const sourceApp = headers["x-rwd-source-app"];
    const userId = typeof metadata.userId === "string" ? metadata.userId : undefined;
    const sessionId = typeof metadata.sessionId === "string" ? metadata.sessionId : undefined;
    const workloadHint = typeof metadata.workload === "string" ? metadata.workload : undefined;
    const promptText = typeof payload.prompt === "string" ? payload.prompt : undefined;
    return {
        requestId: request.requestId ?? randomUUID(),
        timestamp: new Date().toISOString(),
        ...(sourceApp ? { sourceApp } : {}),
        route: request.routerPath ?? request.url,
        headers,
        ...(request.ip ? { clientIp: request.ip } : {}),
        ...(userId ? { userId } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(workloadHint ? { workloadHint } : {}),
        payload,
        ...(promptText ? { promptText } : {}),
        messages,
        metadata
    };
}
//# sourceMappingURL=normalize.js.map