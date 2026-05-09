import type { PlatformConfig, WorkloadConfig } from "../types/config.js";
import type { RequestContext } from "../types/request.js";
import { getByJsonPath } from "../utils/jsonpath.js";

export type WorkloadResolutionStep = {
  stage:
    | "header_override"
    | "metadata_override"
    | "source_app_map"
    | "match_rules"
    | "fallback"
    | "default";
  outcome: "matched" | "skipped" | "miss";
  detail: string;
  workloadId?: string;
};

export type WorkloadResolutionTrace = {
  selectedWorkloadId: string | null;
  selectedBy: WorkloadResolutionStep["stage"] | "none";
  steps: WorkloadResolutionStep[];
};

export function explainWorkloadResolution(
  platform: PlatformConfig,
  workloads: WorkloadConfig[],
  ctx: RequestContext
): WorkloadResolutionTrace {
  const steps: WorkloadResolutionStep[] = [];
  const headerKey = platform.routing.workload_header?.toLowerCase();
  const trustedApps = new Set(platform.routing.trusted_override_source_apps ?? []);
  const allowOverride = platform.routing.allow_client_workload_override;
  const sourceApp = ctx.sourceApp;

  if (headerKey) {
    const headerValue = ctx.headers[headerKey];
    if (!headerValue) {
      steps.push({
        stage: "header_override",
        outcome: "skipped",
        detail: `Header ${headerKey} not present`
      });
    } else if (!(allowOverride || (sourceApp && trustedApps.has(sourceApp)))) {
      steps.push({
        stage: "header_override",
        outcome: "skipped",
        detail: `Header ${headerKey} requested ${headerValue} but source app is not trusted for override`
      });
    } else {
      const byHeader = workloads.find((workload) => workload.id === headerValue);
      if (byHeader) {
        steps.push({
          stage: "header_override",
          outcome: "matched",
          detail: `Resolved from trusted header ${headerKey}`,
          workloadId: byHeader.id
        });
        return { selectedWorkloadId: byHeader.id, selectedBy: "header_override", steps };
      }
      steps.push({
        stage: "header_override",
        outcome: "miss",
        detail: `Header ${headerKey} requested unknown workload ${headerValue}`
      });
    }
  } else {
    steps.push({
      stage: "header_override",
      outcome: "skipped",
      detail: "No workload override header configured"
    });
  }

  const metaPath = platform.routing.metadata_paths?.workload;
  if (metaPath) {
    const metaValue = getByJsonPath(ctx.payload ?? {}, metaPath);
    if (!(allowOverride || (sourceApp && trustedApps.has(sourceApp)))) {
      steps.push({
        stage: "metadata_override",
        outcome: typeof metaValue === "string" ? "skipped" : "miss",
        detail:
          typeof metaValue === "string"
            ? `Metadata path ${metaPath} requested ${metaValue} but source app is not trusted for override`
            : `Metadata path ${metaPath} did not contain a workload override`
      });
    } else if (typeof metaValue === "string") {
      const byMeta = workloads.find((workload) => workload.id === metaValue);
      if (byMeta) {
        steps.push({
          stage: "metadata_override",
          outcome: "matched",
          detail: `Resolved from trusted metadata path ${metaPath}`,
          workloadId: byMeta.id
        });
        return { selectedWorkloadId: byMeta.id, selectedBy: "metadata_override", steps };
      }
      steps.push({
        stage: "metadata_override",
        outcome: "miss",
        detail: `Metadata path ${metaPath} requested unknown workload ${metaValue}`
      });
    } else {
      steps.push({
        stage: "metadata_override",
        outcome: "miss",
        detail: `Metadata path ${metaPath} did not contain a workload override`
      });
    }
  } else {
    steps.push({
      stage: "metadata_override",
      outcome: "skipped",
      detail: "No workload metadata override path configured"
    });
  }

  const mapped = sourceApp ? platform.routing.source_app_workload_map?.[sourceApp] : undefined;
  if (sourceApp && mapped) {
    const bySource = workloads.find((workload) => workload.id === mapped);
    if (bySource) {
      steps.push({
        stage: "source_app_map",
        outcome: "matched",
        detail: `Resolved from source app mapping for ${sourceApp}`,
        workloadId: bySource.id
      });
      return { selectedWorkloadId: bySource.id, selectedBy: "source_app_map", steps };
    }
    steps.push({
      stage: "source_app_map",
      outcome: "miss",
      detail: `Source app ${sourceApp} mapped to unknown workload ${mapped}`
    });
  } else {
    steps.push({
      stage: "source_app_map",
      outcome: sourceApp ? "miss" : "skipped",
      detail: sourceApp
        ? `No source app mapping for ${sourceApp}`
        : "No source app provided for source-app workload mapping"
    });
  }

  const fallbackCandidates: WorkloadConfig[] = [];
  for (const workload of workloads) {
    const match = workload.match ?? {};
    const hasSpecificMatch =
      (match.routes?.length ?? 0) > 0 ||
      Object.keys(match.headers ?? {}).length > 0 ||
      Object.keys(match.metadata ?? {}).length > 0;

    if (!hasSpecificMatch) {
      fallbackCandidates.push(workload);
      continue;
    }

    if (match.routes?.length && !match.routes.some((route) => ctx.route.startsWith(route))) {
      steps.push({
        stage: "match_rules",
        outcome: "miss",
        detail: `Workload ${workload.id} route prefixes did not match ${ctx.route}`,
        workloadId: workload.id
      });
      continue;
    }
    if (match.headers) {
      const mismatchedHeader = Object.entries(match.headers).find(
        ([key, value]) => ctx.headers[key.toLowerCase()] !== value
      );
      if (mismatchedHeader) {
        steps.push({
          stage: "match_rules",
          outcome: "miss",
          detail: `Workload ${workload.id} header ${mismatchedHeader[0]} expected ${mismatchedHeader[1]}`,
          workloadId: workload.id
        });
        continue;
      }
    }
    if (match.metadata) {
      const mismatchedMetadata = Object.entries(match.metadata).find(
        ([key, value]) => getByJsonPath(ctx.payload ?? {}, key) !== value
      );
      if (mismatchedMetadata) {
        steps.push({
          stage: "match_rules",
          outcome: "miss",
          detail: `Workload ${workload.id} metadata ${mismatchedMetadata[0]} expected ${mismatchedMetadata[1]}`,
          workloadId: workload.id
        });
        continue;
      }
    }

    steps.push({
      stage: "match_rules",
      outcome: "matched",
      detail: `Resolved from explicit route/header/metadata match rules`,
      workloadId: workload.id
    });
    return { selectedWorkloadId: workload.id, selectedBy: "match_rules", steps };
  }

  if (fallbackCandidates.length > 0) {
    const fallback = fallbackCandidates[0] ?? null;
    steps.push({
      stage: "fallback",
      outcome: fallback ? "matched" : "miss",
      detail: fallback
        ? `Resolved from fallback workload with no explicit match criteria`
        : "No fallback workload candidates found",
      ...(fallback ? { workloadId: fallback.id } : {})
    });
    return {
      selectedWorkloadId: fallback?.id ?? null,
      selectedBy: fallback ? "fallback" : "none",
      steps
    };
  }

  steps.push({
    stage: "fallback",
    outcome: "miss",
    detail: "No fallback workload candidates found"
  });

  const defaultId = platform.routing.default_workload ?? "default";
  const defaultWorkload = workloads.find((workload) => workload.id === defaultId) ?? null;
  steps.push({
    stage: "default",
    outcome: defaultWorkload ? "matched" : "miss",
    detail: defaultWorkload
      ? `Resolved from routing.default_workload (${defaultId})`
      : `Configured default workload ${defaultId} was not found`,
    ...(defaultWorkload ? { workloadId: defaultWorkload.id } : {})
  });

  return {
    selectedWorkloadId: defaultWorkload?.id ?? null,
    selectedBy: defaultWorkload ? "default" : "none",
    steps
  };
}

export function resolveWorkload(
  platform: PlatformConfig,
  workloads: WorkloadConfig[],
  ctx: RequestContext
): WorkloadConfig | null {
  const trace = explainWorkloadResolution(platform, workloads, ctx);
  return trace.selectedWorkloadId
    ? workloads.find((workload) => workload.id === trace.selectedWorkloadId) ?? null
    : null;
}
