import type { FastifyInstance } from "fastify";
import type { EffectivePolicy } from "../types/config.js";
import { proxyOpenAI } from "../adapters/openai.js";
import { proxyMcp } from "../adapters/mcp.js";
import { buildCanonicalRequest } from "../pipeline/normalize.js";
import { ConfigSnapshotManager } from "../config/snapshot.js";
import { scanSkill } from "../skills/scan.js";
import { buildPipeline } from "../pipeline/build.js";
import { authenticateRequest } from "../auth/auth.js";
import { getRequestRoute } from "./request-route.js";
import { sanitizeSnapshotForExposure } from "../config/exposure.js";
import { removeWorkloadConfig, upsertWorkloadConfig } from "../config/workloads.js";
import type { WorkloadConfig } from "../types/config.js";
import { registerTrafficRoutes } from "./traffic.js";
import { isDebugModeEnabled } from "../logging/debug-runtime.js";
import { recordDebugLog } from "../logging/debug-capture.js";

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
  snapshotManager: ConfigSnapshotManager,
  resolvePolicy: (
    route: string,
    headers: Record<string, string>,
    payload?: Record<string, unknown>
  ) => EffectivePolicy
) {
  app.decorate("snapshotManager", snapshotManager);

  const requireAuth = (request: any, reply: any) => {
    const snapshot = snapshotManager.get();
    const auth = authenticateRequest(request, snapshot.platform);
    if (!auth.allowed) {
      reply.code(auth.status).send({ error: auth.error ?? "unauthorized" });
      return false;
    }
    return true;
  };

  registerTrafficRoutes(app, requireAuth);

  const handleProxyRequest = async (
    request: any,
    reply: any,
    forcedTarget?: "llm" | "mcp"
  ) => {
    if (!requireAuth(request, reply)) return;
    const headers = normalizeHeaders(request.headers);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const route = getRequestRoute(request);
    const snapshot = snapshotManager.get();
    const canonical = buildCanonicalRequest(request, headers, body);
    request.rwdCanonicalRequest = canonical;

    if (isDebugModeEnabled()) {
      recordDebugLog(snapshot.platform, {
        requestId: canonical.requestId,
        stage: "request",
        path: route,
        method: request.method,
        sourceIp: request.ip,
        message: `request ${request.method} ${route}`,
        headers,
        payload: canonical.payload
      });
    }

    const pipeline = buildPipeline();
    const ctx = await pipeline.run({
      route,
      headers,
      payload: body,
      snapshot
    });
    const integrationMode = snapshot.platform.logging.integration_mode ?? "proxy";
    const target = forcedTarget ?? ctx.target ?? "llm";
    const backendName = target === "mcp" ? ctx.policy?.allowed_mcp_backends?.[0] : ctx.policy?.allowed_llm_backends?.[0];
    request.rwdTrafficMeta = {
      workloadId: ctx.workload?.id,
      reasonCodes: ctx.decision?.reasonCodes ?? [],
      decision: ctx.decision?.action,
      backend: backendName,
      integrationMode
    };

    if (isDebugModeEnabled()) {
      recordDebugLog(snapshot.platform, {
        requestId: canonical.requestId,
        stage: "decision",
        path: route,
        method: request.method,
        workload: ctx.workload?.id,
        sourceIp: request.ip,
        message: `decision ${ctx.decision?.action ?? "allow"}`,
        payload: {
          decision: ctx.decision?.action ?? "allow",
          reasonCodes: ctx.decision?.reasonCodes ?? [],
          workload: ctx.workload?.id
        }
      });
    }

    if (ctx.decision?.action === "block") {
      const override = ctx.workload?.actions?.on_block;
      reply
        .code(override?.http_status ?? 403)
        .send({
          error: "guard_rejected",
          reasons: ctx.decision.reasonCodes,
          message: override?.message
        });
      return;
    }

    if (!ctx.policy) {
      const policy = resolvePolicy(route, headers, body);
      ctx.policy = policy;
    }

    if (integrationMode === "decision") {
      reply.send({
        requestId: canonical.requestId,
        allowed: true,
        action: ctx.decision?.action ?? "allow",
        reasons: ctx.decision?.reasonCodes ?? [],
        workload: ctx.policy?.workload_id ?? ctx.workload?.id,
        target
      });
      return;
    }

    if (target === "mcp") {
      await proxyMcp(request, reply, snapshot, ctx.policy, canonical);
      return;
    }

    await proxyOpenAI(request, reply, snapshot, ctx.policy, canonical);
  };

  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => {
    const snapshot = snapshotManager.get();
    const status = snapshotManager.getStatus();
    return {
      status: status.lastError ? "degraded" : "ready",
      llm_backends: Object.keys(snapshot.platform.llm_backends ?? {}),
      mcp_backends: Object.keys(snapshot.platform.mcp_backends ?? {}),
      config: {
        loadedAt: status.loadedAt,
        lastReloadAttemptAt: status.lastReloadAttemptAt,
        lastReloadSucceededAt: status.lastReloadSucceededAt,
        lastError: status.lastError,
        isUsingLastKnownGood: status.isUsingLastKnownGood
      }
    };
  });

  app.get("/v1/config/status", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    reply.send(snapshotManager.getStatus());
  });

  app.get("/v1/config/effective", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const snapshot = snapshotManager.get();
    reply.send(sanitizeSnapshotForExposure(snapshot));
  });

  app.post("/v1/config/reload", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const snapshot = snapshotManager.reload();
    const error = snapshotManager.getLastError();
    if (error) {
      reply.send({ status: "error", message: error, loadedAt: snapshot.loadedAt });
      return;
    }
    reply.send({ status: "ok", loadedAt: snapshot.loadedAt });
  });

  app.post("/v1/config/workloads", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = request.body as WorkloadConfig | undefined;
    if (!body?.id || !body.match || !body.policy?.level) {
      reply.code(400).send({ error: "invalid_workload_payload" });
      return;
    }

    try {
      const result = upsertWorkloadConfig(snapshotManager, body);
      reply.send({
        status: "ok",
        workloadId: body.id,
        filePath: result.filePath,
        loadedAt: result.snapshot.loadedAt
      });
    } catch (error) {
      reply.code(400).send({
        error: "workload_update_failed",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/v1/config/workloads/:id", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const params = request.params as { id?: string };
    if (!params.id) {
      reply.code(400).send({ error: "workload_id_required" });
      return;
    }

    try {
      const result = removeWorkloadConfig(snapshotManager, params.id);
      reply.send({
        status: "ok",
        workloadId: params.id,
        filePath: result.filePath,
        loadedAt: result.snapshot.loadedAt
      });
    } catch (error) {
      reply.code(400).send({
        error: "workload_delete_failed",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/v1/skills/scan", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = request.body as { name?: string; content?: string; maxRiskScore?: number };
    if (!body?.content) {
      reply.code(400).send({ error: "content_required" });
      return;
    }
    const snapshot = snapshotManager.get();
    const threshold = body.maxRiskScore ?? snapshot.platform.skills?.max_risk_score ?? 20;
    const result = scanSkill(body.content, threshold);
    if (!result.allowed || result.riskScore >= threshold) {
      reply.code(403).send({ ...result, blocked: true });
      return;
    }
    reply.send({ ...result, blocked: false });
  });

  app.post("/v1/proxy/llm", async (request, reply) => {
    await handleProxyRequest(request, reply, "llm");
  });

  app.post("/v1/proxy/mcp", async (request, reply) => {
    await handleProxyRequest(request, reply, "mcp");
  });

  app.post("/v1/chat/completions", async (request, reply) => {
    await handleProxyRequest(request, reply, "llm");
  });

  app.post("/v1/responses", async (request, reply) => {
    await handleProxyRequest(request, reply, "llm");
  });

  app.post("/v1/decision", async (request, reply) => {
    const snapshot = snapshotManager.get();
    const previous = snapshot.platform.logging.integration_mode;
    snapshot.platform.logging.integration_mode = "decision";
    try {
      await handleProxyRequest(request, reply);
    } finally {
      if (previous) {
        snapshot.platform.logging.integration_mode = previous;
      } else {
        delete snapshot.platform.logging.integration_mode;
      }
    }
  });

  app.post("/v1/*", async (request, reply) => {
    await handleProxyRequest(request, reply);
  });
}
