import type { FastifyInstance } from "fastify";
import type { ConfigSnapshot, EffectivePolicy } from "../types/config.js";
import { proxyOpenAI } from "../adapters/openai.js";
import { proxyMcp } from "../adapters/mcp.js";
import { buildCanonicalRequest } from "../pipeline/normalize.js";

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(",") : value ?? "";
  }
  return normalized;
}

export function registerRoutes(
  app: FastifyInstance<any, any, any, any, any>,
  snapshot: ConfigSnapshot,
  resolvePolicy: (
    route: string,
    headers: Record<string, string>,
    payload?: Record<string, unknown>
  ) => EffectivePolicy
) {
  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => ({
    status: "ready",
    llm_backends: Object.keys(snapshot.platform.llm_backends ?? {}),
    mcp_backends: Object.keys(snapshot.platform.mcp_backends ?? {})
  }));

  app.get("/v1/config/effective", async (request, reply) => {
    if (snapshot.platform.security.redact_secrets_in_logs) {
      reply.send({ platform: "redacted" });
      return;
    }
    reply.send(snapshot);
  });

  app.post("/v1/config/reload", async () => ({ status: "not_implemented" }));

  app.post("/v1/proxy/llm", async (request, reply) => {
    const headers = normalizeHeaders(request.headers);
    const body = request.body as Record<string, unknown>;
    const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
    const canonical = buildCanonicalRequest(request, headers, body);
    await proxyOpenAI(request, reply, snapshot, policy, canonical);
  });

  app.post("/v1/proxy/mcp", async (request, reply) => {
    const headers = normalizeHeaders(request.headers);
    const body = request.body as Record<string, unknown>;
    const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
    const canonical = buildCanonicalRequest(request, headers, body);
    await proxyMcp(request, reply, snapshot, policy, canonical);
  });

  app.post("/v1/chat/completions", async (request, reply) => {
    const headers = normalizeHeaders(request.headers);
    const body = request.body as Record<string, unknown>;
    const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
    const canonical = buildCanonicalRequest(request, headers, body);
    await proxyOpenAI(request, reply, snapshot, policy, canonical);
  });

  app.post("/v1/responses", async (request, reply) => {
    const headers = normalizeHeaders(request.headers);
    const body = request.body as Record<string, unknown>;
    const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
    const canonical = buildCanonicalRequest(request, headers, body);
    await proxyOpenAI(request, reply, snapshot, policy, canonical);
  });
}
