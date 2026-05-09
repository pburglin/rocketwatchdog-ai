# RocketWatchDog.ai Task List

## Done
- Surface output-policy rejection counts in troubleshooting by carrying adapter-level rejection reasons into the traffic buffer, CLI perf summaries, and performance UI.
- Add workload-routing explain traces in CLI/dry-run output so operators can see exactly why a request matched a given workload.
- Harden config validation for backend URLs, duplicate models, and auth env requirements.
- Add debug capture retention and payload truncation controls in config.
- Redact OpenAI tool metadata and MCP tool arguments when input secret redaction is enabled.
- Strip unsafe upstream response headers before forwarding replies.
- Expose control-plane admin UI pages for dashboard, policies, integrations, traffic, and settings.
- Add admin-controlled debug mode with request/response header and payload capture for troubleshooting.
- Add traffic/log filtering in the UI so admins can search log messages by arbitrary substrings such as correlation IDs, source IPs, or header values.
- Support and document two integration patterns:
  - Proxy mode: RocketWatchDog.ai forwards to the LLM/MCP backend.
  - Decision mode: RocketWatchDog.ai returns an allow/block decision only, and the upstream API gateway performs the provider call.
- Persist operator-controlled runtime settings like debug mode across restarts/config reloads.
- Add debug-capture-specific secret/PII redaction controls so troubleshooting logs can be more restrictive than general app logging.
- Add retry visibility and request-shape summaries to traffic troubleshooting so operators can spot backend retry churn and slow routes faster.
- Publish benchmark steps and baseline results in the README.
- Harden input extraction for structured `/v1/responses` payloads and nested MCP argument prompts.

## Guard Improvements (Nightly 2026-04-22)
- **Stronger injection patterns**: Added 13 new detection patterns covering base64/hex-encoded payloads, XML/markup embedding of system prompts, privilege escalation keywords, sudo-mode evasion, multi-turn follow-up injection sequences, and escaped delimiter tricks.
- **Configurable excessive agency threshold**: `security.max_tool_invocations_per_request` in platform config controls the LLM08_EXCESSIVE_AGENCY trigger (default: 5).
- **Homoglyph detection**: New `UNICODE_HOMOGLYPH_MIXING` reason code flags mixed Latin+Cyrillic/Greek confusables, full-width ASCII presentation forms, and zero-width character obfuscation in input prompts.
- **OWASP output policy scan in proxy adapters**: `output_policy_scan` (detectOwaspOutputRisks) now runs on actual LLM responses in both the OpenAI and MCP proxy adapters, not just pre-flight in the pipeline stage.
- **Prompt extraction hardening**: Input guard extraction now inspects `prompt`, `input`, `query`, structured `/v1/responses` content arrays, and nested MCP argument payloads instead of relying only on chat-style `messages` arrays.
- **False-positive reduction for tool metadata**: Prompt extraction now skips tool-definition/schema metadata branches (for example OpenAI function descriptions and JSON schema descriptions/defaults) so injection guards stay focused on user prompt-bearing content.
- **Ambiguous fallback config validation**: Config loading now rejects multiple workloads with empty match criteria so workload routing does not silently depend on file ordering.
- **New test coverage**: Added regression tests for prompt-only prompt-injection blocking, MCP output-policy blocking, ambiguous fallback workload validation, missing backend auth env fail-closed behavior, and invalid auth env var names.

## In Progress
- Extend benchmark scenarios to cover proxied LLM/MCP flows with representative redaction and guard settings.

## Recently Hardened
- Proxy adapters now fail closed with explicit `*_backend_auth_unavailable` errors when a configured env-backed backend credential is missing at runtime, instead of silently forwarding unauthenticated upstream requests.
- Config loading now validates auth env reference names (`auth.api_key_env`, `llm_backends.*.api_key_env`, `mcp_backends.*.auth.token_env`) so typos are caught before startup.
- OpenAI proxy forwarding now preserves `/v1/responses` versus `/v1/chat/completions` upstream paths, including proxy-mode requests where the body shape implies the responses API.
- OpenAI input secret redaction now follows prompt-bearing Responses API fields like `input`, `instructions`, nested content arrays, and structured prior-message wrappers before forwarding upstream.
- MCP input redaction now also scrubs JSON-RPC `params.prompt` before forwarding upstream.
- Tool invocation extraction now understands nested chat `tool_calls.function.*` and Responses API `output` function-call items so excessive-agency guardrails see the real call count.
- Config loading now rejects non-positive `security.max_tool_invocations_per_request` values.
- Workloads can now define benchmark presets for repeatable pre-release regression/perf checks, and config loading validates duplicate preset names and malformed preset paths.
