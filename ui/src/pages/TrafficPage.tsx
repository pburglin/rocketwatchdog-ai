import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatusBadge } from '../components/StatusBadge';
import type { ControlPlaneState } from '../hooks/useControlPlane';

interface TrafficPageProps {
  controlPlane: ControlPlaneState;
}

export function TrafficPage({ controlPlane }: TrafficPageProps) {
  const chartData = useMemo(() => {
    return controlPlane.traffic
      .slice(0, 10)
      .reverse()
      .map((entry) => ({
        path: entry.path.replace('/v1/', ''),
        duration: entry.duration_ms,
        blocked: entry.action === 'block' ? 1 : 0,
      }));
  }, [controlPlane.traffic]);

  const counts = controlPlane.traffic.reduce(
    (summary, entry) => {
      summary.total += 1;
      if (entry.action === 'allow') summary.allow += 1;
      if (entry.action === 'block') summary.block += 1;
      if (entry.action === 'allow_with_annotations') summary.annotated += 1;
      return summary;
    },
    { total: 0, allow: 0, block: 0, annotated: 0 }
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Traffic intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Backend-observed live request stream</h1>
          </div>
          <StatusBadge label={`${counts.total} events`} tone="configured" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-gray-400">Allowed</p>
            <p className="mt-2 text-3xl font-semibold text-white">{counts.allow}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-gray-400">Blocked / failed</p>
            <p className="mt-2 text-3xl font-semibold text-white">{counts.block}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-gray-400">Annotated</p>
            <p className="mt-2 text-3xl font-semibold text-white">{counts.annotated}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Recent latency profile</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="path" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.18)',
                    borderRadius: '16px',
                  }}
                />
                <Bar dataKey="duration" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Signal notes</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            <p>
              These rows come from the backend traffic buffer, so they include direct API traffic
              such as custom paths like <span className="font-mono text-sky-200">/v1/abc</span>,
              not just requests initiated by this browser session.
            </p>
            <p>
              Policy decisions, blocked requests, and proxy failures are captured by the backend and
              rendered here as soon as the polling cycle refreshes.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-semibold text-white">Recent events</h2>
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-black/20 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Workload</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {controlPlane.traffic.map((entry) => (
                <tr key={entry.id} className="bg-white/[0.02]">
                  <td className="px-4 py-3 text-gray-300">
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-sky-200">{entry.path}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.method}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.workload}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={entry.action}
                      tone={
                        entry.action === 'allow'
                          ? 'healthy'
                          : entry.action === 'allow_with_annotations'
                            ? 'configured'
                            : 'attention'
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-300">{entry.status_code ?? 'n/a'}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.duration_ms} ms</td>
                  <td className="px-4 py-3 text-gray-400">
                    {entry.reasonCodes?.join(', ') || 'none'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
