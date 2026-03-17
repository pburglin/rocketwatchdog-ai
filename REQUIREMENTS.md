# RocketWatchDog.ai — Requirements

**Source:** User-provided spec message (2026-03-17).

## 1. Project Intent
Build RocketWatchDog.ai as security and policy middleware between:
- Client apps (e.g., RocketClaw)
- GenAI LLM providers
- MCP servers / tool endpoints

Apply graduated protections to prompts, outputs, and tool/API calls based on:
- platform-level configuration
- workload-level policy profiles
- runtime request metadata (headers, payload tags)

Must be:
- easy to deploy
- easy to configure
- dependency-light
- file-config driven
- usable without a database
- extensible without rewriting core logic

## 2. Product Goals
### Primary goals
- Enforce risk-adaptive controls
- Minimize latency and scanning cost
- Protect prompts, responses, tool calls, and MCP interactions
- Support multiple workload profiles (L0–L3)
- Allow workload selection from:
  - route/path
  - request headers
  - payload metadata
  - default mappings

### Non-goals (v1)
- No database dependency
- No distributed policy engine
- No UI required in v1
- No SIEM integration required
- No complex auth provider integration beyond simple API keys / shared secrets / optional JWT parsing

## 3. High-level Architecture
Pipeline:
1. Request Normalizer
2. Workload Resolver
3. Risk Engine
4. Guard Pipeline
5. LLM/MCP Proxy
6. Output Guard
7. Audit Logger

## 4. Core Design Principles
### 4.1 File-based configuration
- YAML for config
- JSON Schema for validation

### 4.6 Skills Security Gateway
RocketWatchDog.ai should act as a gateway before agents download/install skills:
- scan skills for security and risk issues
- block skills that cross a risk threshold

### 4.2 Strict config domains
**Platform-level:** infrastructure-wide behavior (LLM/MCP backends, defaults, routing headers, logging sinks, redaction, auth, timeouts)
**Workload-level:** workload behavior (IDs, protection level, allowed models/tools, routing criteria, data classification, IO policies)

### 4.3 Progressive controls
- Cheapest useful controls first, escalate as required

### 4.4 Minimal dependencies
- Standard lib where possible
- Few mature libraries only
- No DB/queue/cache

### 4.5 Adapter-based extensibility
- LLM adapters
- MCP adapters
- scanners
- workload resolvers
- logging sinks

## 5. Implementation Stack
- Node.js + TypeScript (strict)
- Fastify
- Zod (runtime validation)
- Ajv (JSON Schema validation)
- yaml
- undici or native fetch
- pino
- jsonwebtoken optional (parse-only)
- commander or yargs

## 6. Runtime Responsibilities
### 6.1 LLM request flow
1. Accept inbound request
2. Normalize request
3. Resolve workload
4. Compute effective policy
5. Run input guards
6. Optionally escalate guards
7. Forward to LLM
8. Run output guards
9. Return transformed or blocked response
10. Write audit log

### 6.2 MCP/tool request flow
1. Accept tool invocation or intercept tool request
2. Resolve workload
3. Check tool permissions
4. Validate parameters against schema
5. Optionally run intent/risk scan
6. Forward to MCP server
7. Optionally sanitize output
8. Log decision

### 6.3 Guard outcomes
- allow
- allow_with_annotations
- rewrite
- mask
- challenge
- block

## 7. Canonical Internal Models
### 7.1 CanonicalRequest
```
export type CanonicalRequest = {
  requestId: string;
  timestamp: string;
  sourceApp?: string;
  route: string;
  headers: Record<string, string>;
  clientIp?: string;
  userId?: string;
  sessionId?: string;
  workloadHint?: string;
  payload: Record<string, unknown>;
  promptText?: string;
  messages: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
};
```

### 7.2 CanonicalResponse
```
export type CanonicalResponse = {
  requestId: string;
  provider?: string;
  model?: string;
  rawOutput?: Record<string, unknown>;
  outputText?: string;
  toolCalls: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
};
```

### 7.3 GuardDecision
```
export type GuardDecision = {
  action: "allow" | "allow_with_annotations" | "rewrite" | "mask" | "challenge" | "block";
  reasonCodes: string[];
  severity: "info" | "low" | "medium" | "high" | "critical";
  rewrittenText?: string;
  maskedFields?: string[];
  annotations?: Record<string, unknown>;
};
```

### 7.4 EffectivePolicy
- Merged result of platform config + workload config + runtime overrides

## 8. Configuration Structure
```
rocketwatchdog/
  configs/
    platform.yaml
    workloads/
      default.yaml
      public-chat.yaml
      internal-assistant.yaml
      sensitive-mcp.yaml
  schemas/
    platform.schema.json
    workload.schema.json
  tools/
```

## 9. Platform-level Config (example)
See spec message; includes server, routing, security, backends, logging, redaction, guardrails.

## 10. Workload-level Config (examples)
- public-chat.yaml
- sensitive-mcp.yaml

## 11. Workload Resolution Rules
Priority order:
1. explicit workload header
2. payload metadata
3. route/path match
4. source app mapping
5. default workload

Header/metadata override constrained by platform config.

## 12. Protection Levels
L0–L3 implemented; L4 reserved. (See spec for details.)

## 13. Request Handling Pipeline
Stages:
1. ParseRequestStage
2. NormalizeRequestStage
3. ResolveWorkloadStage
4. MergeEffectivePolicyStage
5. InputGuardStage
6. LLMOrToolRoutingStage
7. OutputGuardStage
8. AuditStage
9. ResponseStage

Common interface:
```
export interface PipelineStage {
  run(ctx: RequestContext): Promise<RequestContext>;
}
```

## 14. Guard Engine Design
- Input guards, Tool guards, Output guards
- Each returns GuardDecision
- Composition: block wins; rewrite over allow; masks merge; annotations accumulate

## 15. MCP Protection Model
- tools registry with backend, capability, sensitivity, params_schema
- policy evaluation steps: tool enablement, backend enablement, schema match, required user/session, confirmation, secondary scan

## 16. Platform vs Workload Merge Rules
- scalars: workload overrides
- lists: replace
- maps: deep merge
- platform hard caps clamp workload

## 17. API Surface
Required:
- GET /healthz
- GET /readyz
- GET /v1/config/effective (optional admin-only)
- POST /v1/config/reload
- POST /v1/proxy/llm
- POST /v1/proxy/mcp

Optional compatibility:
- POST /v1/chat/completions
- POST /v1/responses

## 18. Logging & Audit
- Structured append-only logs
- request ID for each request
- log workload ID, level, decisions, reason codes
- redact secrets before logging
- don’t log restricted prompts unless enabled

## 19. Config Reload Behavior
- load at startup
- validate against schemas
- immutable in-memory snapshot
- reload endpoint
- on invalid reload: retain last-known-good; log error; fail-closed only if no valid config exists

## 20. Security & Trust Boundaries
- clients can’t arbitrarily choose workload
- internal-only workloads require trusted source or auth
- backend credentials from env vars only
- never expose secrets in config dump
- tool backends only via registered aliases

## 21. Authentication (v1)
- no auth for local dev
- static API key mode
- optional JWT parse-only for userId/roles/sourceApp

## 22. Repo Structure (expected)
```
rocketwatchdog-ai/
  README.md
  package.json
  tsconfig.json
  .env.example
  src/
    index.ts
    app.ts
    cli.ts
    server.ts
    types/
      canonical.ts
      decisions.ts
      policy.ts
      config.ts
    config/
      loader.ts
      merger.ts
      validator.ts
      snapshot.ts
    pipeline/
      context.ts
      stage.ts
      runner.ts
    stages/
      parse-request.ts
      normalize-request.ts
      resolve-workload.ts
      merge-policy.ts
      input-guards.ts
      route-target.ts
      output-guards.ts
      audit.ts
    guards/
      registry.ts
      base.ts
      input/
        size-limit.ts
        unicode-normalize.ts
        prompt-injection-heuristic.ts
        metadata-integrity.ts
      output/
        secret-redaction.ts
        pii-redaction.ts
        prompt-leakage.ts
      tools/
        allowlist.ts
        schema-validation.ts
        intent-check.ts
        confirmation.ts
    adapters/
      llm/
        base.ts
        openai-compatible.ts
      mcp/
        base.ts
        http-mcp.ts
    routing/
      workload-resolver.ts
      backend-router.ts
    logging/
      logger.ts
      audit.ts
      redact.ts
    auth/
      api-key.ts
      jwt.ts
    utils/
      ids.ts
      jsonpath.ts
      time.ts
      deep-merge.ts
  configs/
    platform.yaml
    workloads/
      default.yaml
      public-chat.yaml
      internal-assistant.yaml
      sensitive-mcp.yaml
  schemas/
    platform.schema.json
    workload.schema.json
  tools/
  test/
    config-loading.test.ts
    workload-resolution.test.ts
    level-enforcement.test.ts
    tool-guarding.test.ts
    output-redaction.test.ts
```

## 22.1 Docker
Provide steps to run RocketWatchDog.ai in a Docker container to control local directory access.

## 23. CLI Requirements
Commands:
- rocketwatchdog serve
- rocketwatchdog validate-config --config-dir ./configs
- rocketwatchdog print-effective-policy --workload public-chat
- rocketwatchdog dry-run --request-file ./examples/request.json
- rocketwatchdog reload

## 24. Implementation Priorities (Phases)
**Phase 1:** config models, loader, snapshot, resolver, policy merger, health endpoints, logging
**Phase 2:** LLM/MCP proxy adapters
**Phase 3:** guardrails (size, normalization, prompt injection, output redaction, tool allowlist, tool schema validation)
**Phase 4:** advanced controls (classifier/LLM scanner interfaces, confirmations, escalation rules)

## 25. Coding Rules
- TypeScript only, strict mode
- validate all external inputs
- immutable config snapshots
- async I/O
- small, explicit modules
- JSON error payloads
- block decisions must include reason codes
- adapter/guard interfaces
- readable code over heavy abstractions

## 26. MVP Acceptance Criteria
RocketWatchDog.ai v1 is complete when it can:
- load/validate platform + workload configs from files
- resolve workload from headers, metadata, or route
- merge effective policy
- proxy to LLM backends
- proxy to MCP backends
- enforce L0–L3 policies
- block disallowed tools
- validate tool params vs JSON schema
- redact secrets from output and logs
- write structured audit logs
- run without DB
- run locally with one command
