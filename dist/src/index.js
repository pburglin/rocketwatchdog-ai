import fastify from "fastify";
import { ConfigSnapshotManager } from "./config/snapshot.js";
import { buildLogger } from "./logging/logger.js";
import { registerRequestId } from "./logging/request-id.js";
import { registerRoutes } from "./http/routes.js";
import { resolveWorkload } from "./core/workload.js";
import { mergeEffectivePolicy } from "./types/policy.js";
const configDir = process.env.RWD_CONFIG_DIR ?? "configs";
const snapshotManager = new ConfigSnapshotManager(configDir);
const snapshot = snapshotManager.get();
const logger = buildLogger(snapshot.platform.logging);
const app = fastify({
    logger,
    bodyLimit: snapshot.platform.server.max_body_size_kb * 1024,
    requestTimeout: snapshot.platform.server.request_timeout_ms
});
registerRequestId(app);
function resolvePolicy(route, headers, payload) {
    const current = snapshotManager.get();
    const sourceAppHeader = current.platform.routing.source_app_header?.toLowerCase();
    const workload = resolveWorkload(current.platform, current.workloads, {
        route,
        headers,
        ...(payload ? { payload } : {}),
        ...(sourceAppHeader && headers[sourceAppHeader]
            ? { sourceApp: headers[sourceAppHeader] }
            : {})
    });
    if (!workload) {
        throw new Error("No workload resolved");
    }
    return mergeEffectivePolicy(current.platform, workload);
}
registerRoutes(app, snapshotManager, resolvePolicy);
app
    .listen({ port: snapshot.platform.server.port, host: snapshot.platform.server.host })
    .then(() => {
    app.log.info(`RocketWatchDog listening on ${snapshot.platform.server.host}:${snapshot.platform.server.port}`);
})
    .catch((err) => {
    app.log.error(err, "Failed to start");
    process.exit(1);
});
//# sourceMappingURL=index.js.map