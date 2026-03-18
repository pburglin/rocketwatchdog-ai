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
    ctx.decision = result.decision;
    return ctx;
  }
}
