# RocketWatchDog.ai

Security and policy middleware between client apps, LLM providers, and MCP servers.

## What it does

- Guardrails for prompt injection, tool allowlists, and tool invocation schemas.
- Secret/PII redaction on inbound prompts and outbound responses.
- Workload-specific policy overrides based on headers, metadata, or route.
- Skills security gateway for scanning new skills before install.

## Config essentials

Configs live under `configs/`:

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
