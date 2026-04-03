type ScanResult = {
    allowed: boolean;
    riskScore: number;
    reasons: string[];
    threshold: number;
};
export declare function scanSkill(content: string, threshold?: number): ScanResult;
export {};
