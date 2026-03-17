import type { FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import type { CanonicalRequest } from "../types/canonical.js";

export function buildCanonicalRequest(
  request: FastifyRequest,
  headers: Record<string, string>,
  payload: Record<string, unknown>
): CanonicalRequest {
  const messages = Array.isArray(payload.messages) ? (payload.messages as Record<string, unknown>[]) : [];
  const metadata = typeof payload.meta === "object" && payload.meta ? (payload.meta as Record<string, unknown>) : {};
  return {
    requestId: request.requestId ?? randomUUID(),
    timestamp: new Date().toISOString(),
    sourceApp: headers["x-rwd-source-app"],
    route: request.routerPath ?? request.url,
    headers,
    clientIp: request.ip,
    userId: metadata.userId as string | undefined,
    sessionId: metadata.sessionId as string | undefined,
    workloadHint: metadata.workload as string | undefined,
    payload,
    promptText: typeof payload.prompt === "string" ? payload.prompt : undefined,
    messages,
    metadata
  };
}
