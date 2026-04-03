import { fetch as undiciFetch } from "undici";
import { runGuards } from "../core/guard/index.js";
import { extractTextFromMessages, extractToolDefinitions, extractToolInvocations } from "../utils/extract.js";
import { redactMessages } from "../utils/redact-messages.js";
import { redactSecrets } from "../core/guard/redaction.js";
import { redactObjectStrings } from "../utils/redact-object.js";
export async function proxyOpenAI(request, reply, snapshot, policy, canonical) {
    const fetchImpl = globalThis.fetch ?? undiciFetch;
    const backendName = policy.allowed_llm_backends[0];
    if (!backendName) {
        reply.code(403).send({ error: "llm_backend_not_allowed" });
        return;
    }
    const backend = snapshot.platform.llm_backends[backendName];
    if (!backend) {
        reply.code(503).send({ error: "llm_backend_unavailable" });
        return;
    }
    const body = request.body;
    const model = typeof body?.model === "string" ? body.model : undefined;
    if (policy.allowed_models.length > 0) {
        if (!model) {
            reply.code(400).send({ error: "model_required" });
            return;
        }
        if (!policy.allowed_models.includes(model)) {
            reply.code(403).send({ error: "model_not_allowed", model });
            return;
        }
    }
    const messages = body?.messages;
    const inputText = extractTextFromMessages(messages);
    const tools = extractToolDefinitions(body?.tools);
    const toolInvocations = extractToolInvocations(body);
    const guardResult = runGuards({ text: inputText, tools, toolInvocations }, policy, snapshot.platform, snapshot.toolSchemas);
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
    if (shouldRedactInput) {
        const { redactedMessages } = redactMessages(messages, snapshot.platform.redaction.secret_patterns);
        forwardBody = { ...body, messages: redactedMessages };
    }
    const headers = {
        "content-type": "application/json",
        "x-request-id": canonical.requestId
    };
    if (backend.api_key_env) {
        const apiKey = process.env[backend.api_key_env];
        if (apiKey)
            headers.authorization = `Bearer ${apiKey}`;
    }
    const upstream = new URL("/v1/chat/completions", backend.base_url).toString();
    let response;
    try {
        response = await fetchImpl(upstream, {
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
            upstream,
            err: error
        }, "llm_upstream_request_failed");
        reply.code(502).send({ error: "llm_upstream_request_failed", backend: backendName });
        return;
    }
    const text = await response.text();
    if (policy.max_output_chars > 0 && text.length > policy.max_output_chars) {
        reply.code(413).send({ error: "output_too_large" });
        return;
    }
    const patterns = [
        ...snapshot.platform.redaction.secret_patterns,
        ...(policy.output_guards.pii_redaction ? snapshot.platform.redaction.pii_patterns ?? [] : [])
    ];
    if (patterns.length > 0 && response.headers.get("content-type")?.includes("application/json")) {
        try {
            const parsed = JSON.parse(text);
            const redacted = redactObjectStrings(parsed, patterns);
            reply.code(response.status);
            reply.headers(Object.fromEntries(response.headers.entries()));
            reply.send(JSON.stringify(redacted.redacted));
            return;
        }
        catch {
            const fallback = redactSecrets(text, patterns);
            reply.code(response.status);
            reply.headers(Object.fromEntries(response.headers.entries()));
            reply.send(fallback.redacted);
            return;
        }
    }
    if (patterns.length > 0) {
        const fallback = redactSecrets(text, patterns);
        reply.code(response.status);
        reply.headers(Object.fromEntries(response.headers.entries()));
        reply.send(fallback.redacted);
        return;
    }
    reply.code(response.status);
    reply.headers(Object.fromEntries(response.headers.entries()));
    reply.send(text);
}
//# sourceMappingURL=openai.js.map