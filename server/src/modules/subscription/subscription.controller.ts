import { Request, Response } from 'express';
import { Subscription, ISubscription } from './subscription.model';
import { Plan } from '../plan/plan.model';
import { serializeSubscription } from './subscription.serializer';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../middlewares/errorHandler';
import { getRazorpayClient } from '../../shared/utils/razorpay';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

// Razorpay subscriptions require a finite `total_count` of billing cycles —
// there's no built-in "forever" option. We use a long-but-finite horizon so
// it behaves like an ongoing subscription in practice; it renews on its own
// up to this count, well past any realistic customer lifetime.
const TOTAL_COUNT_BY_CYCLE: Record<'monthly' | 'yearly', number> = {
  monthly: 120, // 10 years of monthly cycles
  yearly: 10, // 10 years of yearly cycles
};

// Plan switches use a "no proration" policy: the old Razorpay subscription
// (if any) is cancelled immediately — not at cycle end — and the new one
// starts fresh. The org does not get credited for unused time on the old
// plan. This is a deliberate simplification (real proration means tracking
// partial-period credits, which Razorpay's Subscriptions API doesn't do
// for you) rather than an oversight — flagged here and in the README.
//
// Best-effort: if Razorpay's cancel call fails (e.g. it's already cancelled
// on their side), we log it and proceed with the local switch anyway. The
// org explicitly asked to change plans; a Razorpay-side error shouldn't
// trap them on their old plan.
async function cancelOldRazorpaySubscription(subscription: ISubscription | null) {
  if (!subscription?.razorpaySubscriptionId) return;
  try {
    const razorpay = getRazorpayClient();
    await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, false);
  } catch (err) {
    logger.warn(
      { err, razorpaySubscriptionId: subscription.razorpaySubscriptionId },
      'Failed to cancel previous Razorpay subscription during a plan switch — proceeding with the local switch anyway'
    );
  }
}

export const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;

  const subscription = await Subscription.findOne({ organizationId });
  if (!subscription) {
    throw new AppError('No subscription found for this organization', 404);
  }

  const plan = await Plan.findById(subscription.planId);
  res.status(200).json({ subscription: serializeSubscription(subscription, plan) });
});

export const checkout = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId!;
  const { planId } = req.body;

  const plan = await Plan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  const existing = await Subscription.findOne({ organizationId });

  // Idempotency guard: re-clicking "subscribe" on the plan you already have
  // (active or mid-trial) shouldn't cancel and recreate a perfectly good
  // Razorpay subscription. Just hand back what already exists.
  if (
    existing &&
    existing.planId.toString() === plan._id.toString() &&
    (existing.status === 'active' || existing.status === 'trialing')
  ) {
    res.status(200).json({ subscription: serializeSubscription(existing, plan) });
    return;
  }

  // --- Free plan: no Razorpay involved, activate immediately ---
  if (plan.price === 0) {
    await cancelOldRazorpaySubscription(existing);

    const subscription = await Subscription.findOneAndUpdate(
      { organizationId },
      {
        organizationId,
        planId: plan._id,
        status: 'active',
        cancelAtPeriodEnd: false,
        $unset: { razorpaySubscriptionId: '', currentPeriodEnd: '', trialEndsAt: '' },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.status(200).json({ subscription: serializeSubscription(subscription!, plan) });
    return;
  }

  // --- Paid plan: open a Razorpay subscription, activation happens via webhook ---
  if (!plan.razorpayPlanId) {
    throw new AppError('This plan is not yet linked to a Razorpay plan ID', 500);
  }

  // Switching FROM a different paid plan — no proration, see the comment on
  // cancelOldRazorpaySubscription. Switching from Free (no razorpaySubscriptionId)
  // is a no-op here, same as a first-time paid checkout.
  await cancelOldRazorpaySubscription(existing);

  const trialDays = plan.trialDays ?? 0;
  const startAt =
    trialDays > 0 ? Math.floor(Date.now() / 1000) + trialDays * 24 * 60 * 60 : undefined;

  const razorpay = getRazorpayClient();
  const razorpaySubscription = await razorpay.subscriptions.create({
    plan_id: plan.razorpayPlanId,
    customer_notify: 1,
    total_count: TOTAL_COUNT_BY_CYCLE[plan.billingCycle],
    notes: { organizationId: organizationId.toString(), planId: plan._id.toString() },
    ...(startAt ? { start_at: startAt } : {}),
  });

  const subscriptionUpdate: Record<string, unknown> = {
    organizationId,
    planId: plan._id,
    status: trialDays > 0 ? 'trialing' : 'created',
    razorpaySubscriptionId: razorpaySubscription.id,
    cancelAtPeriodEnd: false,
  };
  const unsetFields: Record<string, ''> = { currentPeriodEnd: '' };
  if (startAt) {
    subscriptionUpdate.trialEndsAt = new Date(startAt * 1000);
  } else {
    unsetFields.trialEndsAt = '';
  }

  const subscription = await Subscription.findOneAndUpdate(
    { organizationId },
    { ...subscriptionUpdate, $unset: unsetFields },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // Frontend uses razorpaySubscriptionId + keyId to open Razorpay Checkout
  // in subscription mode. Do NOT trust a success callback from that widget
  // to mean the subscription is active — only the webhook does that.
  // (Note: Razorpay still requires card authorization up front even with a
  // delayed start_at, so the checkout widget flow is identical either way —
  // only the first *charge* is delayed, not the checkout itself.)
  res.status(201).json({
    subscription: serializeSubscription(subscription!, plan),
    razorpay: {
      subscriptionId: razorpaySubscription.id,
      keyId: env.razorpay.keyId,
    },
  });
});

export const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;

  const subscription = await Subscription.findOne({ organizationId });
  if (!subscription) {
    throw new AppError('No subscription found for this organization', 404);
  }
  if (subscription.status === 'cancelled') {
    throw new AppError('Subscription is already cancelled', 409);
  }

  if (!subscription.razorpaySubscriptionId) {
    // Free plan — nothing billed, nothing to grace-period out.
    throw new AppError('The free plan cannot be cancelled — switch plans instead', 400);
  }

  const razorpay = getRazorpayClient();
  await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, true);
  // cancel_at_cycle_end: true — customer keeps access through what they already paid for.
  // status flips to 'cancelled' when the subscription.cancelled webhook lands.

  subscription.cancelAtPeriodEnd = true;
  await subscription.save();

  const plan = await Plan.findById(subscription.planId);
  res.status(200).json({ subscription: serializeSubscription(subscription, plan) });
});
