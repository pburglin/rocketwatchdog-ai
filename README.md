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
- Redaction patterns support inline flags like `(?i)` for case-insensitive matching.
- JWT auth can enforce `jwt_issuer` and/or `jwt_audience` when configured. Expired tokens are rejected when `exp` is present.

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

## Guard pipeline notes

- Request guards run on inbound payloads; output guards run only when a `response` field is present.
- Guard decisions preserve earlier block results unless an output response is explicitly evaluated.
- If redaction occurs without a block reason, the guard decision is `allow_with_annotations` and includes `{ redacted: true }`.

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

## K8s (optional)

Basic deployment idea (use a ConfigMap for configs and scale horizontally):

```bash
kubectl create namespace rocketwatchdog
kubectl -n rocketwatchdog create configmap rwd-config --from-file=configs
kubectl -n rocketwatchdog create deployment rocketwatchdog --image=rocketwatchdog-ai:local \
  --dry-run=client -o yaml > rocketwatchdog-deploy.yaml
kubectl -n rocketwatchdog apply -f rocketwatchdog-deploy.yaml
kubectl -n rocketwatchdog scale deployment rocketwatchdog --replicas=3
kubectl -n rocketwatchdog expose deployment rocketwatchdog --type=ClusterIP --port=8080
```

Mount `/app/configs` from the ConfigMap and use a Service/Ingress for traffic.

See `/docs` for architecture and skills gateway notes.
