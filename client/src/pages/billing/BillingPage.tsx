import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Receipt, Download } from 'lucide-react';
import { useSubscription, useInvoices, useCancelSubscription } from '@/hooks/useBilling';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/billing/StatusBadge';
import { formatMoney, formatDate } from '@/lib/format';

export function BillingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'org_owner';

  const { data: subData, isLoading: subLoading, isError: subError } = useSubscription();
  const { data: invoiceData, isLoading: invoicesLoading } = useInvoices();
  const cancelSubscription = useCancelSubscription();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (subLoading) {
    return <p className="text-sm text-muted-foreground">Loading billing details…</p>;
  }

  if (subError || !subData) {
    return <p className="text-sm text-destructive">Could not load your subscription.</p>;
  }

  const { subscription } = subData;
  const plan = subscription.plan;
  const isFree = !plan || plan.price === 0;
  const canCancel =
    canManage &&
    !isFree &&
    !subscription.cancelAtPeriodEnd &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  const handleCancel = () => {
    cancelSubscription.mutate(undefined, {
      onSuccess: () => setConfirmingCancel(false),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        {canManage && (
          <Button variant="outline" onClick={() => navigate('/billing/plans')}>
            Change plan
          </Button>
        )}
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{plan?.name ?? 'No plan'}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFree
                ? 'Free plan'
                : `${formatMoney(plan!.price, plan!.currency)} / ${plan!.billingCycle === 'monthly' ? 'month' : 'year'}`}
            </p>
          </div>
          <StatusBadge status={subscription.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {subscription.status === 'trialing' && subscription.trialEndsAt && (
            <p className="text-sm text-muted-foreground">
              Trial ends on <span className="font-medium text-foreground">{formatDate(subscription.trialEndsAt)}</span>
            </p>
          )}

          {subscription.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancelAtPeriodEnd ? 'Access ends on' : 'Renews on'}{' '}
              <span className="font-medium text-foreground">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </p>
          )}

          {subscription.cancelAtPeriodEnd && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
              This plan is cancelled and won&apos;t renew. You&apos;ll keep access until the date above.
            </p>
          )}

          {subscription.status === 'past_due' && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
              Your last payment didn&apos;t go through. Update your payment details to avoid losing access.
            </p>
          )}

          {canCancel && (
            <div className="mt-2">
              {confirmingCancel ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Cancel at the end of this billing period?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    isLoading={cancelSubscription.isPending}
                  >
                    Confirm
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingCancel(false)}>
                    Back
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmingCancel(true)}>
                  Cancel plan
                </Button>
              )}
            </div>
          )}

          {!canManage && (
            <p className="text-xs text-muted-foreground">
              Only the org owner can change or cancel the subscription.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Invoices</h2>

        {invoicesLoading ? (
          <p className="text-sm text-muted-foreground">Loading invoices…</p>
        ) : !invoiceData || invoiceData.invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <Receipt size={20} className="text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground">
              Invoices appear here after your first successful payment.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoiceData.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatMoney(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          invoice.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400'
                            : invoice.status === 'failed'
                              ? 'bg-destructive/10 text-destructive ring-destructive/20'
                              : 'bg-muted text-muted-foreground ring-border'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Download size={14} />
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
