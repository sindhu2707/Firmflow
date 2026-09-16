import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { usePlans, useSubscription, useCheckout } from '@/hooks/useBilling';
import { useAuthStore } from '@/store/authStore';
import { PlanCard } from '@/components/billing/PlanCard';
import { Button } from '@/components/ui/Button';
import type { BillingCycle } from '@/types';

export function PricingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'org_owner';

  const { data: plansData, isLoading: plansLoading, isError: plansError } = usePlans();
  const { data: subData, isLoading: subLoading } = useSubscription();
  const checkout = useCheckout();
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const currentPlanId = subData?.subscription.planId;

  const visiblePlans = useMemo(() => {
    if (!plansData) return [];
    const free = plansData.plans.find((p) => p.price === 0);
    const paid = plansData.plans
      .filter((p) => p.price > 0 && p.billingCycle === cycle)
      .sort((a, b) => a.price - b.price);
    return free ? [free, ...paid] : paid;
  }, [plansData, cycle]);

  const handleSelect = (planId: string) => {
    setPendingPlanId(planId);
    checkout.mutate(
      { planId },
      {
        onSettled: () => setPendingPlanId(null),
      },
    );
  };

  const isLoading = plansLoading || subLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing')} className="mb-4 -ml-2">
          <ArrowLeft size={16} />
          Back to billing
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Plans &amp; pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the plan that fits your organization. You can switch anytime.
        </p>
      </div>

      <div className="inline-flex w-fit items-center rounded-md border border-border bg-muted p-1">
        {(['monthly', 'yearly'] as BillingCycle[]).map((option) => (
          <button
            key={option}
            onClick={() => setCycle(option)}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              cycle === option
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : plansError || !plansData ? (
        <p className="text-sm text-destructive">Could not load plans.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              canManage={!!canManage}
              isSubmitting={checkout.isPending && pendingPlanId === plan.id}
              onSelect={() => handleSelect(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
