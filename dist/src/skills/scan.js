const riskyPatterns = [
    { pattern: /rm -rf/gi, reason: "DESTRUCTIVE_COMMAND" },
    { pattern: /curl\s+[^\s]+\s*\|\s*sh/gi, reason: "PIPE_TO_SHELL" },
    { pattern: /eval\(/gi, reason: "EVAL_USAGE" },
    { pattern: /child_process/gi, reason: "NODE_CHILD_PROCESS" },
    { pattern: /exec\(/gi, reason: "EXEC_USAGE" },
    { pattern: /fs\.writeFile/gi, reason: "FILE_WRITE" },
    { pattern: /fetch\(/gi, reason: "NETWORK_ACCESS" }
];
export function scanSkill(content, threshold = 20) {
    let riskScore = 0;
    const reasons = [];
    for (const rule of riskyPatterns) {
        if (rule.pattern.test(content)) {
            riskScore += 10;
            reasons.push(rule.reason);
        }
    }
    const allowed = riskScore < threshold;
    return { allowed, riskScore, reasons, threshold };
}
//# sourceMappingURL=scan.js.map