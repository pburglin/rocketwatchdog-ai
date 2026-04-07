import type { FastifyInstance } from "fastify";
import { getDebugLogs, recordDebugLog } from "../logging/debug-capture.js";
import { getRecentRequests, recordRecentRequest } from "../logging/recent-requests.js";
import { isDebugModeEnabled, setDebugModeEnabled } from "../logging/debug-runtime.js";

function toAction(
  statusCode: number,
  decision?: string
): "allow" | "block" | "allow_with_annotations" {
  if (decision === "block") return "block";
  if (decision === "allow_with_annotations") return "allow_with_annotations";
  if (statusCode >= 500) return "block";
  if (statusCode >= 400) return "allow_with_annotations";
  return "allow";
}

function stringifyPayload(payload: unknown) {
  return typeof payload === "undefined" ? undefined : payload;
}

export function registerTrafficLogging(app: FastifyInstance<any, any, any, any, any>) {
  app.addHook("onRequest", async (request) => {
    request.rwdStartTimeMs = Date.now();
  });

  app.addHook("onResponse", async (request, reply) => {
    if (request.url.startsWith("/v1/traffic/recent") || request.url.startsWith("/v1/debug")) {
      return;
    }

    const duration = Date.now() - (request.rwdStartTimeMs ?? Date.now());
    const current = app.snapshotManager?.get?.();
    const requestHeaders = Object.fromEntries(
      Object.entries(request.headers).flatMap(([key, value]) =>
        typeof value === "undefined"
          ? []
          : [[key, Array.isArray(value) ? value.join(",") : String(value)]]
      )
    );
    const responseHeaders = Object.fromEntries(
      Object.entries(reply.getHeaders()).flatMap(([key, value]) =>
        typeof value === "undefined"
          ? []
          : [[key, Array.isArray(value) ? value.join(",") : String(value)]]
      )
    );

    recordRecentRequest({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.url,
      workload: request.rwdTrafficMeta?.workloadId ?? "platform",
      action: toAction(reply.statusCode, request.rwdTrafficMeta?.decision),
      reasonCodes: request.rwdTrafficMeta?.reasonCodes ?? [],
      duration_ms: duration,
      ...(request.ip ? { source_ip: request.ip } : {}),
      ...(typeof request.headers["user-agent"] === "string"
        ? { user_agent: request.headers["user-agent"] }
        : {}),
      status_code: reply.statusCode,
      ...(request.requestId ? { request_id: request.requestId } : {}),
      ...(isDebugModeEnabled()
        ? {
            request_headers: requestHeaders,
            response_headers: responseHeaders,
            request_payload: stringifyPayload(request.rwdCanonicalRequest?.payload ?? request.body),
            response_payload: stringifyPayload((reply as any).payload),
            log_message: JSON.stringify({
              requestId: request.requestId,
              sourceIp: request.ip,
              path: request.url,
              requestHeaders,
              responseHeaders,
              requestPayload: request.rwdCanonicalRequest?.payload ?? request.body,
              responsePayload: (reply as any).payload
            })
          }
        : {})
    });

    if (current && isDebugModeEnabled()) {
      recordDebugLog(current.platform, {
        requestId: request.requestId,
        stage: "response",
        path: request.url,
        method: request.method,
        workload: request.rwdTrafficMeta?.workloadId,
        statusCode: reply.statusCode,
        sourceIp: request.ip,
        message: `response ${request.method} ${request.url}`,
        headers: responseHeaders,
        payload: (reply as any).payload
      });
    }
  });
}

export function registerTrafficRoutes(
  app: FastifyInstance<any, any, any, any, any>,
  requireAuth: (request: unknown, reply: unknown) => boolean
) {
  app.get("/v1/traffic/recent", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const query = request.query as { limit?: unknown; q?: unknown } | undefined;
    const rawLimit = query?.limit;
    const limit =
      typeof rawLimit === "string"
        ? Number.parseInt(rawLimit, 10)
        : typeof rawLimit === "number"
          ? rawLimit
          : 100;
    const q = typeof query?.q === "string" ? query.q : undefined;
    return {
      items: getRecentRequests(Number.isFinite(limit) ? limit : 100).filter((entry) =>
        q ? JSON.stringify(entry).toLowerCase().includes(q.toLowerCase()) : true
      )
    };
  });

  app.get("/v1/debug/status", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    return { enabled: isDebugModeEnabled() };
  });

  app.post("/v1/debug/status", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = (request.body ?? {}) as { enabled?: unknown };
    const enabled = Boolean(body.enabled);
    setDebugModeEnabled(enabled);
    return { enabled };
  });

  app.get("/v1/debug/logs", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const query = request.query as { limit?: unknown; q?: unknown } | undefined;
    const rawLimit = query?.limit;
    const limit =
      typeof rawLimit === "string"
        ? Number.parseInt(rawLimit, 10)
        : typeof rawLimit === "number"
          ? rawLimit
          : 100;
    const q = typeof query?.q === "string" ? query.q : undefined;
    return { items: getDebugLogs(Number.isFinite(limit) ? limit : 100, q) };
  });
}
