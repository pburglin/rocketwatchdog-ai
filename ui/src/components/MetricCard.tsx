interface MetricCardProps {
  label: string;
  value: string | number;
  helper: string;
}

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_-48px_rgba(56,189,248,0.7)]">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-400">{helper}</p>
    </div>
  );
}
