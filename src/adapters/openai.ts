import type { FastifyReply, FastifyRequest } from "fastify";
import { fetch } from "undici";
import type { ConfigSnapshot, EffectivePolicy } from "../types/config.js";
import type { CanonicalRequest } from "../types/canonical.js";
import { runGuards } from "../core/guard/index.js";
import { extractTextFromMessages, extractToolDefinitions, extractToolInvocations } from "../utils/extract.js";
import { redactMessages } from "../utils/redact-messages.js";

export async function proxyOpenAI(
  request: FastifyRequest,
  reply: FastifyReply,
  snapshot: ConfigSnapshot,
  policy: EffectivePolicy,
  canonical: CanonicalRequest
) {
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
  const messages = body?.messages;
  const inputText = extractTextFromMessages(messages);
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
  if (policy.output_guards.secret_redaction) {
    const { redactedMessages } = redactMessages(messages, snapshot.platform.redaction.secret_patterns);
    forwardBody = { ...body, messages: redactedMessages };
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-request-id": canonical.requestId
  };
  if (backend.api_key_env) {
    const apiKey = process.env[backend.api_key_env];
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  }

  const upstream = new URL("/v1/chat/completions", backend.base_url).toString();
  const response = await fetch(upstream, {
    method: "POST",
    headers,
    body: JSON.stringify(forwardBody),
    signal: AbortSignal.timeout(backend.timeout_ms)
  });

  const text = await response.text();
  reply.code(response.status);
  reply.headers(Object.fromEntries(response.headers.entries()));
  reply.send(text);
}
