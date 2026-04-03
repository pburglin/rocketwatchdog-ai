import type { FastifyInstance } from "fastify";
import { getRecentRequests, recordRecentRequest } from "../logging/recent-requests.js";

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

export function registerTrafficLogging(app: FastifyInstance<any, any, any, any, any>) {
  app.addHook("onRequest", async (request) => {
    request.rwdStartTimeMs = Date.now();
  });

  app.addHook("onResponse", async (request, reply) => {
    if (request.url.startsWith("/v1/traffic/recent")) {
      return;
    }

    const duration = Date.now() - (request.rwdStartTimeMs ?? Date.now());
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
      status_code: reply.statusCode
    });
  });
}

export function registerTrafficRoutes(
  app: FastifyInstance<any, any, any, any, any>,
  requireAuth: (request: unknown, reply: unknown) => boolean
) {
  app.get("/v1/traffic/recent", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const rawLimit = (request.query as { limit?: unknown } | undefined)?.limit;
    const limit =
      typeof rawLimit === "string"
        ? Number.parseInt(rawLimit, 10)
        : typeof rawLimit === "number"
          ? rawLimit
          : 100;
    return {
      items: getRecentRequests(Number.isFinite(limit) ? limit : 100)
    };
  });
}
