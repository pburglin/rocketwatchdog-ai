import type { PipelineStage } from "./stage.js";

export class PipelineRunner<Context> {
  constructor(private stages: Array<PipelineStage<Context>>) {}

  async run(ctx: Context): Promise<Context> {
    let current = ctx;
    for (const stage of this.stages) {
      current = await stage.run(current);
    }
    return current;
  }
}
