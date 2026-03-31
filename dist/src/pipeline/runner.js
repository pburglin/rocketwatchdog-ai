export class PipelineRunner {
    stages;
    constructor(stages) {
        this.stages = stages;
    }
    async run(ctx) {
        let current = ctx;
        for (const stage of this.stages) {
            current = await stage.run(current);
        }
        return current;
    }
}
//# sourceMappingURL=runner.js.map