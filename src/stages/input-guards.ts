import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
import { runGuards } from "../core/guard/index.js";
import { extractTextFromMessages, extractToolDefinitions, extractToolInvocations } from "../utils/extract.js";

export class InputGuardsStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    if (!ctx.policy) throw new Error("Missing policy");
    const messages = ctx.payload?.messages;
    const inputText = extractTextFromMessages(messages);
    const tools = extractToolDefinitions(ctx.payload?.tools);
    const toolInvocations = extractToolInvocations(ctx.payload);
    const result = runGuards(
      { text: inputText, tools, toolInvocations },
      ctx.policy,
      ctx.snapshot.platform,
      ctx.snapshot.toolSchemas
    );

    const reasons = [...result.decision.reasonCodes];
    if (ctx.policy.require_user_id && !ctx.canonical?.userId) {
      reasons.push("USER_ID_REQUIRED");
    }
    if (ctx.policy.require_session_id && !ctx.canonical?.sessionId) {
      reasons.push("SESSION_ID_REQUIRED");
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
