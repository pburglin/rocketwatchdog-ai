import type { EffectivePolicy, PlatformConfig } from "../../types/config.js";
import type { GuardDecision } from "../../types/decisions.js";
import { normalizeUnicode } from "./unicode.js";
import { detectPromptInjection } from "./injection.js";
import { detectOwaspInputRisks } from "./owasp.js";
import { redactSecrets } from "./redaction.js";
import { validateTools, type ToolDefinition, type ToolInvocation } from "./tools.js";

export interface GuardInput {
  text: string;
  tools?: ToolDefinition[];
  toolInvocations?: ToolInvocation[];
}

export interface GuardResult {
  decision: GuardDecision;
  normalizedText: string;
  redactedText: string;
  redactionHits: number;
}

export function runGuards(
  input: GuardInput,
  policy: EffectivePolicy,
  platform: PlatformConfig,
  toolSchemas: Record<string, Record<string, unknown>>
): GuardResult {
  let workingText = input.text;
  if (platform.security.normalize_unicode) {
    workingText = normalizeUnicode(workingText);
  }

  const reasons: string[] = [];
  if (policy.max_prompt_chars > 0 && workingText.length > policy.max_prompt_chars) {
    reasons.push("INPUT_TOO_LARGE");
  }

  if (policy.input_guards.heuristic_prompt_injection) {
    const hits = detectPromptInjection(workingText);
    if (hits.length > 0) {
      reasons.push("PROMPT_INJECTION");
    }
  }

  if (policy.input_guards.llm_security_scan) {
    reasons.push(
      ...detectOwaspInputRisks(
        workingText,
        policy.max_prompt_chars,
        input.toolInvocations
      )
    );
  }

  const shouldRedactInput = policy.input_guards.secret_redaction ?? false;
  const redaction = shouldRedactInput
    ? redactSecrets(workingText, platform.redaction.secret_patterns)
    : { redacted: workingText, hits: 0 };

  const toolValidation = validateTools(
    policy,
    input.tools,
    input.toolInvocations,
    toolSchemas
  );
  if (!toolValidation.allowed) {
    reasons.push(...toolValidation.reasons);
  }

  const hasReasons = reasons.length > 0;
  const hasRedactions = redaction.hits > 0;
  const decision: GuardDecision = {
    action: hasReasons
      ? "block"
      : hasRedactions
        ? "allow_with_annotations"
        : "allow",
    reasonCodes: reasons,
    severity: hasReasons ? "high" : hasRedactions ? "low" : "info",
    annotations: hasRedactions ? { redacted: true } : undefined
  };

  return {
    decision,
    normalizedText: workingText,
    redactedText: redaction.redacted,
    redactionHits: redaction.hits
  };
}
