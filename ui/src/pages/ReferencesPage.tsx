import { BookOpen, Clock3, ShieldAlert, Zap } from 'lucide-react';
import type { ControlPlaneState } from '../hooks/useControlPlane';
import { StatusBadge } from '../components/StatusBadge';

interface ReferencesPageProps {
  controlPlane: ControlPlaneState;
}

type PolicyReference = {
  summary: string;
  bestFor: string;
  avoidWhen: string;
  latency: 'low' | 'medium' | 'high';
  notes: string[];
};

const POLICY_REFERENCES: Record<string, PolicyReference> = {
  heuristic_prompt_injection: {
    summary:
      'Fast first-line screening for jailbreaks, role hijacking, and instruction overrides in inbound prompts.',
    bestFor:
      'General chat, externally sourced prompts, and broad L1/L2 coverage where low latency matters.',
    avoidWhen:
      'You need deep semantic review of adversarial prompts; pair or replace with higher-cost scanning for sensitive workflows.',
    latency: 'low',
    notes: [
      'Best used as the default baseline input guard.',
      'Good for broad coverage, but expect some misses on obfuscated attacks.',
      'Tune escalation paths instead of relying on this alone for privileged tools.',
    ],
  },
  llm_security_scan: {
    summary:
      'Deeper prompt analysis intended for high-risk workloads that justify additional model-assisted scrutiny.',
    bestFor:
      'Privileged toolchains, regulated data, sensitive MCP actions, and admin-grade flows.',
    avoidWhen:
      'You are serving latency-sensitive chat paths or high-volume public endpoints with modest risk tolerance.',
    latency: 'high',
    notes: [
      'Reserve for L3 or similar critical workloads.',
      'Expect higher cost and higher tail latency than heuristic-only screening.',
      'Use selectively on routes where misses are materially worse than added delay.',
    ],
  },
  secret_redaction: {
    summary:
      'Masks obvious secrets in model output before the response leaves the proxy.',
    bestFor:
      'Any workload that may surface credentials, bearer tokens, or copied configuration fragments.',
    avoidWhen:
      'You need exact verbatim output for internal debugging and can guarantee secrets are not present.',
    latency: 'low',
    notes: [
      'Typically safe to enable broadly.',
      'Low computational overhead compared with semantic output inspection.',
      'Redaction can reduce troubleshooting fidelity unless operators have alternate debug traces.',
    ],
  },
  pii_redaction: {
    summary:
      'Suppresses or masks identity-linked content in outbound text to reduce privacy leakage.',
    bestFor:
      'Customer support, analytics, and enterprise workflows that may echo user-submitted records.',
    avoidWhen:
      'The workflow depends on precise personal data being returned to an authenticated operator.',
    latency: 'medium',
    notes: [
      'Most useful when prompts contain user records or free-form pasted documents.',
      'Can be overzealous in administrative or forensic views.',
      'Combine with role-based routes rather than enabling blindly everywhere.',
    ],
  },
  require_tool_allowlist: {
    summary:
      'Rejects tool invocations unless the target tool is explicitly permitted by workload policy.',
    bestFor:
      'Any system where tool execution changes state, accesses data, or reaches external systems.',
    avoidWhen:
      'You are in a discovery environment where tool catalogs are volatile and strict allowlists would stall iteration.',
    latency: 'low',
    notes: [
      'This should usually be enabled for production tool paths.',
      'Operational cost is policy maintenance, not compute overhead.',
      'Treat it as a foundational control, not an optional enhancement.',
    ],
  },
  require_tool_schema_validation: {
    summary:
      'Validates tool arguments against registered schemas before execution to catch malformed or risky payloads.',
    bestFor:
      'Structured tools with stable contracts, especially anything mutating infrastructure or records.',
    avoidWhen:
      'Your tools accept loose or evolving payloads and you have not stabilized the schema registry.',
    latency: 'medium',
    notes: [
      'Strong control when your JSON schemas are accurate and current.',
      'Weak schemas create false confidence; keep them maintained.',
      'Adds modest overhead but usually pays for itself on safety-critical tools.',
    ],
  },
  require_intent_check: {
    summary:
      'Applies an extra intent review before high-risk tool activity to detect suspicious execution patterns.',
    bestFor:
      'Destructive commands, privileged automation, and routes where misuse is costly.',
    avoidWhen:
      'You need deterministic low-latency tool execution and the tool risk profile is already low.',
    latency: 'high',
    notes: [
      'Most appropriate as a second-stage control for dangerous tools.',
      'Can generate analyst fatigue if enabled for routine low-risk operations.',
      'Use with allowlists and schema validation rather than as a standalone defense.',
    ],
  },
};

function latencyTone(latency: PolicyReference['latency']) {
  if (latency === 'low') return 'healthy' as const;
  if (latency === 'medium') return 'configured' as const;
  return 'attention' as const;
}

export function ReferencesPage({ controlPlane }: ReferencesPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Operator reference</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Security policy guidance</h1>
            <p className="mt-3 max-w-3xl text-gray-300">
              Use this screen to compare guardrails by intended use, operational tradeoffs, and
              latency cost before assigning them to workloads.
            </p>
          </div>
          <StatusBadge
            label={`${controlPlane.policies.length} policies`}
            tone="configured"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {controlPlane.policies.map((policy) => {
          const reference = POLICY_REFERENCES[policy.id];
          return (
            <article
              key={policy.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_70px_-50px_rgba(34,197,94,0.6)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{policy.category}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{policy.name}</h2>
                  <p className="mt-3 text-sm text-gray-300">{policy.description}</p>
                </div>
                <StatusBadge
                  label={reference ? `${reference.latency} latency` : 'reference pending'}
                  tone={reference ? latencyTone(reference.latency) : 'attention'}
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sky-200">
                    <BookOpen className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.2em]">Best use</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-200">
                    {reference?.bestFor ?? 'Detailed operator guidance has not been authored yet.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-amber-200">
                    <ShieldAlert className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.2em]">Avoid when</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-200">
                    {reference?.avoidWhen ?? 'Review workload-specific constraints before enabling.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <Clock3 className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.2em]">Operational cost</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-200">
                    {reference?.summary ?? 'Reference content is not available for this policy yet.'}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2 text-violet-200">
                  <Zap className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.2em]">Deployment notes</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {policy.level.map((level) => (
                    <span
                      key={level}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300"
                    >
                      {level}
                    </span>
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-300">
                  {(reference?.notes ?? ['Reference notes will appear here once documented.']).map(
                    (note) => (
                      <li key={note}>{note}</li>
                    )
                  )}
                </ul>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
