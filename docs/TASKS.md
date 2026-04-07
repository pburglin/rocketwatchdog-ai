# RocketWatchDog.ai Task List

## Done
- Harden config validation for backend URLs, duplicate models, and auth env requirements.
- Redact OpenAI tool metadata and MCP tool arguments when input secret redaction is enabled.
- Strip unsafe upstream response headers before forwarding replies.
- Expose control-plane admin UI pages for dashboard, policies, integrations, traffic, and settings.

## In Progress
- Add admin-controlled debug mode with request/response header and payload capture for troubleshooting.
- Add traffic/log filtering in the UI so admins can search log messages by arbitrary substrings such as correlation IDs, source IPs, or header values.
- Support and document two integration patterns:
  - Proxy mode: RocketWatchDog.ai forwards to the LLM/MCP backend.
  - Decision mode: RocketWatchDog.ai returns an allow/block decision only, and the upstream API gateway performs the provider call.

## Pending
- Persist operator-controlled runtime settings like debug mode across restarts/config reloads.
- Add retention/size controls for captured debug payload logs.
- Consider redaction guardrails specific to debug capture to avoid over-logging sensitive content in long-running environments.
