import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from '../components/StatusBadge';
import type { ControlPlaneState } from '../hooks/useControlPlane';

interface PerformancePageProps {
  controlPlane: ControlPlaneState;
}

export function PerformancePage({ controlPlane }: PerformancePageProps) {
  const sorted = useMemo(
    () => [...controlPlane.traffic].sort((a, b) => b.duration_ms - a.duration_ms),
    [controlPlane.traffic]
  );

  const topSlow = sorted.slice(0, 10);
  const backendSummary = useMemo(() => {
    const map = new Map<string, { count: number; total: number; max: number }>();
    for (const entry of controlPlane.traffic) {
      const key = entry.backend ?? 'unknown';
      const current = map.get(key) ?? { count: 0, total: 0, max: 0 };
      current.count += 1;
      current.total += entry.duration_ms;
      current.max = Math.max(current.max, entry.duration_ms);
      map.set(key, current);
    }
    return [...map.entries()].map(([backend, value]) => ({
      backend,
      count: value.count,
      avg: Math.round(value.total / value.count),
      max: value.max,
    })).sort((a, b) => b.max - a.max);
  }, [controlPlane.traffic]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Performance & latency</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Admin troubleshooting for slow paths</h1>
        <p className="mt-3 max-w-3xl text-gray-300">
          Inspect the slowest requests, compare backend latency, and correlate issues with request IDs, source IPs,
          or integration mode from the traffic buffer.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Slowest recent requests</h2>
            <StatusBadge label={`${topSlow.length} entries`} tone="configured" />
          </div>
          <div className="mt-4 space-y-3">
            {topSlow.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sky-200">{entry.path}</span>
                  <span className="font-medium text-white">{entry.duration_ms} ms</span>
                  <StatusBadge label={entry.action} tone={entry.action === 'block' ? 'attention' : entry.action === 'allow_with_annotations' ? 'configured' : 'healthy'} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  {entry.backend ? ` • backend ${entry.backend}` : ''}
                  {entry.source_ip ? ` • ${entry.source_ip}` : ''}
                  {entry.request_id ? ` • ${entry.request_id}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Backend latency summary</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            {backendSummary.map((entry) => (
              <div key={entry.backend} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{entry.backend}</span>
                  <span>{entry.count} requests</span>
                </div>
                <p className="mt-2">avg {entry.avg} ms • max {entry.max} ms</p>
              </div>
            ))}
            {backendSummary.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-gray-400">
                No traffic captured yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
