import { ISubscription } from './subscription.model';
import { IPlan } from '../plan/plan.model';
import { serializePlan } from '../plan/plan.serializer';

// `plan` is optional so callers that haven't populated it yet still get a
// valid (if plan-less) response shape rather than a crash.
export function serializeSubscription(subscription: ISubscription, plan?: IPlan | null) {
  return {
    id: subscription._id.toString(),
    organizationId: subscription.organizationId.toString(),
    planId: subscription.planId.toString(),
    plan: plan ? serializePlan(plan) : null,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    trialEndsAt: subscription.trialEndsAt ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}
