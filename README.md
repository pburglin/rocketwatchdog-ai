# RocketWatchDog.ai

Security and policy middleware between client apps, LLM providers, and MCP servers.

## What it does

- Guardrails for prompt injection, tool allowlists, and tool invocation schemas.
- Secret redaction on inbound prompts/messages before forwarding upstream.
- Workload-specific policy overrides based on headers, path prefixes, or model name.

## Config essentials

Workloads must match on at least one of: `header`, `pathPrefix`, or `model` (empty matches are rejected).

```yaml
server:
  host: 0.0.0.0
  port: 8080
  bodyLimit: 1048576
  requestTimeoutMs: 30000
logging:
  level: info
policies:
  default:
    maxInputChars: 12000
    normalizeUnicode: true
    promptInjection:
      enabled: true
    redaction:
      enabled: true
    tools:
      allowlist: ["search", "weather"]
  workloads:
    - name: openai-chat
      match:
        pathPrefix: /v1/chat/completions
      policy:
        maxInputChars: 8000
adapters:
  openai:
    enabled: true
    baseUrl: https://api.openai.com
    timeoutMs: 30000
  mcp:
    enabled: false
    baseUrl: http://localhost:9000
    timeoutMs: 30000
snapshots:
  dir: ./snapshots
```

## Docker

```bash
# Build

docker build -t rocketwatchdog-ai:local .

# Run with scoped config access

docker run --rm -p 8080:8080 \
  -v "$PWD/configs:/app/configs:ro" \
  -e ROCKETWATCHDOG_LLM_API_KEY=... \
  rocketwatchdog-ai:local

# Or with compose

docker compose up --build
```

See /docs for architecture and skills gateway notes.
