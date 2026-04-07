export interface HealthStatus {
  status: 'ok' | 'ready' | 'degraded' | 'error';
  llm_backends?: string[];
  mcp_backends?: string[];
  config?: ConfigHealth;
}

export interface ConfigHealth {
  loadedAt: string | null;
  lastReloadAttemptAt: string | null;
  lastReloadSucceededAt: string | null;
  lastError: string | null;
  isUsingLastKnownGood: boolean;
}

export interface ConfigStatus extends ConfigHealth {
  configDir?: string;
  workloadCount?: number;
  toolSchemaCount?: number;
}

export interface EffectiveConfigSnapshot {
  platform: {
    server: {
      port: number;
      host: string;
      max_body_size_kb: number;
      request_timeout_ms: number;
    };
    routing: {
      workload_header: string;
      classification_header?: string;
      source_app_header?: string;
      default_workload?: string;
      allow_client_workload_override: boolean;
    };
    security: {
      default_level: string;
      max_prompt_chars?: number;
      max_output_chars?: number;
      redact_secrets_in_logs: boolean;
      normalize_unicode: boolean;
      fail_closed_on_invalid_config: boolean;
      default_action_on_guard_error: string;
    };
    llm_backends: Record<
      string,
      {
        provider: string;
        base_url: string;
        api_key_env?: string;
        timeout_ms: number;
        models?: string[];
      }
    >;
    mcp_backends: Record<
      string,
      {
        transport: string;
        base_url: string;
        timeout_ms: number;
        auth?: {
          type: string;
          token_env?: string;
        };
      }
    >;
    auth?: {
      mode?: string;
      api_key_env?: string;
      jwt_issuer?: string;
      jwt_audience?: string;
    };
    logging: {
      level: string;
      access_log: boolean;
      decision_log: boolean;
      log_dir?: string;
      integration_mode?: "proxy" | "decision";
    };
    redaction: {
      secret_patterns: string[];
      pii_patterns?: string[];
    };
    skills?: {
      max_risk_score?: number;
    };
  };
  workloads: WorkloadConfig[];
  toolSchemas: Record<string, Record<string, unknown>>;
  loadedAt: string;
}

export interface WorkloadConfig {
  id: string;
  match: {
    routes?: string[];
    headers?: Record<string, string>;
    metadata?: Record<string, string>;
  };
  policy: {
    level: string;
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
}

export interface TrafficLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  workload: string;
  action: 'allow' | 'block' | 'allow_with_annotations';
  reasonCodes?: string[];
  duration_ms: number;
  status_code?: number;
  source_ip?: string;
  user_agent?: string;
  request_id?: string;
  backend?: string;
  integration_mode?: 'proxy' | 'decision';
  request_headers?: Record<string, string>;
  response_headers?: Record<string, string>;
  request_payload?: unknown;
  response_payload?: unknown;
  log_message?: string;
}

export interface DebugLog {
  id: string;
  timestamp: string;
  requestId?: string;
  stage: 'request' | 'response' | 'decision';
  path?: string;
  method?: string;
  workload?: string;
  statusCode?: number;
  sourceIp?: string;
  message: string;
  headers?: Record<string, string>;
  payload?: unknown;
}

export interface GuardPolicy {
  id: string;
  name: string;
  category: 'input' | 'output' | 'tools';
  description: string;
  defaultEnabled: boolean;
  level: string[];
  workloadsEnabled?: number;
  totalWorkloads?: number;
}

export interface Integration {
  id: string;
  name: string;
  type: 'llm' | 'mcp';
  status: 'healthy' | 'attention' | 'configured';
  detail: string;
  url: string;
  lastPing?: string;
  models?: string[];
  mode?: 'proxy' | 'decision' | undefined;
}

export interface SkillScanResult {
  allowed: boolean;
  riskScore: number;
  blocked: boolean;
  reasons: string[];
  threshold?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface RBACPermission {
  read: {
    traffic_logs: boolean;
    security_policies: boolean;
    integrations: boolean;
    config: boolean;
  };
  write: {
    security_policies: boolean;
    integrations: boolean;
    config: boolean;
  };
}
