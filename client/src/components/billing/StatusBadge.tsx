import type { SubscriptionStatus } from '@/types';

const STYLES: Record<SubscriptionStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  trialing: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  past_due: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  cancelled: 'bg-muted text-muted-foreground ring-border',
  created: 'bg-muted text-muted-foreground ring-border',
};

const LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  created: 'Pending',
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
