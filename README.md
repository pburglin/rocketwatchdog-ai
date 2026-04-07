# RocketWatchDog.ai

Security and policy middleware between client apps, LLM providers, and MCP servers.

## What it does

- Guardrails for prompt injection, tool allowlists, and tool invocation schemas.
- Secret/PII redaction on inbound prompts and outbound responses (JSON or text payloads).
- Workload-specific policy overrides based on headers, metadata, or route.
- Skills security gateway for scanning new skills before install.
- Config reload with last-known-good fallback.
- Output size limits and redaction.
- Strict TypeScript validation in CI-friendly `npm run lint` / `npm run build` flows.
- Admin-controlled debug mode with searchable request/response header and payload capture.
- Two integration patterns: full proxy mode and decision-only mode.

## Config essentials

Configs live under `configs/`:

- Workload IDs must be unique, and the configured default workload must exist.
- Duplicate `allowed_llm_backends`, `allowed_mcp_backends`, `allowed_models`, and `allowed_tools` entries are rejected at load time.
- LLM/MCP backend `base_url` values must be valid absolute URLs.
- Duplicate model names inside a single LLM backend are rejected at load time.
- `auth.mode: api_key` requires `auth.api_key_env`; MCP `auth.type: bearer_env` requires `auth.token_env`.
- Config loading aggregates multiple validation failures into one error so broken reloads are easier to diagnose.
- `allowed_models` is enforced (requests must specify a model in the allowlist).
- If `require_tool_allowlist` is enabled and `allowed_tools` is empty, any tool usage is rejected with `TOOL_ALLOWLIST_EMPTY`.
- If `require_tool_schema_validation` is enabled, every allowlisted tool must have a matching JSON schema in `configs/tools` (schemas are validated at load time, and startup/reload fails fast when they are missing).
- Redaction patterns support inline flags like `(?i)` for case-insensitive matching.
- JWT auth can enforce `jwt_issuer` and/or `jwt_audience` when configured. Expired tokens are rejected when `exp` is present.
- `logging.integration_mode` supports `proxy` or `decision`.

```text
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
- `GET /v1/config/status`
- `GET /v1/config/effective`
- `POST /v1/config/reload`
- `GET /v1/debug/status`
- `POST /v1/debug/status`
- `GET /v1/debug/logs`
- `POST /v1/proxy/llm`
- `POST /v1/proxy/mcp`
- `POST /v1/decision`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/skills/scan`

## Integration patterns

### 1) Proxy mode

Use when RocketWatchDog.ai should sit inline between your API gateway and the provider.

Flow:
1. API gateway sends request to RocketWatchDog.ai.
2. RocketWatchDog.ai evaluates policy and guards.
3. If allowed, RocketWatchDog.ai forwards to the configured LLM or MCP backend.
4. RocketWatchDog.ai optionally redacts the upstream reply and returns it to the gateway.

How to enable:
- Set `logging.integration_mode: proxy` in `configs/platform.yaml`.
- Send requests to `/v1/proxy/llm`, `/v1/proxy/mcp`, `/v1/chat/completions`, or `/v1/responses`.

Pros:
- Simplest deployment model for centralized enforcement.
- One place for request validation, forwarding, and response sanitization.
- Easier to add debug capture because full request/response context is present.

Cons:
- RocketWatchDog.ai stays in the latency path.
- Provider-specific retry behavior lives here rather than in your API gateway.

### 2) Decision mode

Use when your API gateway should keep provider ownership and ask RocketWatchDog.ai only for an allow or block decision.

Flow:
1. API gateway sends request context to RocketWatchDog.ai.
2. RocketWatchDog.ai evaluates policy and guards.
3. RocketWatchDog.ai returns a decision payload with `allowed`, `action`, `reasons`, `workload`, and `target`.
4. API gateway calls the LLM itself only when the decision allows it.

How to use:
- Either set `logging.integration_mode: decision` in `configs/platform.yaml` for default behavior, or call `POST /v1/decision` explicitly.
- Treat an allow response as a thumbs up and a `guard_rejected` or `allowed: false` response as a thumbs down.

Pros:
- Keeps provider credentials, retry logic, and network policy inside your API gateway.
- Lower coupling if RocketWatchDog.ai is only meant to be a policy engine.
- Easier to adopt incrementally in existing gateways.

Cons:
- Gateway must implement the provider call path itself.
- End-to-end response redaction cannot happen inside RocketWatchDog.ai because the provider response never flows through it.

## Quick demo (main features)

### 1) Install deps + start the server

```bash
npm install
npm run build
npm start
```

Expected: server listening on `http://0.0.0.0:8080` with `/healthz` returning `{"status":"ok"}`.

`/readyz` now reports config health as well: `ready` when the active config is healthy, or `degraded` when the service is still running on the last-known-good snapshot after a failed reload.

### 2) Health check

```bash
curl http://localhost:8080/healthz
```

Expected:

```json
{"status":"ok"}
```

### 3) Skills scan demo (works with the default config)

```bash
curl -X POST http://localhost:8080/v1/skills/scan \
  -H "content-type: application/json" \
  -d '{"content":"rm -rf /"}'
```

Expected:

```json
{"allowed":false,"riskScore":10,"reasons":["DESTRUCTIVE_COMMAND"],"blocked":true,"threshold":20}
```

### 4) LLM proxy with workload selection + guardrails

Prerequisite: configure a real LLM backend in `configs/platform.yaml`. The shipped default uses a placeholder URL (`https://api.example-llm.com/v1`), so without updating it the proxy will return `502 llm_upstream_request_failed`.

```bash
curl -X POST http://localhost:8080/v1/proxy/llm \
  -H "content-type: application/json" \
  -H "x-rwd-workload: public-chat" \
  -d '{"model":"gpt-main","messages":[{"role":"user","content":"hello"}]}'
```

Expected: a JSON response from the configured LLM backend. If the prompt violates guards, you’ll receive `{"error":"guard_rejected", "reasons":[...]}`.

### 5) Decision-only evaluation

```bash
curl -X POST http://localhost:8080/v1/decision \
  -H "content-type: application/json" \
  -H "x-rwd-workload: public-chat" \
  -d '{"model":"gpt-main","messages":[{"role":"user","content":"hello"}]}'
```

Expected: a decision payload like:

```json
{"requestId":"...","allowed":true,"action":"allow","reasons":[],"workload":"public-chat","target":"llm"}
```

### 6) Debug mode controls

```bash
curl http://localhost:8080/v1/debug/status
curl -X POST http://localhost:8080/v1/debug/status \
  -H "content-type: application/json" \
  -d '{"enabled":true}'
curl 'http://localhost:8080/v1/debug/logs?limit=20&q=req-123'
```

Expected: when debug mode is enabled, recent request/response header and payload captures appear in the debug log feed and are filterable by substring.

## Troubleshooting

- **401/403 from protected endpoints**: verify `platform.auth` settings and include `x-api-key` or `Authorization: Bearer ...` headers if enabled.
- **LLM/MCP backend errors**: confirm backend URLs and env vars (e.g., `ROCKETWATCHDOG_LLM_API_KEY`, `ROCKETWATCHDOG_MCP_TOKEN`).
- **Guard rejections**: inspect `reasons` in the response, adjust workload guard settings in `configs/workloads/*.yaml`, or use decision mode to integrate those results into gateway-native allow/deny flows.
- **Config reload fails**: hit `/v1/config/reload` and check the error in the response. Invalid schemas, duplicate allowlist entries, or missing required tool schemas keep the last-known-good snapshot.
- **Need to inspect config health quickly**: hit `/v1/config/status` for reload timestamps, last error, and whether the server is currently serving a last-known-good config snapshot.
- **Need to troubleshoot a specific request**: enable debug mode temporarily, then filter `/v1/debug/logs` or the Traffic UI by request ID, source IP, or any known header value.

## Guard pipeline notes

- Request guards run on inbound payloads, output guards run only when a `response` field is present, and decision mode stops after the guard decision instead of forwarding upstream.
- Input secret redaction is controlled by `guards.input.secret_redaction` (defaults off). It applies to OpenAI messages/tool metadata and MCP prompts/message payloads/tool arguments before forwarding upstream. Output redaction remains under `guards.output`.
- Upstream reply forwarding strips hop-by-hop and cookie headers before returning responses to clients.
- Guard decisions preserve earlier block results unless an output response is explicitly evaluated.
- If redaction occurs without a block reason, the guard decision is `allow_with_annotations` and includes `{ redacted: true }`.

## Validation commands

```bash
npm run lint
npm test
npm run build
cd ui && npm run build
```

Use these together before cutting a release. They catch type drift, guard/config regressions, adapter issues, and UI compile failures.

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

See `/docs` for architecture and task planning notes.
