import { IPlan } from './plan.model';

// Public shape — deliberately omits razorpayPlanId so the raw gateway plan ID
// (which is only ever needed server-side, to open Razorpay Checkout) never
// reaches the browser via a GET /plans response.
export function serializePlan(plan: IPlan) {
  return {
    id: plan._id.toString(),
    name: plan.name,
    slug: plan.slug,
    billingCycle: plan.billingCycle,
    price: plan.price,
    currency: plan.currency,
    limits: plan.limits,
    features: plan.features,
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

// Super-admin only view — includes the Razorpay plan linkage for management screens.
export function serializePlanAdmin(plan: IPlan) {
  return {
    ...serializePlan(plan),
    razorpayPlanId: plan.razorpayPlanId ?? null,
  };
}
