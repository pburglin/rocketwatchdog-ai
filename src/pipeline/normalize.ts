import type { FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import type { CanonicalRequest } from "../types/canonical.js";
import { getRequestRoute } from "../http/request-route.js";

export function buildCanonicalRequest(
  request: FastifyRequest,
  headers: Record<string, string>,
  payload: Record<string, unknown>
): CanonicalRequest {
  const messages = Array.isArray(payload.messages) ? (payload.messages as Record<string, unknown>[]) : [];
  const metadata = typeof payload.meta === "object" && payload.meta ? (payload.meta as Record<string, unknown>) : {};
  const sourceApp = headers["x-rwd-source-app"];
  const userId = typeof metadata.userId === "string" ? metadata.userId : undefined;
  const sessionId = typeof metadata.sessionId === "string" ? metadata.sessionId : undefined;
  const workloadHint = typeof metadata.workload === "string" ? metadata.workload : undefined;
  const promptText = typeof payload.prompt === "string" ? payload.prompt : undefined;
  return {
    requestId: request.requestId ?? randomUUID(),
    timestamp: new Date().toISOString(),
    ...(sourceApp ? { sourceApp } : {}),
    route: getRequestRoute(request),
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
