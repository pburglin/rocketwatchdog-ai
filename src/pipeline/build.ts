import { PipelineRunner } from "./runner.js";
import type { RequestContext } from "./context.js";
import { ParseRequestStage } from "../stages/parse-request.js";
import { NormalizeRequestStage } from "../stages/normalize-request.js";
import { ResolveWorkloadStage } from "../stages/resolve-workload.js";
import { MergePolicyStage } from "../stages/merge-policy.js";
import { InputGuardsStage } from "../stages/input-guards.js";
import { RouteTargetStage } from "../stages/route-target.js";
import { OutputGuardsStage } from "../stages/output-guards.js";
import { AuditStage } from "../stages/audit.js";
import { ResponseStage } from "../stages/response.js";

export function buildPipeline() {
  return new PipelineRunner<RequestContext>([
    new ParseRequestStage(),
    new NormalizeRequestStage(),
    new ResolveWorkloadStage(),
    new MergePolicyStage(),
    new InputGuardsStage(),
    new RouteTargetStage(),
    new OutputGuardsStage(),
    new AuditStage(),
    new ResponseStage()
  ]);
}
