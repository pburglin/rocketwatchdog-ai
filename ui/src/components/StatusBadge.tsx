import clsx from 'clsx';

type BadgeTone = 'healthy' | 'attention' | 'configured' | 'neutral';

const tones: Record<BadgeTone, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
  attention: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/20',
  configured: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/20',
  neutral: 'bg-gray-800 text-gray-300 ring-1 ring-gray-700',
};

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em]',
        tones[tone]
      )}
    >
      {label}
    </span>
  );
}
