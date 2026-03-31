import type { EffectivePolicy, PlatformConfig, WorkloadConfig } from "./config.js";

export function mergeEffectivePolicy(
  platform: PlatformConfig,
  workload: WorkloadConfig
): EffectivePolicy {
  const policy = workload.policy;
  const inputGuards = { ...defaultInputGuards(policy.level), ...(workload.guards?.input ?? {}) };
  const outputGuards = { ...defaultOutputGuards(policy.level), ...(workload.guards?.output ?? {}) };
  const toolGuards = { ...defaultToolGuards(policy.level), ...(workload.guards?.tools ?? {}) };

  const maxPrompt = clampNumber(
    policy.max_prompt_chars ?? platform.security.max_prompt_chars ?? 0,
    platform.security.max_prompt_chars
  );
  const maxOutput = clampNumber(
    policy.max_output_chars ?? platform.security.max_output_chars ?? 0,
    platform.security.max_output_chars
  );

  return {
    workload_id: workload.id,
    level: policy.level ?? platform.security.default_level,
    ...(policy.data_classification ? { data_classification: policy.data_classification } : {}),
    allowed_llm_backends: policy.allowed_llm_backends ?? [],
    allowed_models: policy.allowed_models ?? [],
    allowed_mcp_backends: policy.allowed_mcp_backends ?? [],
    allowed_tools: policy.allowed_tools ?? [],
    require_user_id: policy.require_user_id ?? false,
    require_session_id: policy.require_session_id ?? false,
    max_prompt_chars: maxPrompt > 0 ? maxPrompt : platform.security.max_prompt_chars ?? 0,
    max_output_chars: maxOutput > 0 ? maxOutput : platform.security.max_output_chars ?? 0,
    input_guards: inputGuards,
    output_guards: outputGuards,
    tool_guards: toolGuards
  };
}

function clampNumber(value: number, cap?: number): number {
  if (!cap || cap <= 0) return value;
  if (value <= 0) return cap;
  return Math.min(value, cap);
}

function defaultInputGuards(level: string): Record<string, boolean> {
  if (level === "L3") {
    return {
      schema_validation: true,
      heuristic_prompt_injection: true,
      lightweight_classifier: true,
      llm_security_scan: true
    };
  }
  if (level === "L2") {
    return {
      schema_validation: true,
      heuristic_prompt_injection: true,
      lightweight_classifier: true
    };
  }
  if (level === "L1") {
    return {
      schema_validation: true,
      heuristic_prompt_injection: true
    };
  }
  return { schema_validation: true, heuristic_prompt_injection: true };
}

function defaultOutputGuards(level: string): Record<string, boolean> {
  if (level === "L3") {
    return { secret_redaction: true, pii_redaction: true, output_policy_scan: true };
  }
  if (level === "L2") {
    return { secret_redaction: true, pii_redaction: true };
  }
  if (level === "L1") {
    return { secret_redaction: true };
  }
  return { secret_redaction: true };
}

function defaultToolGuards(level: string): Record<string, boolean> {
  if (level === "L3") {
    return {
      require_tool_allowlist: true,
      require_tool_schema_validation: true,
      require_intent_check: true,
      require_confirmation_for_write: true
    };
  }
  if (level === "L2") {
    return { require_tool_allowlist: true, require_tool_schema_validation: true };
  }
  if (level === "L1") {
    return { require_tool_allowlist: true };
  }
  return { require_tool_allowlist: true };
}
