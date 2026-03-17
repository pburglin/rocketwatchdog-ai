import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import type { ConfigSnapshot, PlatformConfig, WorkloadConfig } from "../types/config.js";

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
