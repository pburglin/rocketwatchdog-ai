import { useState, type FormEvent } from 'react';
import { ShieldCheck, KeyRound, Cpu, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

const demoAccounts = [
  { email: 'admin@rocketwatchdog.ai', password: 'admin123', role: 'Admin' },
  { email: 'operator@rocketwatchdog.ai', password: 'operator123', role: 'Operator' },
  { email: 'viewer@rocketwatchdog.ai', password: 'viewer123', role: 'Viewer' },
];

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState(demoAccounts[0]?.email ?? '');
  const [password, setPassword] = useState(demoAccounts[0]?.password ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const ok = await login(email, password);
    if (!ok) {
      setError('Invalid demo credentials');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,_#020617,_#0f172a_45%,_#111827)] text-gray-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-sky-950/40 backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200">
              <ShieldCheck className="h-4 w-4" />
              RocketWatchDog.ai Control Plane
            </div>
            <h1 className="mt-8 max-w-xl font-serif text-5xl leading-tight text-white">
              Watch model traffic, enforce guardrails, and operate the proxy from one surface.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-gray-300">
              This frontend polls the backend for readiness, config health, skill scans, and
              backend inventory. Sign in with a demo role to inspect the control plane shell.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <Cpu className="h-5 w-5 text-sky-300" />
              <p className="mt-3 text-sm font-medium text-white">Live platform polling</p>
              <p className="mt-1 text-sm text-gray-400">Health, readiness, config, and policy state.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm font-medium text-white">Guard visibility</p>
              <p className="mt-1 text-sm text-gray-400">Workload levels, tool policies, and redaction settings.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <KeyRound className="h-5 w-5 text-amber-200" />
              <p className="mt-3 text-sm font-medium text-white">Demo auth</p>
              <p className="mt-1 text-sm text-gray-400">Role-based shell access stored in local browser state.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-sky-950/40">
          <h2 className="text-2xl font-semibold text-white">Sign in</h2>
          <p className="mt-2 text-sm text-gray-400">Use one of the bundled demo accounts.</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-300">Email</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/50 focus:bg-white/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-300">Password</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/50 focus:bg-white/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{submitting ? 'Signing in...' : 'Enter control plane'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 space-y-3">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              >
                <div>
                  <p className="font-medium text-white">{account.role}</p>
                  <p className="text-sm text-gray-400">{account.email}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Prefill</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
