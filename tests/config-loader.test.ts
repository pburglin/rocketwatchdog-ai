import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfigDir } from "../src/config/loader.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeConfigDir(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rwd-config-"));
  tempDirs.push(dir);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return dir;
}

describe("loadConfigDir validation", () => {
  it("rejects duplicate allowed models in a workload", () => {
    const dir = makeConfigDir({
      "platform.yaml": `
server:
  host: 0.0.0.0
  port: 8080
  request_timeout_ms: 30000
  max_body_size_kb: 1024
routing:
  workload_header: x-rwd-workload
  allow_client_workload_override: false
  default_workload: default
security:
  default_level: L1
  fail_closed_on_invalid_config: true
  normalize_unicode: true
  redact_secrets_in_logs: false
  default_action_on_guard_error: block
logging:
  level: info
  access_log: false
  decision_log: false
redaction:
  secret_patterns: []
llm_backends:
  primary:
    provider: openai
    base_url: https://example.com
    timeout_ms: 30000
    models: [gpt-main]
mcp_backends: {}
`,
      "workloads/default.yaml": `
id: default
match: {}
policy:
  level: L1
  allowed_llm_backends: [primary]
  allowed_models: [gpt-main, gpt-main]
`
    });

    expect(() => loadConfigDir(dir)).toThrow(/duplicate allowed_models/i);
  });

  it("rejects schema-validation workloads when tool schemas are missing", () => {
    const dir = makeConfigDir({
      "platform.yaml": `
server:
  host: 0.0.0.0
  port: 8080
  request_timeout_ms: 30000
  max_body_size_kb: 1024
routing:
  workload_header: x-rwd-workload
  allow_client_workload_override: false
  default_workload: default
security:
  default_level: L2
  fail_closed_on_invalid_config: true
  normalize_unicode: true
  redact_secrets_in_logs: false
  default_action_on_guard_error: block
logging:
  level: info
  access_log: false
  decision_log: false
redaction:
  secret_patterns: []
llm_backends: {}
mcp_backends:
  primary:
    transport: http
    base_url: https://mcp.example.com
    timeout_ms: 30000
`,
      "workloads/default.yaml": `
id: default
match: {}
policy:
  level: L2
  allowed_mcp_backends: [primary]
  allowed_tools: [create_ticket]
guards:
  tools:
    require_tool_schema_validation: true
`
    });

    expect(() => loadConfigDir(dir)).toThrow(/requires tool schemas/i);
  });

  it("reports multiple backend validation errors together", () => {
    const dir = makeConfigDir({
      "platform.yaml": `
server:
  host: 0.0.0.0
  port: 8080
  request_timeout_ms: 30000
  max_body_size_kb: 1024
routing:
  workload_header: x-rwd-workload
  allow_client_workload_override: false
  default_workload: default
security:
  default_level: L1
  fail_closed_on_invalid_config: true
  normalize_unicode: true
  redact_secrets_in_logs: false
  default_action_on_guard_error: block
logging:
  level: info
  access_log: false
  decision_log: false
redaction:
  secret_patterns: []
llm_backends:
  primary:
    provider: openai
    base_url: not-a-url
    timeout_ms: 30000
    models: [gpt-main, gpt-main]
mcp_backends: {}
`,
      "workloads/default.yaml": `
id: default
match: {}
policy:
  level: L1
  allowed_llm_backends: [primary]
`
    });

    expect(() => loadConfigDir(dir)).toThrow(/invalid url.*duplicate models|duplicate models.*invalid url/i);
  });

  it("rejects bearer MCP auth without a token env and api key auth without api_key_env", () => {
    const dir = makeConfigDir({
      "platform.yaml": `
server:
  host: 0.0.0.0
  port: 8080
  request_timeout_ms: 30000
  max_body_size_kb: 1024
routing:
  workload_header: x-rwd-workload
  allow_client_workload_override: false
  default_workload: default
security:
  default_level: L1
  fail_closed_on_invalid_config: true
  normalize_unicode: true
  redact_secrets_in_logs: false
  default_action_on_guard_error: block
auth:
  mode: api_key
logging:
  level: info
  access_log: false
  decision_log: false
redaction:
  secret_patterns: []
llm_backends: {}
mcp_backends:
  primary:
    transport: http
    base_url: https://mcp.example.com
    timeout_ms: 30000
    auth:
      type: bearer_env
`,
      "workloads/default.yaml": `
id: default
match: {}
policy:
  level: L1
  allowed_mcp_backends: [primary]
`
    });

    expect(() => loadConfigDir(dir)).toThrow(/token_env.*api_key_env|api_key_env.*token_env/i);
  });

  it("rejects undersized debug capture payload limits", () => {
    const dir = makeConfigDir({
      "platform.yaml": `
server:
  host: 0.0.0.0
  port: 8080
  request_timeout_ms: 30000
  max_body_size_kb: 1024
routing:
  workload_header: x-rwd-workload
  allow_client_workload_override: false
  default_workload: default
security:
  default_level: L1
  fail_closed_on_invalid_config: true
  normalize_unicode: true
  redact_secrets_in_logs: false
  default_action_on_guard_error: block
logging:
  level: info
  access_log: false
  decision_log: false
  debug_capture:
    max_payload_chars: 12
redaction:
  secret_patterns: []
llm_backends: {}
mcp_backends: {}
`,
      "workloads/default.yaml": `
id: default
match: {}
policy:
  level: L1
`
    });

    expect(() => loadConfigDir(dir)).toThrow(/max_payload_chars/i);
  });
});
