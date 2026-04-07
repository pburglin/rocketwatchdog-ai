import fs from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/perf-compare.mjs <results.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path, 'utf8'));
for (const result of data.results ?? []) {
  console.log(`${result.scenario}: avg=${result.avg_ms}ms p50=${result.p50_ms}ms p95=${result.p95_ms}ms max=${result.max_ms}ms count=${result.count}`);
}
