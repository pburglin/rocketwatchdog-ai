import { normalizeUnicode } from "./unicode.js";
import { detectPromptInjection } from "./injection.js";
import { detectOwaspInputRisks } from "./owasp.js";
import { redactSecrets } from "./redaction.js";
import { validateTools } from "./tools.js";
export function runGuards(input, policy, platform, toolSchemas) {
    let workingText = input.text;
    if (platform.security.normalize_unicode) {
        workingText = normalizeUnicode(workingText);
    }
    const reasons = [];
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
        reasons.push(...detectOwaspInputRisks(workingText, policy.max_prompt_chars, input.toolInvocations));
    }
    const shouldRedactInput = policy.input_guards.secret_redaction ?? false;
    const redaction = shouldRedactInput
        ? redactSecrets(workingText, platform.redaction.secret_patterns)
        : { redacted: workingText, hits: 0 };
    const toolValidation = validateTools(policy, input.tools, input.toolInvocations, toolSchemas);
    if (!toolValidation.allowed) {
        reasons.push(...toolValidation.reasons);
    }
    const hasReasons = reasons.length > 0;
    const hasRedactions = redaction.hits > 0;
    const decision = {
        action: hasReasons
            ? "block"
            : hasRedactions
                ? "allow_with_annotations"
                : "allow",
        reasonCodes: reasons,
        severity: hasReasons ? "high" : hasRedactions ? "low" : "info",
        ...(hasRedactions ? { annotations: { redacted: true } } : {})
    };
    return {
        decision,
        normalizedText: workingText,
        redactedText: redaction.redacted,
        redactionHits: redaction.hits
    };
}
//# sourceMappingURL=index.js.map