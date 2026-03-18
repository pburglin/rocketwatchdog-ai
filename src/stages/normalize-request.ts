import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
import { buildCanonicalRequest } from "../pipeline/normalize.js";

export class NormalizeRequestStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    ctx.canonical = buildCanonicalRequest(
      { requestId: undefined, url: ctx.route, routerPath: ctx.route, ip: "" } as any,
      ctx.headers,
      ctx.payload
    );
    return ctx;
  }
}
