import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
export declare class OutputGuardsStage implements PipelineStage<RequestContext> {
    run(ctx: RequestContext): Promise<RequestContext>;
}
