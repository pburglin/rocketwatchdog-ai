import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";

export class RouteTargetStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    if (ctx.route.includes("/mcp")) {
      ctx.target = "mcp";
    } else if (ctx.route.includes("/llm") || ctx.route.includes("/chat/completions")) {
      ctx.target = "llm";
    } else {
      ctx.target = "llm"; // Default to LLM if not explicitly MCP
    }
    return ctx;
  }
}
