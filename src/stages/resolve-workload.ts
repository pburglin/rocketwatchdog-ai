import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
import { resolveWorkload } from "../core/workload.js";

export class ResolveWorkloadStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    const workload = resolveWorkload(ctx.snapshot.platform, ctx.snapshot.workloads, {
      route: ctx.route,
      headers: ctx.headers,
      payload: ctx.payload,
      sourceApp: ctx.headers[ctx.snapshot.platform.routing.source_app_header?.toLowerCase() ?? ""]
    });
    if (!workload) throw new Error("No workload resolved");
    (ctx as RequestContext & { workload?: typeof workload }).workload = workload;
    return ctx;
  }
}
