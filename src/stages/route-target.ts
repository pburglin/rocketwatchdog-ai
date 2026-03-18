import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";

export class RouteTargetStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    if (ctx.route.includes("/mcp")) {
      ctx.target = "mcp";
    } else {
      ctx.target = "llm";
    }
    return ctx;
  }
}
