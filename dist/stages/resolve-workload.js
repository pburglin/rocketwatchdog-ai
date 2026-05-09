import { explainWorkloadResolution } from "../core/workload.js";
export class ResolveWorkloadStage {
    async run(ctx) {
        const sourceAppHeader = ctx.snapshot.platform.routing.source_app_header?.toLowerCase();
        const workloadTrace = explainWorkloadResolution(ctx.snapshot.platform, ctx.snapshot.workloads, {
            route: ctx.route,
            headers: ctx.headers,
            payload: ctx.payload,
            ...(sourceAppHeader && ctx.headers[sourceAppHeader]
                ? { sourceApp: ctx.headers[sourceAppHeader] }
                : {})
        });
        const workload = workloadTrace.selectedWorkloadId
            ? ctx.snapshot.workloads.find((item) => item.id === workloadTrace.selectedWorkloadId) ?? null
            : null;
        if (!workload)
            throw new Error("No workload resolved");
        ctx.workload = workload;
        ctx.workloadTrace = workloadTrace;
        return ctx;
    }
}
//# sourceMappingURL=resolve-workload.js.map