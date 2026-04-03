import { useMemo, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { ChevronDown, Search, ShieldPlus, SlidersHorizontal } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { deleteWorkloadPolicy, saveWorkloadPolicy } from '../services/api';
import type { ControlPlaneState } from '../hooks/useControlPlane';
import type { User, WorkloadConfig } from '../types/api';

interface PoliciesPageProps {
  auth: {
    user: User | null;
    isAdmin: boolean;
  };
  controlPlane: ControlPlaneState;
}

const CATEGORY_OPTIONS = ['input', 'output', 'tools'] as const;
const LEVEL_OPTIONS = ['L1', 'L2', 'L3'] as const;

export function PoliciesPage({ auth, controlPlane }: PoliciesPageProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [editorId, setEditorId] = useState('');
  const [routeMatches, setRouteMatches] = useState('');
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [editorLevel, setEditorLevel] = useState('L1');
  const [editorPolicies, setEditorPolicies] = useState<string[]>([
    'heuristic_prompt_injection',
    'secret_redaction',
  ]);
  const [requireUserId, setRequireUserId] = useState(false);
  const [requireSessionId, setRequireSessionId] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return controlPlane.policies.filter((policy) => {
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(policy.category);
      const matchesLevel =
        selectedLevels.length === 0 ||
        selectedLevels.some((level) => policy.level.includes(level));
      const haystack = `${policy.name} ${policy.description}`.toLowerCase();
      const matchesSearch = query.length === 0 || haystack.includes(query);

      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [controlPlane.policies, search, selectedCategories, selectedLevels]);

  function toggleValue(value: string, current: string[], setValue: (values: string[]) => void) {
    setValue(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedLevels.length > 0 ||
    search.trim().length > 0;

  const allLlmBackends = useMemo(
    () => Object.keys(controlPlane.effectiveConfig?.platform.llm_backends ?? {}),
    [controlPlane.effectiveConfig]
  );
  const allAllowedModels = useMemo(() => {
    return [
      ...new Set(
        Object.values(controlPlane.effectiveConfig?.platform.llm_backends ?? {}).flatMap(
          (backend) => backend.models ?? []
        )
      ),
    ];
  }, [controlPlane.effectiveConfig]);
  const allMcpBackends = useMemo(
    () => Object.keys(controlPlane.effectiveConfig?.platform.mcp_backends ?? {}),
    [controlPlane.effectiveConfig]
  );
  const allTools = useMemo(
    () => Object.keys(controlPlane.effectiveConfig?.toolSchemas ?? {}),
    [controlPlane.effectiveConfig]
  );

  function resetEditor() {
    setEditorId('');
    setRouteMatches('');
    setHeaderKey('');
    setHeaderValue('');
    setEditorLevel('L1');
    setEditorPolicies(['heuristic_prompt_injection', 'secret_redaction']);
    setRequireUserId(false);
    setRequireSessionId(false);
  }

  function loadWorkloadIntoEditor(workload: WorkloadConfig) {
    setEditorId(workload.id);
    setRouteMatches(workload.match.routes?.join('\n') ?? '');
    const firstHeader = Object.entries(workload.match.headers ?? {})[0];
    setHeaderKey(firstHeader?.[0] ?? '');
    setHeaderValue(firstHeader?.[1] ?? '');
    setEditorLevel(workload.policy.level);
    setRequireUserId(workload.policy.require_user_id ?? false);
    setRequireSessionId(workload.policy.require_session_id ?? false);

    const nextPolicies = [
      ...Object.entries(workload.guards?.input ?? {})
        .filter(([, enabled]) => enabled)
        .map(([policyId]) => policyId),
      ...Object.entries(workload.guards?.output ?? {})
        .filter(([, enabled]) => enabled)
        .map(([policyId]) => policyId),
      ...Object.entries(workload.guards?.tools ?? {})
        .filter(([, enabled]) => enabled)
        .map(([policyId]) => policyId),
    ];
    setEditorPolicies(nextPolicies);
    setEditorMessage(`Loaded ${workload.id} into the editor.`);
  }

  async function handleSavePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = editorId.trim();
    const routes = routeMatches
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
    const headerName = headerKey.trim().toLowerCase();
    const headerVal = headerValue.trim();

    if (!id) {
      setEditorMessage('Workload ID is required.');
      return;
    }
    if (routes.length === 0 && (!headerName || !headerVal)) {
      setEditorMessage('Add at least one route path or one request header match.');
      return;
    }

    const inputPolicies = controlPlane.policies
      .filter((policy) => policy.category === 'input')
      .reduce<Record<string, boolean>>((acc, policy) => {
        acc[policy.id] = editorPolicies.includes(policy.id);
        return acc;
      }, {});
    const outputPolicies = controlPlane.policies
      .filter((policy) => policy.category === 'output')
      .reduce<Record<string, boolean>>((acc, policy) => {
        acc[policy.id] = editorPolicies.includes(policy.id);
        return acc;
      }, {});
    const toolPolicies = controlPlane.policies
      .filter((policy) => policy.category === 'tools')
      .reduce<Record<string, boolean>>((acc, policy) => {
        acc[policy.id] = editorPolicies.includes(policy.id);
        return acc;
      }, {});

    setSaving(true);
    setEditorMessage(null);
    try {
      const result = await saveWorkloadPolicy({
        id,
        match: {
          ...(routes.length > 0 ? { routes } : {}),
          ...(headerName && headerVal ? { headers: { [headerName]: headerVal } } : {}),
        },
        policy: {
          level: editorLevel,
          data_classification: 'D0',
          allowed_llm_backends: allLlmBackends,
          allowed_models: allAllowedModels,
          allowed_mcp_backends: allMcpBackends,
          allowed_tools: allTools,
          require_user_id: requireUserId,
          require_session_id: requireSessionId,
        },
        guards: {
          input: inputPolicies,
          output: outputPolicies,
          tools: toolPolicies,
        },
        actions: {
          on_block: {
            http_status: 403,
            message: 'Request blocked by RocketWatchDog policy.',
          },
        },
      });
      setEditorMessage(`Saved ${result.workloadId} and reloaded config.`);
      await controlPlane.refresh();
      resetEditor();
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : 'Failed to save workload policy.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePolicy(workloadId: string) {
    const confirmed = window.confirm(`Remove workload policy "${workloadId}"?`);
    if (!confirmed) {
      return;
    }

    setEditorMessage(null);
    try {
      await deleteWorkloadPolicy(workloadId);
      if (editorId === workloadId) {
        resetEditor();
      }
      setEditorMessage(`Removed ${workloadId} and reloaded config.`);
      await controlPlane.refresh();
    } catch (error) {
      setEditorMessage(
        error instanceof Error ? error.message : 'Failed to remove workload policy.'
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Policy matrix</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Guardrails by workload and category</h1>
        <p className="mt-3 max-w-3xl text-gray-300">
          These cards merge static policy knowledge with the active backend config snapshot so you
          can see which protections are enabled and where the strictest workloads sit.
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-sky-200" />
            <h2 className="text-xl font-semibold text-white">Filter policies</h2>
          </div>
          <ChevronDown
            className={clsx('h-5 w-5 text-gray-400 transition', filtersOpen && 'rotate-180')}
          />
        </button>

        {filtersOpen ? (
          <div className="mt-5 space-y-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name and description"
              className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-sky-400/40"
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Category</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    toggleValue(category, selectedCategories, setSelectedCategories)
                  }
                  className={clsx(
                    'rounded-full px-3 py-2 text-xs uppercase tracking-[0.2em] transition',
                    selectedCategories.includes(category)
                      ? 'bg-sky-400 text-slate-950'
                      : 'border border-white/10 bg-black/20 text-gray-300 hover:bg-white/10'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Level</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LEVEL_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleValue(level, selectedLevels, setSelectedLevels)}
                  className={clsx(
                    'rounded-full px-3 py-2 text-xs uppercase tracking-[0.2em] transition',
                    selectedLevels.includes(level)
                      ? 'bg-emerald-400 text-slate-950'
                      : 'border border-white/10 bg-black/20 text-gray-300 hover:bg-white/10'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-sm text-gray-300">
              Showing <span className="font-semibold text-white">{filteredPolicies.length}</span>{' '}
              of <span className="font-semibold text-white">{controlPlane.policies.length}</span>{' '}
              policies
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategories([]);
                setSelectedLevels([]);
                setSearch('');
              }}
              disabled={!hasFilters}
              className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-gray-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span>Collapsed to save space.</span>
            <span>
              {hasFilters
                ? `${filteredPolicies.length} filtered result(s) active`
                : 'No active filters'}
            </span>
          </div>
        )}
      </section>

      {auth.isAdmin ? (
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <ShieldPlus className="h-5 w-5 text-emerald-200" />
            <h2 className="text-xl font-semibold text-white">Assign policies to route/header matches</h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-gray-300">
            Create or update a workload config that applies selected security policies to one or
            more URL paths and/or a request header match. The backend resolves workloads by route
            and header; this editor writes a workload YAML and triggers a config reload.
          </p>
          <form className="mt-5 space-y-5" onSubmit={(event) => void handleSavePolicy(event)}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-400">Workload ID</span>
                <input
                  value={editorId}
                  onChange={(event) => setEditorId(event.target.value)}
                  placeholder="route-policy"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-400">Level</span>
                <select
                  value={editorLevel}
                  onChange={(event) => setEditorLevel(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40"
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level} className="bg-slate-900">
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-400">Route paths</span>
                <textarea
                  value={routeMatches}
                  onChange={(event) => setRouteMatches(event.target.value)}
                  placeholder={'/v1/proxy/llm\n/v1/chat/completions'}
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40"
                />
              </label>
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-400">Header name</span>
                  <input
                    value={headerKey}
                    onChange={(event) => setHeaderKey(event.target.value)}
                    placeholder="x-rwd-workload"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-400">Header value</span>
                  <input
                    value={headerValue}
                    onChange={(event) => setHeaderValue(event.target.value)}
                    placeholder="public-chat"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40"
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Policies to enable</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {controlPlane.policies.map((policy) => (
                  <button
                    key={policy.id}
                    type="button"
                    onClick={() =>
                      toggleValue(policy.id, editorPolicies, setEditorPolicies)
                    }
                    className={clsx(
                      'rounded-full px-3 py-2 text-xs uppercase tracking-[0.15em] transition',
                      editorPolicies.includes(policy.id)
                        ? 'bg-sky-400 text-slate-950'
                        : 'border border-white/10 bg-black/20 text-gray-300 hover:bg-white/10'
                    )}
                  >
                    {policy.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={requireUserId}
                  onChange={(event) => setRequireUserId(event.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-black/20"
                />
                Require user ID
              </label>
              <label className="inline-flex items-center gap-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={requireSessionId}
                  onChange={(event) => setRequireSessionId(event.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-black/20"
                />
                Require session ID
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-sm text-gray-300">
                New workloads default to all configured backends/models so the rule can be matched
                immediately after reload.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetEditor();
                    setEditorMessage('Editor cleared.');
                  }}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
                >
                  Clear editor
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editorId ? 'Save workload policy' : 'Create workload policy'}
                </button>
              </div>
            </div>

            {editorMessage ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                {editorMessage}
              </div>
            ) : null}
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPolicies.map((policy) => (
          <div
            key={policy.id}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_70px_-50px_rgba(56,189,248,0.7)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{policy.category}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{policy.name}</h2>
              </div>
              <StatusBadge
                label={policy.workloadsEnabled !== undefined ? `${policy.workloadsEnabled}/${policy.totalWorkloads}` : 'catalog'}
                tone="configured"
              />
            </div>
            <p className="mt-4 text-sm text-gray-300">{policy.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {policy.level.map((level) => (
                <span
                  key={level}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300"
                >
                  {level}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filteredPolicies.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-gray-400 md:col-span-2 xl:col-span-3">
            No policies match the current filters.
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
        <h2 className="text-2xl font-semibold text-white">Workload policy inventory</h2>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {controlPlane.effectiveConfig?.workloads.map((workload) => (
            <div key={workload.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{workload.id}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Level {workload.policy.level} · Classification{' '}
                    {workload.policy.data_classification ?? 'n/a'}
                  </p>
                </div>
                <StatusBadge
                  label={
                    workload.policy.require_user_id || workload.policy.require_session_id
                      ? 'identity required'
                      : 'open session'
                  }
                  tone={
                    workload.policy.require_user_id || workload.policy.require_session_id
                      ? 'attention'
                      : 'healthy'
                  }
                />
              </div>
              {auth.isAdmin ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => loadWorkloadIntoEditor(workload)}
                    className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:bg-white/10"
                  >
                    Edit rules
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeletePolicy(workload.id)}
                    className="rounded-2xl border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 text-sm text-gray-300 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Routing rules</p>
                  <div className="mt-2 space-y-2 text-white">
                    <p>
                      <span className="text-gray-400">Routes:</span>{' '}
                      {workload.match.routes?.join(', ') || 'none'}
                    </p>
                    <p>
                      <span className="text-gray-400">Headers:</span>{' '}
                      {workload.match.headers
                        ? Object.entries(workload.match.headers)
                            .map(([key, value]) => `${key}=${value}`)
                            .join(', ')
                        : 'none'}
                    </p>
                    <p>
                      <span className="text-gray-400">Metadata:</span>{' '}
                      {workload.match.metadata
                        ? Object.entries(workload.match.metadata)
                            .map(([key, value]) => `${key}=${value}`)
                            .join(', ')
                        : 'none'}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Allowed LLM backends</p>
                  <p className="mt-2 text-white">
                    {workload.policy.allowed_llm_backends?.join(', ') || 'none'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Allowed MCP backends</p>
                  <p className="mt-2 text-white">
                    {workload.policy.allowed_mcp_backends?.join(', ') || 'none'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Allowed tools</p>
                  <p className="mt-2 text-white">
                    {workload.policy.allowed_tools?.join(', ') || 'none'}
                  </p>
                </div>
              </div>
            </div>
          )) ?? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-gray-400">
              Effective config is not available from the backend. Check auth mode or the platform config.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
