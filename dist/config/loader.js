import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { compileRedactionPattern } from "../core/guard/redaction.js";
const schemaDir = path.resolve(process.cwd(), "schemas");
const AjvCtor = Ajv;
const applyFormats = addFormats;
function buildAjv() {
    const ajv = new AjvCtor({ allErrors: true, strict: false });
    applyFormats(ajv);
    const platformSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, "platform.schema.json"), "utf-8"));
    const workloadSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, "workload.schema.json"), "utf-8"));
    ajv.addSchema(platformSchema, "platform.schema.json");
    ajv.addSchema(workloadSchema, "workload.schema.json");
    return ajv;
}
const ajv = buildAjv();
const validatePlatform = ajv.getSchema("platform.schema.json");
const validateWorkload = ajv.getSchema("workload.schema.json");
export function loadConfigDir(configDir) {
    const platformPath = path.join(configDir, "platform.yaml");
    if (!fs.existsSync(platformPath)) {
        throw new Error(`Platform config not found: ${platformPath}`);
    }
    const platform = parseYaml(platformPath);
    validateOrThrow(validatePlatform, platform, "platform.yaml");
    const workloadsDir = path.join(configDir, "workloads");
    if (!fs.existsSync(workloadsDir)) {
        throw new Error(`Workloads directory not found: ${workloadsDir}`);
    }
    const workloadFiles = fs
        .readdirSync(workloadsDir)
        .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
    if (workloadFiles.length === 0) {
        throw new Error(`No workload configs found in ${workloadsDir}`);
    }
    const workloads = workloadFiles.map((file) => {
        const workload = parseYaml(path.join(workloadsDir, file));
        validateOrThrow(validateWorkload, workload, `workloads/${file}`);
        return workload;
    });
    const toolsDir = path.join(configDir, "tools");
    const toolSchemas = {};
    if (fs.existsSync(toolsDir)) {
        for (const file of fs.readdirSync(toolsDir)) {
            if (!file.endsWith(".json"))
                continue;
            const raw = fs.readFileSync(path.join(toolsDir, file), "utf-8");
            const schema = JSON.parse(raw);
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
function parseYaml(filePath) {
    const raw = fs.readFileSync(filePath, "utf-8");
    return yaml.parse(raw);
}
function validateToolSchemas(toolSchemas) {
    if (Object.keys(toolSchemas).length === 0)
        return;
    const schemaAjv = new AjvCtor({ allErrors: true, strict: false });
    applyFormats(schemaAjv);
    for (const [name, schema] of Object.entries(toolSchemas)) {
        try {
            schemaAjv.compile(schema);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown_schema_error";
            throw new Error(`Tool schema invalid (${name}.json): ${message}`);
        }
    }
}
function findDuplicates(items) {
    if (!items || items.length === 0)
        return [];
    const seen = new Set();
    const duplicates = new Set();
    for (const item of items) {
        if (seen.has(item))
            duplicates.add(item);
        seen.add(item);
    }
    return [...duplicates];
}
function validateUrl(value, label, errors) {
    try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            errors.push(`Invalid URL protocol for ${label}: ${value}`);
        }
    }
    catch {
        errors.push(`Invalid URL for ${label}: ${value}`);
    }
}
function validatePositiveInteger(value, label, errors, min = 1) {
    if (value === undefined)
        return;
    if (!Number.isInteger(value) || value < min) {
        errors.push(`${label} must be an integer >= ${min}`);
    }
}
function validateSnapshot(platform, workloads, toolSchemas) {
    const errors = [];
    const ids = new Set();
    for (const workload of workloads) {
        if (ids.has(workload.id)) {
            errors.push(`Duplicate workload id detected: ${workload.id}`);
            continue;
        }
        ids.add(workload.id);
    }
    const defaultId = platform.routing.default_workload ?? "default";
    if (!ids.has(defaultId)) {
        errors.push(`Default workload not found: ${defaultId}`);
    }
    for (const [name, backend] of Object.entries(platform.llm_backends)) {
        validateUrl(backend.base_url, `llm_backends.${name}.base_url`, errors);
        const modelDuplicates = findDuplicates(backend.models);
        if (modelDuplicates.length > 0) {
            errors.push(`LLM backend ${name} has duplicate models: ${modelDuplicates.join(", ")}`);
        }
    }
    for (const [name, backend] of Object.entries(platform.mcp_backends)) {
        validateUrl(backend.base_url, `mcp_backends.${name}.base_url`, errors);
        if (backend.auth?.type === "bearer_env" && !backend.auth.token_env) {
            errors.push(`MCP backend ${name} requires auth.token_env when auth.type=bearer_env`);
        }
    }
    if (platform.auth?.mode === "api_key" && !platform.auth.api_key_env) {
        errors.push("Platform auth.api_key_env is required when auth.mode=api_key");
    }
    for (const [name, backend] of Object.entries(platform.llm_backends)) {
        validatePositiveInteger(backend.timeout_ms, `llm_backends.${name}.timeout_ms`, errors);
    }
    for (const [name, backend] of Object.entries(platform.mcp_backends)) {
        validatePositiveInteger(backend.timeout_ms, `mcp_backends.${name}.timeout_ms`, errors);
    }
    validatePositiveInteger(platform.server.request_timeout_ms, "server.request_timeout_ms", errors);
    validatePositiveInteger(platform.server.max_body_size_kb, "server.max_body_size_kb", errors);
    const debugCapture = platform.logging.debug_capture;
    validatePositiveInteger(debugCapture?.max_entries, "logging.debug_capture.max_entries", errors);
    if (debugCapture?.max_payload_chars !== undefined && debugCapture.max_payload_chars < 32) {
        errors.push("logging.debug_capture.max_payload_chars must be at least 32 characters");
    }
    for (const workload of workloads) {
        const { policy, guards } = workload;
        const allowedBackends = policy.allowed_llm_backends ?? [];
        const allowedMcpBackends = policy.allowed_mcp_backends ?? [];
        if (allowedBackends.length > 0) {
            const missing = allowedBackends.filter((name) => !platform.llm_backends[name]);
            if (missing.length > 0) {
                errors.push(`Workload ${workload.id} references unknown llm_backends: ${missing.join(", ")}`);
            }
        }
        if (allowedMcpBackends.length > 0) {
            const missing = allowedMcpBackends.filter((name) => !platform.mcp_backends[name]);
            if (missing.length > 0) {
                errors.push(`Workload ${workload.id} references unknown mcp_backends: ${missing.join(", ")}`);
            }
        }
        const llmDuplicates = findDuplicates(policy.allowed_llm_backends);
        if (llmDuplicates.length > 0) {
            errors.push(`Workload ${workload.id} has duplicate allowed_llm_backends: ${llmDuplicates.join(", ")}`);
        }
        const mcpDuplicates = findDuplicates(policy.allowed_mcp_backends);
        if (mcpDuplicates.length > 0) {
            errors.push(`Workload ${workload.id} has duplicate allowed_mcp_backends: ${mcpDuplicates.join(", ")}`);
        }
        if (policy.allowed_models?.length) {
            const modelDuplicates = findDuplicates(policy.allowed_models);
            if (modelDuplicates.length > 0) {
                errors.push(`Workload ${workload.id} has duplicate allowed_models: ${modelDuplicates.join(", ")}`);
            }
            const backendsToCheck = allowedBackends.length > 0 ? allowedBackends : Object.keys(platform.llm_backends);
            const availableModels = new Set();
            for (const name of backendsToCheck) {
                const backend = platform.llm_backends[name];
                backend?.models?.forEach((model) => availableModels.add(model));
            }
            const missingModels = policy.allowed_models.filter((model) => !availableModels.has(model));
            if (missingModels.length > 0) {
                errors.push(`Workload ${workload.id} references unknown allowed_models: ${missingModels.join(", ")}`);
            }
        }
        if (policy.allowed_tools?.length) {
            const duplicates = findDuplicates(policy.allowed_tools);
            if (duplicates.length > 0) {
                errors.push(`Workload ${workload.id} has duplicate allowed_tools: ${duplicates.join(", ")}`);
            }
        }
        if (guards?.tools?.require_tool_schema_validation) {
            if (Object.keys(toolSchemas).length === 0) {
                errors.push(`Workload ${workload.id} requires tool schemas but configs/tools is empty`);
            }
            if (policy.allowed_tools?.length) {
                const missingSchemas = policy.allowed_tools.filter((tool) => !toolSchemas[tool]);
                if (missingSchemas.length > 0) {
                    errors.push(`Workload ${workload.id} requires tool schemas but missing: ${missingSchemas.join(", ")}`);
                }
            }
        }
    }
    if (errors.length > 0) {
        throw new Error(`Config validation failed: ${errors.join("; ")}`);
    }
}
function validateRedactionPatterns(platform) {
    const patterns = [
        ...(platform.redaction.secret_patterns ?? []),
        ...(platform.redaction.pii_patterns ?? [])
    ];
    for (const pattern of patterns) {
        try {
            compileRedactionPattern(pattern);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "unknown_pattern_error";
            throw new Error(`Invalid redaction pattern (${pattern}): ${message}`);
        }
    }
}
function validateOrThrow(validator, data, name) {
    if (!validator || !validator(data)) {
        const errors = validator?.errors?.map((err) => `${err.instancePath} ${err.message}`) ?? [];
        throw new Error(`Config schema validation failed (${name}): ${errors.join("; ")}`);
    }
}
//# sourceMappingURL=loader.js.map