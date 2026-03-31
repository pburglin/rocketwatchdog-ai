import type { PipelineStage } from "./stage.js";
export declare class PipelineRunner<Context> {
    private stages;
    constructor(stages: Array<PipelineStage<Context>>);
    run(ctx: Context): Promise<Context>;
}
