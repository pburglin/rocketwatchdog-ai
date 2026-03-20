import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
import { mergeEffectivePolicy } from "../types/policy.js";

export class MergePolicyStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    if (ctx.policy) {
      return ctx;
    }
    if (!ctx.workload) throw new Error("Missing workload");
    ctx.policy = mergeEffectivePolicy(ctx.snapshot.platform, ctx.workload);
    return ctx;
  }
}
