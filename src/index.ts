import fastify from "fastify";
import { loadConfigDir } from "./config/loader.js";
import { buildLogger } from "./logging/logger.js";
import { registerRequestId } from "./logging/request-id.js";
import { registerRoutes } from "./http/routes.js";
import { resolveWorkload } from "./core/workload.js";
import { mergeEffectivePolicy } from "./types/policy.js";
import type { ConfigSnapshot } from "./types/config.js";

const configDir = process.env.RWD_CONFIG_DIR ?? "configs";
const snapshot: ConfigSnapshot = loadConfigDir(configDir);
const logger = buildLogger(snapshot.platform.logging);

const app = fastify({
  logger,
  bodyLimit: snapshot.platform.server.max_body_size_kb * 1024,
  requestTimeout: snapshot.platform.server.request_timeout_ms
});

registerRequestId(app);

function resolvePolicy(
  route: string,
  headers: Record<string, string>,
  payload?: Record<string, unknown>
) {
  const workload = resolveWorkload(snapshot.platform, snapshot.workloads, {
    route,
    headers,
    payload,
    sourceApp: headers[snapshot.platform.routing.source_app_header?.toLowerCase() ?? ""]
  });
  if (!workload) {
    throw new Error("No workload resolved");
  }
  return mergeEffectivePolicy(snapshot.platform, workload);
}

registerRoutes(app, snapshot, resolvePolicy);

app
  .listen({ port: snapshot.platform.server.port, host: snapshot.platform.server.host })
  .then(() => {
    app.log.info(
      `RocketWatchDog listening on ${snapshot.platform.server.host}:${snapshot.platform.server.port}`
    );
  })
  .catch((err) => {
    app.log.error(err, "Failed to start");
    process.exit(1);
  });
