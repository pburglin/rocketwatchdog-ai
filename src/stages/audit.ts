import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";

export class AuditStage implements PipelineStage<RequestContext> {
  async run(ctx: RequestContext): Promise<RequestContext> {
    if (ctx.snapshot.platform.logging.decision_log && ctx.decision) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          request_id: ctx.canonical?.requestId,
          workload_id: ctx.policy?.workload_id,
          level: ctx.policy?.level,
          decision: ctx.decision.action,
          reason_codes: ctx.decision.reasonCodes
        })
      );
    }
    return ctx;
  }
}
