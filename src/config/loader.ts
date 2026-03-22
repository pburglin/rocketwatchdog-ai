import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import type { ConfigSnapshot, PlatformConfig, WorkloadConfig } from "../types/config.js";
import { compileRedactionPattern } from "../core/guard/redaction.js";

const schemaDir = path.resolve(process.cwd(), "schemas");

type AjvClass = typeof import("ajv").default;
const AjvCtor = Ajv as unknown as AjvClass;
const applyFormats = addFormats as unknown as (ajvInstance: InstanceType<AjvClass>) => void;

function buildAjv() {
  const ajv = new AjvCtor({ allErrors: true, strict: false });
  applyFormats(ajv);
  const platformSchema = JSON.parse(
    fs.readFileSync(path.join(schemaDir, "platform.schema.json"), "utf-8")
  );
  const workloadSchema = JSON.parse(
    fs.readFileSync(path.join(schemaDir, "workload.schema.json"), "utf-8")
  );
  ajv.addSchema(platformSchema, "platform.schema.json");
  ajv.addSchema(workloadSchema, "workload.schema.json");
  return ajv;
}

const ajv = buildAjv();
const validatePlatform = ajv.getSchema("platform.schema.json");
const validateWorkload = ajv.getSchema("workload.schema.json");

export function loadConfigDir(configDir: string): ConfigSnapshot {
  const platformPath = path.join(configDir, "platform.yaml");
  if (!fs.existsSync(platformPath)) {
    throw new Error(`Platform config not found: ${platformPath}`);
  }
  const platform = parseYaml(platformPath) as PlatformConfig;
  validateOrThrow(validatePlatform, platform, "platform.yaml");

  const workloadsDir = path.join(configDir, "workloads");
  if (!fs.existsSync(workloadsDir)) {
    throw new Error(`Workloads directory not found: ${workloadsDir}`);
  }
  const workloadFiles = fs
    .readdirSync(workloadsDir)
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
  const workloads = workloadFiles.map((file) => {
    const workload = parseYaml(path.join(workloadsDir, file)) as WorkloadConfig;
    validateOrThrow(validateWorkload, workload, `workloads/${file}`);
    return workload;
  });

  const toolsDir = path.join(configDir, "tools");
  const toolSchemas: Record<string, Record<string, unknown>> = {};
  if (fs.existsSync(toolsDir)) {
    for (const file of fs.readdirSync(toolsDir)) {
      if (!file.endsWith(".json")) continue;
      const raw = fs.readFileSync(path.join(toolsDir, file), "utf-8");
      const schema = JSON.parse(raw) as Record<string, unknown>;
      toolSchemas[path.basename(file, ".json")] = schema;
    }
  }

  validateToolSchemas(toolSchemas);
  validateSnapshot(platform, workloads, toolSchemas);
  validateRedactionPatterns(platform);

  return {
    platform,
    workloads,
    toolSchemas,
    loadedAt: new Date().toISOString()
  };
}

function parseYaml(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.parse(raw);
}

function validateToolSchemas(toolSchemas: Record<string, Record<string, unknown>>) {
  if (Object.keys(toolSchemas).length === 0) return;
  const schemaAjv = new AjvCtor({ allErrors: true, strict: false });
  applyFormats(schemaAjv);
  for (const [name, schema] of Object.entries(toolSchemas)) {
    try {
      schemaAjv.compile(schema);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_schema_error";
      throw new Error(`Tool schema invalid (${name}.json): ${message}`);
    }
  }
}

function validateSnapshot(
  platform: PlatformConfig,
  workloads: WorkloadConfig[],
  toolSchemas: Record<string, Record<string, unknown>>
) {
  const ids = new Set<string>();
  for (const workload of workloads) {
    if (ids.has(workload.id)) {
      throw new Error(`Duplicate workload id detected: ${workload.id}`);
    }
    ids.add(workload.id);
  }

  const defaultId = platform.routing.default_workload ?? "default";
  if (!ids.has(defaultId)) {
    throw new Error(`Default workload not found: ${defaultId}`);
  }

  for (const workload of workloads) {
    const { policy, guards } = workload;
    const allowedBackends = policy.allowed_llm_backends ?? [];
    const allowedMcpBackends = policy.allowed_mcp_backends ?? [];

    if (allowedBackends.length > 0) {
      const missing = allowedBackends.filter((name) => !platform.llm_backends[name]);
      if (missing.length > 0) {
        throw new Error(
          `Workload ${workload.id} references unknown llm_backends: ${missing.join(", ")}`
        );
      }
    }

    if (allowedMcpBackends.length > 0) {
      const missing = allowedMcpBackends.filter((name) => !platform.mcp_backends[name]);
      if (missing.length > 0) {
        throw new Error(
          `Workload ${workload.id} references unknown mcp_backends: ${missing.join(", ")}`
        );
      }
    }

    if (policy.allowed_models?.length) {
      const backendsToCheck = allowedBackends.length > 0 ? allowedBackends : Object.keys(platform.llm_backends);
      const availableModels = new Set<string>();
      for (const name of backendsToCheck) {
        const backend = platform.llm_backends[name];
        backend?.models?.forEach((model) => availableModels.add(model));
      }
      const missingModels = policy.allowed_models.filter((model) => !availableModels.has(model));
      if (missingModels.length > 0) {
        throw new Error(
          `Workload ${workload.id} references unknown allowed_models: ${missingModels.join(", ")}`
        );
      }
    }

    if (guards?.tools?.require_tool_schema_validation && policy.allowed_tools?.length) {
      const missingSchemas = policy.allowed_tools.filter((tool) => !toolSchemas[tool]);
      if (missingSchemas.length > 0) {
        throw new Error(
          `Workload ${workload.id} requires tool schemas but missing: ${missingSchemas.join(", ")}`
        );
      }
    }
  }
}

function validateRedactionPatterns(platform: PlatformConfig) {
  const patterns = [
    ...(platform.redaction.secret_patterns ?? []),
    ...(platform.redaction.pii_patterns ?? [])
  ];
  for (const pattern of patterns) {
    try {
      compileRedactionPattern(pattern);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_pattern_error";
      throw new Error(`Invalid redaction pattern (${pattern}): ${message}`);
    }
  }
}

function validateOrThrow(
  validator: ((data: unknown) => boolean) | undefined,
  data: unknown,
  name: string
) {
  if (!validator || !validator(data)) {
    const errors =
      validator?.errors?.map((err: ErrorObject) => `${err.instancePath} ${err.message}`) ?? [];
    throw new Error(`Config schema validation failed (${name}): ${errors.join("; ")}`);
  }
}
