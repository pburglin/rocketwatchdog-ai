export type JsonSchema = Record<string, unknown>;

export interface ToolPolicy {
  allowlist?: string[];
  schemas?: Record<string, JsonSchema>;
}

export interface PromptInjectionPolicy {
  enabled: boolean;
  patterns?: string[];
}

export interface RedactionPolicy {
  enabled: boolean;
  patterns?: string[];
}

export interface Policy {
  maxInputChars: number;
  normalizeUnicode: boolean;
  promptInjection: PromptInjectionPolicy;
  redaction: RedactionPolicy;
  tools: ToolPolicy;
}

export interface WorkloadMatch {
  header?: { name: string; value: string };
  pathPrefix?: string;
  model?: string;
}

export interface WorkloadPolicy {
  name: string;
  match: WorkloadMatch;
  policy: Partial<Policy>;
}

export interface AdaptersConfig {
  openai?: {
    enabled: boolean;
    baseUrl: string;
    apiKey?: string;
    organization?: string;
    project?: string;
    timeoutMs: number;
  };
  mcp?: {
    enabled: boolean;
    baseUrl: string;
    headers?: Record<string, string>;
    timeoutMs: number;
  };
}

export interface ServerConfig {
  host: string;
  port: number;
  bodyLimit: number;
  requestTimeoutMs: number;
}

export interface LoggingConfig {
  level: string;
}

export interface SnapshotConfig {
  dir: string;
}

export interface AppConfig {
  server: ServerConfig;
  logging: LoggingConfig;
  policies: {
    default: Policy;
    workloads: WorkloadPolicy[];
  };
  adapters: AdaptersConfig;
  snapshots: SnapshotConfig;
}

export interface RequestContext {
  path: string;
  headers: Record<string, string | undefined>;
  model?: string;
}
