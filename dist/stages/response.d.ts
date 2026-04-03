import type { PipelineStage } from "../pipeline/stage.js";
import type { RequestContext } from "../pipeline/context.js";
export declare class ResponseStage implements PipelineStage<RequestContext> {
    run(ctx: RequestContext): Promise<RequestContext>;
}
