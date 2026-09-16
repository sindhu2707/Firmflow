import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/format';
import type { Plan } from '@/types';

const FEATURE_LABELS: Record<keyof Plan['features'], string> = {
  reports: 'Reports',
  analytics: 'Analytics',
  customBranding: 'Custom branding',
  apiAccess: 'API access',
  auditLogs: 'Audit logs',
  prioritySupport: 'Priority support',
};

function limitLabel(value: number, unit: string): string {
  return value === -1 ? `Unlimited ${unit}` : `Up to ${value} ${unit}`;
}

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  canManage: boolean;
  isSubmitting: boolean;
  onSelect: () => void;
}

export function PlanCard({ plan, isCurrent, canManage, isSubmitting, onSelect }: PlanCardProps) {
  const isFree = plan.price === 0;
  const includedFeatures = (Object.keys(FEATURE_LABELS) as Array<keyof Plan['features']>).filter(
    (key) => plan.features[key],
  );

  return (
    <Card
      className={`relative flex flex-col p-6 ${
        isCurrent ? 'ring-2 ring-primary' : ''
      }`}
    >
      {isCurrent && (
        <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
          Current plan
        </span>
      )}

      <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">
          {isFree ? 'Free' : formatMoney(plan.price, plan.currency)}
        </span>
        {!isFree && (
          <span className="text-sm text-muted-foreground">
            /{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}
          </span>
        )}
      </div>

      {plan.trialDays > 0 && (
        <p className="mt-1 text-xs font-medium text-sky-600 dark:text-sky-400">
          {plan.trialDays}-day free trial
        </p>
      )}

      <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
        <li>{limitLabel(plan.limits.products, 'products')}</li>
        <li>{limitLabel(plan.limits.employees, 'employees')}</li>
        {includedFeatures.map((key) => (
          <li key={key} className="flex items-center gap-2">
            <Check size={14} className="shrink-0 text-emerald-500" />
            {FEATURE_LABELS[key]}
          </li>
        ))}
      </ul>

      <Button
        className="mt-6"
        variant={isCurrent ? 'secondary' : 'primary'}
        disabled={isCurrent || !canManage}
        isLoading={isSubmitting}
        onClick={onSelect}
      >
        {isCurrent ? 'Current plan' : isFree ? 'Switch to Free' : 'Choose plan'}
      </Button>

      {!canManage && !isCurrent && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Only the org owner can change plans
        </p>
      )}
    </Card>
  );
}
