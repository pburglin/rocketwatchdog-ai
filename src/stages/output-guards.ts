import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
import { runGuards } from "../core/guard/index.js";
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
      { text: response, tools: undefined, toolInvocations },
      ctx.policy,
      ctx.snapshot.platform,
      ctx.snapshot.toolSchemas
    );

    const reasons = [...result.decision.reasonCodes];

    const outputLength = response.length;
    if (ctx.policy.max_output_chars && outputLength > ctx.policy.max_output_chars) {
      reasons.push("OUTPUT_TOO_LONG");
    }

    const action = reasons.length > 0 ? "block" : result.decision.action;
    const severity = reasons.length > 0 ? "high" : result.decision.severity;

    ctx.decision = {
      ...result.decision,
      reasonCodes: reasons,
      action,
      severity
    };
    return ctx;
  }
}
