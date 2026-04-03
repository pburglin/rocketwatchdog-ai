export interface PipelineStage<Context> {
    run(ctx: Context): Promise<Context>;
}
