import { performance } from 'node:perf_hooks';

const baseUrl = process.env.RWD_BASE_URL ?? 'http://127.0.0.1:8080';
const iterations = Number.parseInt(process.env.RWD_PERF_ITERATIONS ?? '20', 10);
const concurrency = Number.parseInt(process.env.RWD_PERF_CONCURRENCY ?? '4', 10);

const scenarios = [
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

async function callScenario(scenario) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${scenario.path}`, {
    method: scenario.method,
    headers: { 'content-type': 'application/json' },
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
      if (result.status >= 400) {
        throw new Error(`${scenario.name} failed with status ${result.status}`);
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
  generatedAt: new Date().toISOString(),
  results,
}, null, 2));
