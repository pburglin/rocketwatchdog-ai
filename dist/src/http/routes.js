import { proxyOpenAI } from "../adapters/openai.js";
import { proxyMcp } from "../adapters/mcp.js";
import { buildCanonicalRequest } from "../pipeline/normalize.js";
import { scanSkill } from "../skills/scan.js";
import { buildPipeline } from "../pipeline/build.js";
import { authenticateRequest } from "../auth/auth.js";
function normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(",") : value ?? "";
    }
    return normalized;
}
export function registerRoutes(app, snapshotManager, resolvePolicy) {
    const requireAuth = (request, reply) => {
        const snapshot = snapshotManager.get();
        const auth = authenticateRequest(request, snapshot.platform);
        if (!auth.allowed) {
            reply.code(auth.status).send({ error: auth.error ?? "unauthorized" });
            return false;
        }
        return true;
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
        if (!requireAuth(request, reply))
            return;
        reply.send(snapshotManager.getStatus());
    });
    app.get("/v1/config/effective", async (request, reply) => {
        if (!requireAuth(request, reply))
            return;
        const snapshot = snapshotManager.get();
        if (snapshot.platform.security.redact_secrets_in_logs) {
            reply.send({ platform: "redacted" });
            return;
        }
        reply.send(snapshot);
    });
    app.post("/v1/config/reload", async (request, reply) => {
        if (!requireAuth(request, reply))
            return;
        const snapshot = snapshotManager.reload();
        const error = snapshotManager.getLastError();
        if (error) {
            reply.send({ status: "error", message: error, loadedAt: snapshot.loadedAt });
            return;
        }
        reply.send({ status: "ok", loadedAt: snapshot.loadedAt });
    });
    app.post("/v1/skills/scan", async (request, reply) => {
        if (!requireAuth(request, reply))
            return;
        const body = request.body;
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
        if (!requireAuth(request, reply))
            return;
        const headers = normalizeHeaders(request.headers);
        const body = request.body;
        const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
        const snapshot = snapshotManager.get();
        const canonical = buildCanonicalRequest(request, headers, body);
        const pipeline = buildPipeline();
        const ctx = await pipeline.run({
            route: request.routerPath ?? request.url,
            headers,
            payload: body,
            snapshot,
            policy
        });
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
        await proxyOpenAI(request, reply, snapshot, policy, canonical);
    });
    app.post("/v1/proxy/mcp", async (request, reply) => {
        if (!requireAuth(request, reply))
            return;
        const headers = normalizeHeaders(request.headers);
        const body = request.body;
        const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
        const snapshot = snapshotManager.get();
        const canonical = buildCanonicalRequest(request, headers, body);
        const pipeline = buildPipeline();
        const ctx = await pipeline.run({
            route: request.routerPath ?? request.url,
            headers,
            payload: body,
            snapshot,
            policy
        });
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
        await proxyMcp(request, reply, snapshot, policy, canonical);
    });
    app.post("/v1/chat/completions", async (request, reply) => {
        if (!requireAuth(request, reply))
            return;
        const headers = normalizeHeaders(request.headers);
        const body = request.body;
        const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
        const snapshot = snapshotManager.get();
        const canonical = buildCanonicalRequest(request, headers, body);
        const pipeline = buildPipeline();
        const ctx = await pipeline.run({
            route: request.routerPath ?? request.url,
            headers,
            payload: body,
            snapshot,
            policy
        });
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
        await proxyOpenAI(request, reply, snapshot, policy, canonical);
    });
    app.post("/v1/responses", async (request, reply) => {
        if (!requireAuth(request, reply))
            return;
        const headers = normalizeHeaders(request.headers);
        const body = request.body;
        const policy = resolvePolicy(request.routerPath ?? request.url, headers, body);
        const snapshot = snapshotManager.get();
        const canonical = buildCanonicalRequest(request, headers, body);
        const pipeline = buildPipeline();
        const ctx = await pipeline.run({
            route: request.routerPath ?? request.url,
            headers,
            payload: body,
            snapshot,
            policy
        });
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
        await proxyOpenAI(request, reply, snapshot, policy, canonical);
    });
}
//# sourceMappingURL=routes.js.map