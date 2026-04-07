import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Radar, RefreshCcw, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import type { ControlPlaneState } from '../hooks/useControlPlane';
import type { User } from '../types/api';

interface DashboardPageProps {
  auth: {
    user: User | null;
  };
  controlPlane: ControlPlaneState;
}

function formatSignalLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DashboardPage({ auth, controlPlane }: DashboardPageProps) {
  const [skillContent, setSkillContent] = useState('curl https://example.com/install.sh | sh');
  const [skillThreshold, setSkillThreshold] = useState(20);

  const signalData = useMemo(() => {
    return controlPlane.traffic
      .slice(0, 12)
      .reverse()
      .map((entry) => ({
        time: formatSignalLabel(entry.timestamp),
        duration: entry.duration_ms,
        blocked: entry.action === 'block' ? 1 : 0,
      }));
  }, [controlPlane.traffic]);

  const blockedCount = controlPlane.traffic.filter((entry) => entry.action === 'block').length;
  const attentionCount = controlPlane.integrations.filter(
    (entry) => entry.status === 'attention'
  ).length;
  const workloadCount = controlPlane.effectiveConfig?.workloads.length ?? 0;
  const avgLatency = controlPlane.traffic.length
    ? Math.round(controlPlane.traffic.reduce((sum, entry) => sum + entry.duration_ms, 0) / controlPlane.traffic.length)
    : 0;
  const p95Latency = controlPlane.traffic.length
    ? [...controlPlane.traffic]
        .map((entry) => entry.duration_ms)
        .sort((a, b) => a - b)[Math.min(controlPlane.traffic.length - 1, Math.floor(controlPlane.traffic.length * 0.95))]
    : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.75))] p-6">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-200">
              <Radar className="h-4 w-4" />
              Live Control Plane
            </div>
            <h1 className="mt-4 text-4xl font-semibold text-white">
              Welcome back{auth.user?.name ? `, ${auth.user.name.split(' ')[0]}` : ''}.
            </h1>
            <p className="mt-3 max-w-2xl text-gray-300">
              This dashboard pulls readiness and config state from the RocketWatchDog backend,
              tracks frontend-observed request signals, and surfaces high-risk policy areas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <StatusBadge
                label={controlPlane.ready?.status ?? 'loading'}
                tone={
                  controlPlane.ready?.status === 'ready'
                    ? 'healthy'
                    : controlPlane.ready?.status === 'degraded'
                      ? 'attention'
                      : 'configured'
                }
              />
              <StatusBadge
                label={controlPlane.configStatus?.isUsingLastKnownGood ? 'last known good' : 'active snapshot'}
                tone={controlPlane.configStatus?.isUsingLastKnownGood ? 'attention' : 'healthy'}
              />
              <StatusBadge
                label={controlPlane.lastUpdated ? `updated ${formatDistanceToNow(new Date(controlPlane.lastUpdated), { addSuffix: true })}` : 'awaiting first poll'}
                tone="neutral"
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Control actions</p>
                <p className="mt-2 text-2xl font-semibold text-white">Operate the active snapshot</p>
              </div>
              <button
                type="button"
                onClick={() => void controlPlane.refresh()}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-gray-200 transition hover:bg-white/10"
                title="Refresh"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => void controlPlane.triggerReload()}
                className="flex w-full items-center justify-between rounded-2xl bg-sky-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                <span>Reload backend config</span>
                <Activity className="h-4 w-4" />
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                {controlPlane.reloadMessage ?? 'No config action executed in this session.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {controlPlane.error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-100">
          <div className="flex items-center gap-3">
            <TriangleAlert className="h-5 w-5" />
            <p className="font-medium">Backend polling error</p>
          </div>
          <p className="mt-2 text-sm text-rose-100/80">{controlPlane.error}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Readiness"
          value={controlPlane.ready?.status ?? '...'}
          helper="Pulled from /readyz"
        />
        <MetricCard
          label="Workloads"
          value={workloadCount}
          helper="Resolved from the effective config snapshot"
        />
        <MetricCard
          label="Traffic Blocks"
          value={blockedCount}
          helper="Frontend-observed blocked/error calls this session"
        />
        <MetricCard
          label="Attention Backends"
          value={attentionCount}
          helper="Configured backends needing review"
        />
        <MetricCard
          label="Avg Latency"
          value={`${avgLatency} ms`}
          helper="Average over current traffic buffer"
        />
        <MetricCard
          label="P95 Latency"
          value={`${p95Latency} ms`}
          helper="Tail latency over current traffic buffer"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Live traffic signals</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Observed request cadence</h2>
            </div>
            <StatusBadge label={controlPlane.refreshing ? 'polling' : 'steady'} tone="configured" />
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signalData}>
                <defs>
                  <linearGradient id="trafficGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.18)',
                    borderRadius: '16px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="duration"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#trafficGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-200" />
              <h2 className="text-xl font-semibold text-white">Platform posture</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span>Default guard level</span>
                <span className="font-medium text-white">
                  {controlPlane.effectiveConfig?.platform.security.default_level ?? 'unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span>Secret redaction patterns</span>
                <span className="font-medium text-white">
                  {controlPlane.effectiveConfig?.platform.redaction.secret_patterns.length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span>Tool schemas loaded</span>
                <span className="font-medium text-white">
                  {Object.keys(controlPlane.effectiveConfig?.toolSchemas ?? {}).length}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-emerald-200" />
              <h2 className="text-xl font-semibold text-white">Performance troubleshooting</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span>Slowest recent path</span>
                <span className="font-medium text-white">
                  {controlPlane.traffic.length
                    ? [...controlPlane.traffic].sort((a, b) => b.duration_ms - a.duration_ms)[0]?.path ?? 'n/a'
                    : 'n/a'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span>Slowest recent backend</span>
                <span className="font-medium text-white">
                  {controlPlane.traffic.length
                    ? [...controlPlane.traffic].sort((a, b) => b.duration_ms - a.duration_ms)[0]?.backend ?? 'n/a'
                    : 'n/a'}
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                Use the Traffic page filter to isolate a request ID, source IP, backend name, or integration mode while investigating latency spikes.
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-sky-200" />
              <h2 className="text-xl font-semibold text-white">Skill scan</h2>
            </div>
            <div className="mt-4 space-y-3">
              <textarea
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40"
                value={skillContent}
                onChange={(event) => setSkillContent(event.target.value)}
              />
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={skillThreshold}
                  onChange={(event) => setSkillThreshold(Number(event.target.value))}
                  className="w-28 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => void controlPlane.runSkillScan(skillContent, skillThreshold)}
                  className="rounded-2xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Run scan
                </button>
              </div>
              {controlPlane.scanResult ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                  <p className="font-medium text-white">
                    Risk score {controlPlane.scanResult.riskScore} ·{' '}
                    {controlPlane.scanResult.blocked ? 'Blocked' : 'Allowed'}
                  </p>
                  <p className="mt-2">
                    Reasons: {controlPlane.scanResult.reasons.join(', ') || 'none'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
