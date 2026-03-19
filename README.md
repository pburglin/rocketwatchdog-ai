# RocketWatchDog.ai

Security and policy middleware between client apps, LLM providers, and MCP servers.

## What it does

- Guardrails for prompt injection, tool allowlists, and tool invocation schemas.
- Secret/PII redaction on inbound prompts and outbound responses (JSON or text payloads).
- Workload-specific policy overrides based on headers, metadata, or route.
- Skills security gateway for scanning new skills before install.
- Config reload with last-known-good fallback.
- Output size limits and redaction.

## Config essentials

Configs live under `configs/`:

- Workload IDs must be unique, and the configured default workload must exist.
- `allowed_models` is enforced (requests must specify a model in the allowlist).
- If `require_tool_schema_validation` is enabled, every allowlisted tool should have a matching JSON schema in `configs/tools` (schemas are validated at load time).

```
configs/
  platform.yaml
  workloads/
    default.yaml
    public-chat.yaml
    internal-assistant.yaml
    sensitive-mcp.yaml
  tools/
    read_customer_record.json
    create_ticket.json
```

## Endpoints

- `GET /healthz`
- `GET /readyz`
- `GET /v1/config/effective`
- `POST /v1/config/reload`
- `POST /v1/proxy/llm`
- `POST /v1/proxy/mcp`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/skills/scan`

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

See `/docs` for architecture and skills gateway notes.

docker compose up --build
```

See `/docs` for architecture and skills gateway notes.
