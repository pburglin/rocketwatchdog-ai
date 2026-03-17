export type GuardDecision = {
  action: "allow" | "allow_with_annotations" | "rewrite" | "mask" | "challenge" | "block";
  reasonCodes: string[];
  severity: "info" | "low" | "medium" | "high" | "critical";
  rewrittenText?: string;
  maskedFields?: string[];
  annotations?: Record<string, unknown>;
};
