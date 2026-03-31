import { resolveWorkload } from "../core/workload.js";
export class ResolveWorkloadStage {
    async run(ctx) {
        const sourceAppHeader = ctx.snapshot.platform.routing.source_app_header?.toLowerCase();
        const workload = resolveWorkload(ctx.snapshot.platform, ctx.snapshot.workloads, {
            route: ctx.route,
            headers: ctx.headers,
            payload: ctx.payload,
            ...(sourceAppHeader && ctx.headers[sourceAppHeader]
                ? { sourceApp: ctx.headers[sourceAppHeader] }
                : {})
        });
        if (!workload)
            throw new Error("No workload resolved");
        ctx.workload = workload;
        return ctx;
    }
}
//# sourceMappingURL=resolve-workload.js.map