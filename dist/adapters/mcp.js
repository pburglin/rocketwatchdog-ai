import { fetch as undiciFetch } from "undici";
import { runGuards } from "../core/guard/index.js";
import { extractPrimaryText } from "../utils/extract.js";
import { redactSecrets } from "../core/guard/redaction.js";
import { redactMessages } from "../utils/redact-messages.js";
import { redactObjectStrings } from "../utils/redact-object.js";
import { buildOutputRedactionPatterns, buildSafeReplyHeaders } from "./http.js";
import { detectOwaspOutputRisks } from "../core/guard/owasp.js";
function extractMcpToolInvocations(payload) {
    if (typeof payload.tool === "string") {
        return [{ name: payload.tool, arguments: payload.arguments }];
    }
    if (payload.method === "tools/call") {
        const params = payload.params;
        if (params && typeof params === "object" && typeof params.name === "string") {
            return [{
                    name: params.name,
                    arguments: params.arguments
                }];
        }
    }
    return undefined;
}
export async function proxyMcp(request, reply, snapshot, policy, canonical) {
    const fetchImpl = globalThis.fetch ?? undiciFetch;
    const backendName = policy.allowed_mcp_backends[0];
    if (!backendName) {
        reply.code(403).send({ error: "mcp_backend_not_allowed" });
        return;
    }
    const backend = snapshot.platform.mcp_backends[backendName];
    if (!backend) {
        reply.code(503).send({ error: "mcp_backend_unavailable" });
        return;
    }
    const body = request.body;
    const inputText = extractPrimaryText(body);
    const toolInvocations = extractMcpToolInvocations(body);
    const guardResult = runGuards({
        text: inputText,
        ...(toolInvocations ? { toolInvocations } : {})
    }, policy, snapshot.platform, snapshot.toolSchemas);
    request.log.info({
        requestId: canonical.requestId,
        reasons: guardResult.decision.reasonCodes,
        redactionHits: guardResult.redactionHits
    }, "guard_result");
    if (guardResult.decision.action === "block") {
        reply.code(403).send({ error: "guard_rejected", reasons: guardResult.decision.reasonCodes });
        return;
    }
    let forwardBody = body;
    const shouldRedactInput = policy.input_guards.secret_redaction ?? false;
    if (shouldRedactInput && typeof inputText === "string") {
        const { redacted } = redactSecrets(inputText, snapshot.platform.redaction.secret_patterns);
        if (typeof body.prompt === "string") {
            forwardBody = { ...forwardBody, prompt: redacted };
        }
    }
    if (shouldRedactInput) {
        const { redacted: redactedArguments } = redactObjectStrings(body.arguments, snapshot.platform.redaction.secret_patterns);
        forwardBody = {
            ...forwardBody,
            arguments: redactedArguments
        };
        const params = body.params;
        if (params && typeof params === "object") {
            const messages = params.messages;
            const prompt = params.prompt;
            const { redactedMessages } = redactMessages(messages, snapshot.platform.redaction.secret_patterns);
            const { redacted: redactedParamsArguments } = redactObjectStrings(params.arguments, snapshot.platform.redaction.secret_patterns);
            const redactedPrompt = typeof prompt === "string"
                ? redactSecrets(prompt, snapshot.platform.redaction.secret_patterns).redacted
                : prompt;
            if (redactedMessages !== messages ||
                redactedParamsArguments !== params.arguments ||
                redactedPrompt !== prompt) {
                forwardBody = {
                    ...forwardBody,
                    params: {
                        ...params,
                        messages: redactedMessages,
                        arguments: redactedParamsArguments,
                        ...(typeof redactedPrompt === "string" ? { prompt: redactedPrompt } : {})
                    }
                };
            }
        }
    }
    const headers = {
        "content-type": "application/json",
        "x-request-id": canonical.requestId
    };
    if (backend.auth?.type === "bearer_env" && backend.auth.token_env) {
        const token = process.env[backend.auth.token_env];
        if (!token) {
            request.log.error({
                requestId: canonical.requestId,
                backend: backendName,
                tokenEnv: backend.auth.token_env
            }, "mcp_backend_token_env_missing");
            reply.code(503).send({
                error: "mcp_backend_auth_unavailable",
                backend: backendName,
                missing_env: backend.auth.token_env
            });
            return;
        }
        headers.authorization = `Bearer ${token}`;
    }
    let response;
    try {
        response = await fetchImpl(backend.base_url, {
            method: "POST",
            headers,
            body: JSON.stringify(forwardBody),
            signal: AbortSignal.timeout(backend.timeout_ms)
        });
    }
    catch (error) {
        request.log.error({
            requestId: canonical.requestId,
            backend: backendName,
            upstream: backend.base_url,
            err: error
        }, "mcp_upstream_request_failed");
        reply.code(502).send({ error: "mcp_upstream_request_failed", backend: backendName });
        return;
    }
    const text = await response.text();
    if (policy.max_output_chars > 0 && text.length > policy.max_output_chars) {
        reply.code(413).send({ error: "output_too_large" });
        return;
    }
    const patterns = buildOutputRedactionPatterns(policy, snapshot.platform);
    const outputReasons = [];
    if (policy.output_guards.output_policy_scan) {
        const redactedForScan = redactSecrets(text, patterns);
        outputReasons.push(...detectOwaspOutputRisks(text, redactedForScan.hits));
    }
    if (outputReasons.length > 0) {
        request.rwdTrafficMeta = {
            ...request.rwdTrafficMeta,
            decision: "block",
            reasonCodes: outputReasons
        };
        request.log.warn({ requestId: canonical.requestId, reasons: outputReasons }, "output_guard_policy_violation");
        reply.code(403).send({ error: "output_guard_rejected", reasons: outputReasons });
        return;
    }
    if (patterns.length > 0 && response.headers.get("content-type")?.includes("application/json")) {
        try {
            const parsed = JSON.parse(text);
            const redacted = redactObjectStrings(parsed, patterns);
            reply.code(response.status);
            reply.headers(buildSafeReplyHeaders(response.headers));
            reply.send(JSON.stringify(redacted.redacted));
            return;
        }
        catch {
            const fallback = redactSecrets(text, patterns);
            reply.code(response.status);
            reply.headers(buildSafeReplyHeaders(response.headers));
            reply.send(fallback.redacted);
            return;
        }
    }
    if (patterns.length > 0) {
        const fallback = redactSecrets(text, patterns);
        reply.code(response.status);
        reply.headers(buildSafeReplyHeaders(response.headers));
        reply.send(fallback.redacted);
        return;
    }
    reply.code(response.status);
    reply.headers(buildSafeReplyHeaders(response.headers));
    reply.send(text);
}
//# sourceMappingURL=mcp.js.map