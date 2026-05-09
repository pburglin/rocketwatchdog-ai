import type { FastifyReply, FastifyRequest } from "fastify";
import { fetch as undiciFetch } from "undici";
import type { ConfigSnapshot, EffectivePolicy } from "../types/config.js";
import type { CanonicalRequest } from "../types/canonical.js";
import { runGuards } from "../core/guard/index.js";
import { extractPrimaryText, extractToolDefinitions, extractToolInvocations } from "../utils/extract.js";
import { redactSecrets } from "../core/guard/redaction.js";
import { redactObjectStrings } from "../utils/redact-object.js";
import { redactPromptBearingContent } from "../utils/redact-prompt-content.js";
import { buildOutputRedactionPatterns, buildSafeReplyHeaders } from "./http.js";
import { detectOwaspOutputRisks } from "../core/guard/owasp.js";

function resolveOpenAiUpstreamPath(
  request: FastifyRequest,
  body: Record<string, unknown>
): "/v1/chat/completions" | "/v1/responses" {
  if (typeof request.url === "string") {
    if (request.url.includes("/v1/responses")) return "/v1/responses";
    if (request.url.includes("/v1/chat/completions")) return "/v1/chat/completions";
  }

  if (body.input !== undefined || body.instructions !== undefined) {
    return "/v1/responses";
  }

  return "/v1/chat/completions";
}

export async function proxyOpenAI(
  request: FastifyRequest,
  reply: FastifyReply,
  snapshot: ConfigSnapshot,
  policy: EffectivePolicy,
  canonical: CanonicalRequest
) {
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

  const body = request.body as Record<string, unknown>;
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

  const inputText = extractPrimaryText(body);
  const tools = extractToolDefinitions(body?.tools);
  const toolInvocations = extractToolInvocations(body);

  const guardResult = runGuards(
    { text: inputText, tools, toolInvocations },
    policy,
    snapshot.platform,
    snapshot.toolSchemas
  );

  request.log.info(
    {
      requestId: canonical.requestId,
      reasons: guardResult.decision.reasonCodes,
      redactionHits: guardResult.redactionHits
    },
    "guard_result"
  );

  if (guardResult.decision.action === "block") {
    reply.code(403).send({ error: "guard_rejected", reasons: guardResult.decision.reasonCodes });
    return;
  }

  let forwardBody = body;
  const shouldRedactInput = policy.input_guards.secret_redaction ?? false;
  if (shouldRedactInput) {
    const { redacted: redactedBody } = redactPromptBearingContent(
      body,
      snapshot.platform.redaction.secret_patterns
    );
    const { redacted: redactedTools } = redactObjectStrings(
      body?.tools,
      snapshot.platform.redaction.secret_patterns
    );
    const { redacted: redactedToolChoice } = redactObjectStrings(
      body?.tool_choice,
      snapshot.platform.redaction.secret_patterns
    );
    forwardBody = {
      ...redactedBody,
      tools: redactedTools,
      tool_choice: redactedToolChoice
    };
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-request-id": canonical.requestId
  };
  if (backend.api_key_env) {
    const apiKey = process.env[backend.api_key_env];
    if (!apiKey) {
      request.log.error(
        {
          requestId: canonical.requestId,
          backend: backendName,
          apiKeyEnv: backend.api_key_env
        },
        "llm_backend_api_key_env_missing"
      );
      reply.code(503).send({
        error: "llm_backend_auth_unavailable",
        backend: backendName,
        missing_env: backend.api_key_env
      });
      return;
    }
    headers.authorization = `Bearer ${apiKey}`;
  }

  const upstreamPath = resolveOpenAiUpstreamPath(request, body);
  const upstream = new URL(upstreamPath, backend.base_url).toString();
  let response: Response;
  try {
    response = await fetchImpl(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(forwardBody),
      signal: AbortSignal.timeout(backend.timeout_ms)
    });
  } catch (error) {
    request.log.error(
      {
        requestId: canonical.requestId,
        backend: backendName,
        upstream,
        err: error
      },
      "llm_upstream_request_failed"
    );
    reply.code(502).send({ error: "llm_upstream_request_failed", backend: backendName });
    return;
  }

  const text = await response.text();
  if (policy.max_output_chars > 0 && text.length > policy.max_output_chars) {
    reply.code(413).send({ error: "output_too_large" });
    return;
  }

  // Compute output redaction patterns (secret and/or PII)
  const patterns = buildOutputRedactionPatterns(policy, snapshot.platform);

  // Apply OWASP output policy scan when enabled — runs before redaction
  // so scan reasons accurately reflect the original content.
  const outputReasons: string[] = [];
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
    request.log.warn(
      { requestId: canonical.requestId, reasons: outputReasons },
      "output_guard_policy_violation"
    );
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
    } catch {
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
