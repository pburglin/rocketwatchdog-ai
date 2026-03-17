import type { PlatformConfig, WorkloadConfig } from "../types/config.js";
import type { RequestContext } from "../types/request.js";
import { getByJsonPath } from "../utils/jsonpath.js";

export function resolveWorkload(
  platform: PlatformConfig,
  workloads: WorkloadConfig[],
  ctx: RequestContext
): WorkloadConfig | null {
  const headerKey = platform.routing.workload_header?.toLowerCase();
  const trustedApps = new Set(platform.routing.trusted_override_source_apps ?? []);
  const allowOverride = platform.routing.allow_client_workload_override;
  const sourceApp = ctx.sourceApp;

  if (headerKey) {
    const headerValue = ctx.headers[headerKey];
    if (headerValue && (allowOverride || (sourceApp && trustedApps.has(sourceApp)))) {
      const byHeader = workloads.find((workload) => workload.id === headerValue);
      if (byHeader) return byHeader;
    }
  }

  const metaPath = platform.routing.metadata_paths?.workload;
  if (metaPath && (allowOverride || (sourceApp && trustedApps.has(sourceApp)))) {
    const metaValue = getByJsonPath(ctx.payload ?? {}, metaPath);
    if (typeof metaValue === "string") {
      const byMeta = workloads.find((workload) => workload.id === metaValue);
      if (byMeta) return byMeta;
    }
  }

  for (const workload of workloads) {
    const match = workload.match ?? {};
    if (match.routes?.length) {
      if (!match.routes.some((route) => ctx.route.startsWith(route))) {
        continue;
      }
    }
    if (match.headers) {
      const matchesAll = Object.entries(match.headers).every(
        ([key, value]) => ctx.headers[key.toLowerCase()] === value
      );
      if (!matchesAll) continue;
    }
    if (match.metadata) {
      const matchesAll = Object.entries(match.metadata).every(
        ([key, value]) => getByJsonPath(ctx.payload ?? {}, key) === value
      );
      if (!matchesAll) continue;
    }
    return workload;
  }

  if (sourceApp && platform.routing.source_app_workload_map?.[sourceApp]) {
    const mapped = platform.routing.source_app_workload_map[sourceApp];
    const bySource = workloads.find((workload) => workload.id === mapped);
    if (bySource) return bySource;
  }

  const defaultId = platform.routing.default_workload ?? "default";
  return workloads.find((workload) => workload.id === defaultId) ?? null;
}
