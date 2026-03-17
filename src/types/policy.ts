import type { EffectivePolicy, PlatformConfig, WorkloadConfig } from "./config.js";

export function mergeEffectivePolicy(
  platform: PlatformConfig,
  workload: WorkloadConfig
): EffectivePolicy {
  const policy = workload.policy;
  const inputGuards = { ...(workload.guards?.input ?? {}) };
  const outputGuards = { ...(workload.guards?.output ?? {}) };
  const toolGuards = { ...(workload.guards?.tools ?? {}) };

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
    data_classification: policy.data_classification,
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
