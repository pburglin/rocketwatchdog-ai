import { formatDistanceToNow } from 'date-fns';
import { API_BASE } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import type { ControlPlaneState } from '../hooks/useControlPlane';
import type { RBACPermission, User } from '../types/api';

interface SettingsPageProps {
  auth: {
    user: User | null;
    permissions: RBACPermission | null;
    hasPermission: (permission: string) => boolean;
  };
  controlPlane: ControlPlaneState;
}

export function SettingsPage({ auth, controlPlane }: SettingsPageProps) {
  const security = controlPlane.effectiveConfig?.platform.security;
  const logging = controlPlane.effectiveConfig?.platform.logging;
  const authMode = controlPlane.effectiveConfig?.platform.auth?.mode ?? 'none';

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Settings & operators</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Platform configuration overview</h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Frontend connection</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">API base</p>
              <p className="mt-2 font-mono text-sky-200">{API_BASE}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Config snapshot</p>
              <p className="mt-2 text-white">
                {controlPlane.configStatus?.loadedAt
                  ? formatDistanceToNow(new Date(controlPlane.configStatus.loadedAt), {
                      addSuffix: true,
                    })
                  : 'Unavailable'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Access</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Current user</span>
              <span className="font-medium text-white">{auth.user?.email ?? 'anonymous'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Backend auth mode</span>
              <StatusBadge
                label={authMode}
                tone={authMode === 'none' ? 'configured' : 'attention'}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span>Can reload config</span>
              <span className="font-medium text-white">
                {auth.hasPermission('write.config') ? 'yes' : 'read-only'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Security defaults</h2>
          <div className="mt-4 grid gap-3 text-sm text-gray-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Default level: <span className="font-medium text-white">{security?.default_level ?? 'unknown'}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Prompt cap: <span className="font-medium text-white">{security?.max_prompt_chars ?? 'n/a'}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Output cap: <span className="font-medium text-white">{security?.max_output_chars ?? 'n/a'}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Secret redaction in logs:{' '}
              <span className="font-medium text-white">
                {security?.redact_secrets_in_logs ? 'enabled' : 'disabled'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Runtime logging</h2>
          <div className="mt-4 grid gap-3 text-sm text-gray-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Level: <span className="font-medium text-white">{logging?.level ?? 'unknown'}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Access log:{' '}
              <span className="font-medium text-white">{logging?.access_log ? 'enabled' : 'disabled'}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Decision log:{' '}
              <span className="font-medium text-white">{logging?.decision_log ? 'enabled' : 'disabled'}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              Log directory: <span className="font-medium text-white">{logging?.log_dir ?? 'stdout only'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
