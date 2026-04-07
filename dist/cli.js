import { Command } from "commander";
import fs from "node:fs";
import { loadConfigDir } from "./config/loader.js";
import { mergeEffectivePolicy } from "./types/policy.js";
import { resolveWorkload } from "./core/workload.js";
import { runGuards } from "./core/guard/index.js";
import { buildPipeline } from "./pipeline/build.js";
const program = new Command();
program.name("rocketwatchdog").description("RocketWatchDog.ai CLI").version("0.1.0");
program
    .command("serve")
    .description("Start the RocketWatchDog server")
    .option("-c, --config-dir <path>", "Config directory", "configs")
    .action(async (options) => {
    process.env.RWD_CONFIG_DIR = options.configDir;
    await import("./index.js");
});
program
    .command("validate-config")
    .description("Validate configuration")
    .option("-c, --config-dir <path>", "Config directory", "configs")
    .action((options) => {
    loadConfigDir(options.configDir);
    console.log("Config valid");
});
program
    .command("print-effective-policy")
    .description("Print effective policy for a workload")
    .option("-c, --config-dir <path>", "Config directory", "configs")
    .requiredOption("-w, --workload <id>", "Workload ID")
    .action((options) => {
    const snapshot = loadConfigDir(options.configDir);
    const workload = snapshot.workloads.find((w) => w.id === options.workload);
    if (!workload)
        throw new Error(`Unknown workload: ${options.workload}`);
    const policy = mergeEffectivePolicy(snapshot.platform, workload);
    console.log(JSON.stringify(policy, null, 2));
});
program
    .command("dry-run")
    .description("Run a dry-run request through the guard pipeline")
    .option("-c, --config-dir <path>", "Config directory", "configs")
    .requiredOption("-r, --request-file <path>", "Request JSON file")
    .action(async (options) => {
    const snapshot = loadConfigDir(options.configDir);
    const requestPayload = JSON.parse(fs.readFileSync(options.requestFile, "utf-8"));
    const headers = normalizeHeaders(requestPayload.headers ?? {});
    const workload = resolveWorkload(snapshot.platform, snapshot.workloads, {
        route: requestPayload.route ?? "/v1/proxy/llm",
        headers,
        payload: requestPayload.body ?? requestPayload
    });
    if (!workload)
        throw new Error("No workload resolved");
    const policy = mergeEffectivePolicy(snapshot.platform, workload);
    const pipeline = buildPipeline();
    const ctx = await pipeline.run({
        route: requestPayload.route ?? "/v1/proxy/llm",
        headers,
        payload: requestPayload.body ?? requestPayload,
        snapshot
    });
    if (!ctx.decision) {
        const guardResult = runGuards({ text: JSON.stringify(requestPayload.body ?? requestPayload) }, policy, snapshot.platform, snapshot.toolSchemas);
        console.log(JSON.stringify({ workload: workload.id, decision: guardResult.decision }, null, 2));
        return;
    }
    console.log(JSON.stringify({ workload: workload.id, decision: ctx.decision }, null, 2));
});
program
    .command("config-status")
    .description("Fetch config status from the running server")
    .option("-c, --config-dir <path>", "Config directory", "configs")
    .action(async (options) => {
    const snapshot = loadConfigDir(options.configDir);
    const url = `http://${snapshot.platform.server.host}:${snapshot.platform.server.port}/v1/config/status`;
    const response = await fetch(url);
    const text = await response.text();
    console.log(text);
});
program
    .command("reload")
    .description("Call the config reload endpoint")
    .option("-c, --config-dir <path>", "Config directory", "configs")
    .action(async (options) => {
    const snapshot = loadConfigDir(options.configDir);
    const url = `http://${snapshot.platform.server.host}:${snapshot.platform.server.port}/v1/config/reload`;
    const response = await fetch(url, { method: "POST" });
    const text = await response.text();
    console.log(text);
});
program
    .command("perf-summary")
    .description("Fetch recent traffic and print latency summaries")
    .option("-c, --config-dir <path>", "Config directory", "configs")
    .action(async (options) => {
    const snapshot = loadConfigDir(options.configDir);
    const base = `http://${snapshot.platform.server.host}:${snapshot.platform.server.port}`;
    const response = await fetch(`${base}/v1/traffic/recent?limit=200`);
    const data = await response.json();
    const items = data.items ?? [];
    const sorted = [...items].sort((a, b) => (b.duration_ms ?? 0) - (a.duration_ms ?? 0));
    const avg = items.length ? items.reduce((sum, item) => sum + (item.duration_ms ?? 0), 0) / items.length : 0;
    const p95 = sorted.length ? (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]?.duration_ms ?? 0) : 0;
    console.log(JSON.stringify({
        count: items.length,
        avg_ms: Number(avg.toFixed(2)),
        p95_ms: p95,
        slowest: sorted.slice(0, 5)
    }, null, 2));
});
program.parse(process.argv);
function normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = value;
    }
    return normalized;
}
//# sourceMappingURL=cli.js.map