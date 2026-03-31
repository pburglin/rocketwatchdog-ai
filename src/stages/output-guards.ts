import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
import { runGuards } from "../core/guard/index.js";
import { redactSecrets } from "../core/guard/redaction.js";
import { detectOwaspOutputRisks } from "../core/guard/owasp.js";
import { extractToolInvocations } from "../utils/extract.js";

export class OutputGuardsStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    if (!ctx.policy) throw new Error("Missing policy");

    const response = ctx.payload?.response;
    if (typeof response !== "string") {
      return ctx;
    }

    const toolInvocations = extractToolInvocations(ctx.payload);
    const result = runGuards(
      { text: response, ...(toolInvocations ? { toolInvocations } : {}) },
      ctx.policy,
      ctx.snapshot.platform,
      ctx.snapshot.toolSchemas
    );

    const reasons = [...result.decision.reasonCodes];

    const outputLength = response.length;
    if (ctx.policy.max_output_chars && outputLength > ctx.policy.max_output_chars) {
      reasons.push("OUTPUT_TOO_LONG");
    }

    let outputRedactionHits = 0;
    if (ctx.policy.output_guards.secret_redaction || ctx.policy.output_guards.pii_redaction) {
      const patterns = [
        ...ctx.snapshot.platform.redaction.secret_patterns,
        ...(ctx.policy.output_guards.pii_redaction
          ? ctx.snapshot.platform.redaction.pii_patterns ?? []
          : [])
      ];
      outputRedactionHits = redactSecrets(response, patterns).hits;
    }

    if (ctx.policy.output_guards.output_policy_scan) {
      reasons.push(...detectOwaspOutputRisks(response, outputRedactionHits));
    }

    const action = reasons.length > 0 ? "block" : result.decision.action;
    const severity = reasons.length > 0 ? "high" : result.decision.severity;

    const shouldAnnotateRedaction = outputRedactionHits > 0 && action !== "block";

    ctx.decision = {
      ...result.decision,
      reasonCodes: reasons,
      action: shouldAnnotateRedaction ? "allow_with_annotations" : action,
      severity,
      ...((shouldAnnotateRedaction
        ? { annotations: { redacted: true } }
        : result.decision.annotations
          ? { annotations: result.decision.annotations }
          : {}) as Record<string, unknown>)
    };
    return ctx;
  }
}
