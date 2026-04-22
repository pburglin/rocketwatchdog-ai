# RocketWatchDog.ai Task List

## Done
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

## Guard Improvements (Nightly 2026-04-22)
- **Stronger injection patterns**: Added 13 new detection patterns covering base64/hex-encoded payloads, XML/markup embedding of system prompts, privilege escalation keywords, sudo-mode evasion, multi-turn follow-up injection sequences, and escaped delimiter tricks.
- **Configurable excessive agency threshold**: `security.max_tool_invocations_per_request` in platform config controls the LLM08_EXCESSIVE_AGENCY trigger (default: 5).
- **Homoglyph detection**: New `UNICODE_HOMOGLYPH_MIXING` reason code flags mixed Latin+Cyrillic and zero-width character obfuscation in input prompts.
- **OWASP output policy scan in OpenAI adapter**: `output_policy_scan` (detectOwaspOutputRisks) now runs on actual LLM responses in the proxy adapter, not just pre-flight in the pipeline stage.
- **New test suites**: `tests/injection-detect.test.ts` (31 cases) and `tests/unicode-guard.test.ts` (9 cases) cover the expanded guard logic.

## In Progress
- Add CLI and UI admin troubleshooting features for performance and latency analysis.
- Add reproducible performance test scripts for representative request mixes.
- Publish documented benchmark steps and baseline results in the README.

## Pending
- Expand performance troubleshooting with request-shape comparisons and backend-specific retry visibility.
