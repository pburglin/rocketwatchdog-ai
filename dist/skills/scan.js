const riskyPatterns = [
    { pattern: /rm -rf/i, reason: "DESTRUCTIVE_COMMAND", score: 10, hardBlock: true },
    { pattern: /curl\s+[^\s]+\s*\|\s*sh/i, reason: "PIPE_TO_SHELL", score: 10 },
    { pattern: /eval\(/i, reason: "EVAL_USAGE", score: 10 },
    { pattern: /child_process/i, reason: "NODE_CHILD_PROCESS", score: 10 },
    { pattern: /exec\(/i, reason: "EXEC_USAGE", score: 10 },
    { pattern: /fs\.writeFile/i, reason: "FILE_WRITE", score: 10 },
    { pattern: /fetch\(/i, reason: "NETWORK_ACCESS", score: 10 }
];
export function scanSkill(content, threshold = 20) {
    let riskScore = 0;
    const reasons = [];
    let hardBlocked = false;
    for (const rule of riskyPatterns) {
        if (rule.pattern.test(content)) {
            riskScore += rule.score;
            reasons.push(rule.reason);
            if (rule.hardBlock) {
                hardBlocked = true;
            }
        }
    }
    const allowed = !hardBlocked && riskScore < threshold;
    return { allowed, riskScore, reasons, threshold };
}
//# sourceMappingURL=scan.js.map