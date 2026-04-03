import { StatusBadge } from '../components/StatusBadge';
import type { ControlPlaneState } from '../hooks/useControlPlane';

interface IntegrationsPageProps {
  controlPlane: ControlPlaneState;
}

export function IntegrationsPage({ controlPlane }: IntegrationsPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Integration map</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Configured LLM and MCP backends</h1>
        <p className="mt-3 max-w-3xl text-gray-300">
          Integration cards are derived from the active backend config snapshot and annotated with
          readiness context. Placeholder endpoints are flagged immediately.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {controlPlane.integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_-60px_rgba(56,189,248,0.8)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{integration.type}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{integration.name}</h2>
              </div>
              <StatusBadge
                label={integration.status}
                tone={
                  integration.status === 'healthy'
                    ? 'healthy'
                    : integration.status === 'configured'
                      ? 'configured'
                      : 'attention'
                }
              />
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-sky-200">
              {integration.url}
            </p>
            <p className="mt-4 text-sm text-gray-300">{integration.detail}</p>
            {integration.models?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {integration.models.map((model) => (
                  <span
                    key={model}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300"
                  >
                    {model}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
