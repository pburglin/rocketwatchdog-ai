import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
import { runGuards } from "../core/guard/index.js";
import { extractTextFromMessages, extractToolDefinitions, extractToolInvocations } from "../utils/extract.js";

export class OutputGuardsStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    if (!ctx.policy) throw new Error("Missing policy");
    
    // Check if we have a response to guard
    const response = ctx.payload?.response;
    const toolInvocations = extractToolInvocations(ctx.payload);
    
    const result = runGuards(
      { text: response, tools: undefined, toolInvocations },
      ctx.policy,
      ctx.snapshot.platform,
      ctx.snapshot.toolSchemas
    );

    const reasons = [...result.decision.reasonCodes];
    
    // Check output size limits
    const outputLength = typeof response === "string" ? response.length : 0;
    if (ctx.policy.max_output_chars && outputLength > ctx.policy.max_output_chars) {
      reasons.push("OUTPUT_TOO_LONG");
    }

    ctx.decision = {
      ...result.decision,
      reasonCodes: reasons,
      action: reasons.length === 0 ? "allow" : "block",
      severity: reasons.length === 0 ? "info" : result.decision.severity
    };
    return ctx;
  }
}
