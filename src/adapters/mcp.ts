import type { FastifyReply, FastifyRequest } from "fastify";
import { fetch } from "undici";
import type { ConfigSnapshot, EffectivePolicy } from "../types/config.js";
import type { CanonicalRequest } from "../types/canonical.js";
import { runGuards } from "../core/guard/index.js";
import { extractTextFromMessages } from "../utils/extract.js";
import { redactSecrets } from "../core/guard/redaction.js";
import { redactMessages } from "../utils/redact-messages.js";
import { redactObjectStrings } from "../utils/redact-object.js";

function extractMcpText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const prompt = (payload as { prompt?: unknown }).prompt;
  if (typeof prompt === "string") return prompt;
  const params = (payload as { params?: unknown }).params;
  if (params && typeof params === "object") {
    const messages = (params as { messages?: unknown }).messages;
    const fromMessages = extractTextFromMessages(messages);
    if (fromMessages) return fromMessages;
  }
  return "";
}

export async function proxyMcp(
  request: FastifyRequest,
  reply: FastifyReply,
  snapshot: ConfigSnapshot,
  policy: EffectivePolicy,
  canonical: CanonicalRequest
) {
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

  const body = request.body as Record<string, unknown>;
  const inputText = extractMcpText(body);
  const toolInvocations =
    typeof body.tool === "string"
      ? [{ name: body.tool as string, arguments: body.arguments }]
      : undefined;
  const guardResult = runGuards(
    { text: inputText, toolInvocations },
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
  if (policy.output_guards.secret_redaction && typeof inputText === "string") {
    const { redacted } = redactSecrets(inputText, snapshot.platform.redaction.secret_patterns);
    if (typeof body.prompt === "string") {
      forwardBody = { ...forwardBody, prompt: redacted };
    }
  }

  if (policy.output_guards.secret_redaction) {
    const params = body.params;
    if (params && typeof params === "object") {
      const messages = (params as { messages?: unknown }).messages;
      const { redactedMessages } = redactMessages(messages, snapshot.platform.redaction.secret_patterns);
      if (redactedMessages !== messages) {
        forwardBody = {
          ...forwardBody,
          params: {
            ...(params as Record<string, unknown>),
            messages: redactedMessages
          }
        };
      }
    }
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-request-id": canonical.requestId
  };
  if (backend.auth?.type === "bearer_env" && backend.auth.token_env) {
    const token = process.env[backend.auth.token_env];
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(backend.base_url, {
    method: "POST",
    headers,
    body: JSON.stringify(forwardBody),
    signal: AbortSignal.timeout(backend.timeout_ms)
  });

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
    } catch {
      const fallback = redactSecrets(text, patterns);
      reply.code(response.status);
      reply.headers(Object.fromEntries(response.headers.entries()));
      reply.send(fallback.redacted);
      return;
    }
  }

  reply.code(response.status);
  reply.headers(Object.fromEntries(response.headers.entries()));
  reply.send(text);
}
