export type GuardLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export type PlatformConfig = {
  server: {
    host: string;
    port: number;
    request_timeout_ms: number;
    max_body_size_kb: number;
  };
  routing: {
    workload_header: string;
    classification_header?: string;
    source_app_header?: string;
    allow_client_workload_override: boolean;
    trusted_override_source_apps?: string[];
    metadata_paths?: {
      workload?: string;
      classification?: string;
    };
    source_app_workload_map?: Record<string, string>;
    default_workload?: string;
  };
  security: {
    default_level: GuardLevel;
    fail_closed_on_invalid_config: boolean;
    normalize_unicode: boolean;
    redact_secrets_in_logs: boolean;
    default_action_on_guard_error: "allow" | "block";
    max_prompt_chars?: number;
    max_output_chars?: number;
  };
  llm_backends: Record<
    string,
    {
      provider: string;
      base_url: string;
      api_key_env?: string;
      timeout_ms: number;
      models: string[];
    }
  >;
  mcp_backends: Record<
    string,
    {
      transport: "http";
      base_url: string;
      timeout_ms: number;
      auth?: {
        type: "bearer_env" | "none";
        token_env?: string;
      };
    }
  >;
  logging: {
    level: string;
    access_log: boolean;
    decision_log: boolean;
    log_dir?: string;
  };
  redaction: {
    secret_patterns: string[];
    pii_patterns?: string[];
  };
  guardrails?: {
    scanners?: Record<string, { enabled: boolean; mode?: string }>;
  };
  skills?: {
    max_risk_score?: number;
  };
  auth?: {
    mode?: "none" | "api_key" | "jwt";
    api_key_env?: string;
    jwt_issuer?: string;
    jwt_audience?: string;
  };
};

export type WorkloadConfig = {
  id: string;
  match: {
    routes?: string[];
    headers?: Record<string, string>;
    metadata?: Record<string, string>;
  };
  policy: {
    level: GuardLevel;
    data_classification?: string;
    allowed_llm_backends?: string[];
    allowed_models?: string[];
    allowed_mcp_backends?: string[];
    allowed_tools?: string[];
    require_user_id?: boolean;
    require_session_id?: boolean;
    max_prompt_chars?: number;
    max_output_chars?: number;
  };
  guards?: {
    input?: Record<string, boolean>;
    output?: Record<string, boolean>;
    tools?: Record<string, boolean>;
  };
  actions?: {
    on_block?: {
      http_status: number;
      message: string;
    };
  };
};

export type EffectivePolicy = {
  workload_id: string;
  level: GuardLevel;
  data_classification?: string;
  allowed_llm_backends: string[];
  allowed_models: string[];
  allowed_mcp_backends: string[];
  allowed_tools: string[];
  require_user_id: boolean;
  require_session_id: boolean;
  max_prompt_chars: number;
  max_output_chars: number;
  input_guards: Record<string, boolean>;
  output_guards: Record<string, boolean>;
  tool_guards: Record<string, boolean>;
};

export type ConfigSnapshot = {
  platform: PlatformConfig;
  workloads: WorkloadConfig[];
  toolSchemas: Record<string, Record<string, unknown>>;
  loadedAt: string;
};
