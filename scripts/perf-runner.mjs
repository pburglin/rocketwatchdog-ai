import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import yaml from 'yaml';

const baseUrl = process.env.RWD_BASE_URL ?? 'http://127.0.0.1:8080';
const iterations = Number.parseInt(process.env.RWD_PERF_ITERATIONS ?? '20', 10);
const concurrency = Number.parseInt(process.env.RWD_PERF_CONCURRENCY ?? '4', 10);
const configDir = process.env.RWD_PERF_CONFIG_DIR ?? 'configs';
const useWorkloadPresets = /^(1|true|yes)$/i.test(process.env.RWD_PERF_USE_WORKLOAD_PRESETS ?? '');
const workloadFilter = new Set(
  (process.env.RWD_PERF_WORKLOADS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const scenarioFilter = new Set(
  (process.env.RWD_PERF_SCENARIOS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const defaultScenarios = [
  {
    name: 'healthz',
    method: 'GET',
    path: '/healthz',
  },
  {
    name: 'decision-safe',
    method: 'POST',
    path: '/v1/decision',
    body: {
      model: 'gpt-main',
      messages: [{ role: 'user', content: 'hello from perf test' }],
    },
  },
  {
    name: 'skills-scan',
    method: 'POST',
    path: '/v1/skills/scan',
    body: {
      content: 'export function hello() { return "hi"; }',
      maxRiskScore: 20,
    },
  },
];

function normalizePresetScenario(workloadId, preset) {
  return {
    name: `${workloadId}:${preset.name}`,
    method: preset.method ?? 'POST',
    path: preset.path,
    headers: preset.headers ?? {},
    ...(preset.body ? { body: preset.body } : {}),
    expectedStatus: preset.expected_status,
    workloadId,
    presetName: preset.name,
  };
}

function loadWorkloadPresetScenarios() {
  const workloadsDir = path.join(configDir, 'workloads');
  if (!fs.existsSync(workloadsDir)) {
    return [];
  }

  return fs
    .readdirSync(workloadsDir)
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .flatMap((file) => {
      const workload = yaml.parse(fs.readFileSync(path.join(workloadsDir, file), 'utf-8'));
      if (!workload?.id || !Array.isArray(workload?.benchmark?.presets)) {
        return [];
      }
      if (workloadFilter.size > 0 && !workloadFilter.has(workload.id)) {
        return [];
      }
      return workload.benchmark.presets.map((preset) => normalizePresetScenario(workload.id, preset));
    });
}

const presetScenarios = useWorkloadPresets ? loadWorkloadPresetScenarios() : [];
const scenarios = [...defaultScenarios, ...presetScenarios].filter((scenario) =>
  scenarioFilter.size === 0 || scenarioFilter.has(scenario.name)
);

if (scenarios.length === 0) {
  throw new Error('No benchmark scenarios selected. Check RWD_PERF_WORKLOADS/RWD_PERF_SCENARIOS filters.');
}

async function callScenario(scenario) {
  const started = performance.now();
  const headers = {
    ...(scenario.body ? { 'content-type': 'application/json' } : {}),
    ...(scenario.headers ?? {}),
  };
  const response = await fetch(`${baseUrl}${scenario.path}`, {
    method: scenario.method,
    headers,
    ...(scenario.body ? { body: JSON.stringify(scenario.body) } : {}),
  });
  await response.text();
  const duration = performance.now() - started;
  return { status: response.status, duration };
}

function summarize(name, samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const avg = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return {
    scenario: name,
    count: sorted.length,
    avg_ms: Number(avg.toFixed(2)),
    p50_ms: Number(percentile(0.5).toFixed(2)),
    p95_ms: Number(percentile(0.95).toFixed(2)),
    max_ms: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

async function runScenario(scenario) {
  const durations = [];
  let completed = 0;

  async function worker() {
    while (completed < iterations) {
      completed += 1;
      const result = await callScenario(scenario);
      const expectedStatus = scenario.expectedStatus;
      const statusMatches = expectedStatus ? result.status === expectedStatus : result.status < 400;
      if (!statusMatches) {
        throw new Error(
          `${scenario.name} failed with status ${result.status}${expectedStatus ? ` (expected ${expectedStatus})` : ''}`
        );
      }
      durations.push(result.duration);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return summarize(scenario.name, durations);
}

const results = [];
for (const scenario of scenarios) {
  results.push(await runScenario(scenario));
}

console.log(JSON.stringify({
  baseUrl,
  iterations,
  concurrency,
  configDir,
  useWorkloadPresets,
  selectedWorkloads: [...workloadFilter],
  selectedScenarios: scenarios.map((scenario) => scenario.name),
  generatedAt: new Date().toISOString(),
  results,
}, null, 2));
