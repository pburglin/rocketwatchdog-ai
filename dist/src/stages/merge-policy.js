import { mergeEffectivePolicy } from "../types/policy.js";
export class MergePolicyStage {
    async run(ctx) {
        if (ctx.policy) {
            return ctx;
        }
        if (!ctx.workload)
            throw new Error("Missing workload");
        ctx.policy = mergeEffectivePolicy(ctx.snapshot.platform, ctx.workload);
        return ctx;
    }
}
//# sourceMappingURL=merge-policy.js.map