import { detectPromptInjection } from "./injection.js";
const dataLeakagePatterns = [
    /(?:exfiltrate|leak|dump|reveal|show|print|display|list)\s+(?:the\s+)?(?:system\s+prompt|secrets?|api\s*keys?|passwords?|tokens?|credentials?|private\s+keys?|ssh\s+keys?|database|customer\s+data|pii)/i,
    /(?:system\s+prompt|api\s*key|password|token|credentials?)\s*[:=]/i
];
const dataPoisoningPatterns = [
    /(?:train|fine-?tune|learn|memorize|update)\s+(?:your|the)?\s*(?:weights|model|policy|memory)/i,
    /store\s+this\s+(?:for|in)\s+(?:future|memory)/i
];
const supplyChainPatterns = [
    /\b(?:pip|npm|brew|apt-get)\s+install\b/i,
    /\bcurl\s+[^\s]+\s*\|\s*sh\b/i,
    /\bwget\s+[^\s]+\s*\|\s*sh\b/i
];
const modelTheftPatterns = [
    /model\s+(?:weights|checkpoint|parameters)/i,
    /(?:steal|extract|exfiltrate|download)\s+(?:the\s+)?model/i
];
const highImpactAdvicePatterns = [
    /this\s+is\s+legal\s+advice/i,
    /this\s+is\s+medical\s+advice/i,
    /this\s+is\s+financial\s+advice/i,
    /diagnos(?:e|is)\b/i
];
export function detectOwaspInputRisks(text, maxPromptChars, toolInvocations) {
    const reasons = [];
    if (detectPromptInjection(text).length > 0) {
        reasons.push("LLM01_PROMPT_INJECTION");
    }
    if (dataLeakagePatterns.some((pattern) => pattern.test(text))) {
        reasons.push("LLM02_DATA_LEAKAGE_REQUEST");
    }
    if (dataPoisoningPatterns.some((pattern) => pattern.test(text))) {
        reasons.push("LLM03_TRAINING_DATA_POISONING");
    }
    if (maxPromptChars > 0 && text.length > maxPromptChars) {
        reasons.push("LLM04_MODEL_DOS");
    }
    if (supplyChainPatterns.some((pattern) => pattern.test(text))) {
        reasons.push("LLM05_SUPPLY_CHAIN_RISK");
    }
    if (modelTheftPatterns.some((pattern) => pattern.test(text))) {
        reasons.push("LLM10_MODEL_THEFT");
    }
    if (toolInvocations && toolInvocations.length >= 5) {
        reasons.push("LLM08_EXCESSIVE_AGENCY");
    }
    return reasons;
}
export function detectOwaspOutputRisks(text, redactionHits) {
    const reasons = [];
    if (redactionHits > 0) {
        reasons.push("LLM06_SENSITIVE_INFO_DISCLOSURE");
    }
    if (highImpactAdvicePatterns.some((pattern) => pattern.test(text))) {
        reasons.push("LLM09_OVERRELIANCE_RISK");
    }
    return reasons;
}
//# sourceMappingURL=owasp.js.map