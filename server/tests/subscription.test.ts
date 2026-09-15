// Razorpay keys are set in vitest.config.mts's `env` block (not here) —
// ES module imports are hoisted above any plain statements in this file,
// so setting process.env here would run AFTER `app` (and therefore
// config/env.ts) had already been imported and evaluated. Too late.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';

const mockSubscriptionsCreate = vi.fn();
const mockSubscriptionsCancel = vi.fn();

// The real SDK would call out to api.razorpay.com, which isn't reachable
// (or wanted) in tests — mock the constructor so getRazorpayClient() gets
// an object with the two methods our controller actually calls.
vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      subscriptions: {
        create: mockSubscriptionsCreate,
        cancel: mockSubscriptionsCancel,
      },
    };
  }),
}));

import app from '../src/app';
import { Plan } from '../src/modules/plan/plan.model';
import { Subscription } from '../src/modules/subscription/subscription.model';
import { makeToken, makeOrgAndUsers } from './helpers';

const freePlanBody = {
  name: 'Free',
  slug: 'free',
  billingCycle: 'monthly' as const,
  price: 0,
  currency: 'INR',
  limits: { firms: 1, products: 20, employees: 2 },
};

const paidPlanBody = {
  name: 'Starter',
  slug: 'starter',
  billingCycle: 'monthly' as const,
  price: 99900,
  currency: 'INR',
  limits: { firms: 3, products: 500, employees: 10 },
  razorpayPlanId: 'plan_fake_starter_monthly',
};

describe('Subscription API', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;
  let ownerToken: string;
  let employeeToken: string;

  beforeEach(() => {
    ctx = makeOrgAndUsers();
    ownerToken = makeToken(ctx.owner);
    employeeToken = makeToken(ctx.employee);
    mockSubscriptionsCreate.mockReset();
    mockSubscriptionsCancel.mockReset();
  });

  it('returns 404 when the organization has no subscription yet', async () => {
    const res = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });

  it('activates the free plan immediately, with no Razorpay call', async () => {
    const freePlan = await Plan.create(freePlanBody);

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: freePlan._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('active');
    expect(res.body.subscription.plan.slug).toBe('free');
    expect(mockSubscriptionsCreate).not.toHaveBeenCalled();
  });

  it('rejects checkout from a non-owner (employee)', async () => {
    const freePlan = await Plan.create(freePlanBody);

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ planId: freePlan._id.toString() });

    expect(res.status).toBe(403);
  });

  it('opens a Razorpay subscription for a paid plan and leaves status as "created"', async () => {
    const paidPlan = await Plan.create(paidPlanBody);
    mockSubscriptionsCreate.mockResolvedValue({ id: 'sub_fake_123', status: 'created' });

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: paidPlan._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.subscription.status).toBe('created');
    expect(res.body.razorpay.subscriptionId).toBe('sub_fake_123');
    expect(mockSubscriptionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ plan_id: 'plan_fake_starter_monthly', total_count: 120 })
    );
  });

  it('rejects checkout for a paid plan with no razorpayPlanId set', async () => {
    const paidPlan = await Plan.create({ ...paidPlanBody, razorpayPlanId: undefined });

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: paidPlan._id.toString() });

    expect(res.status).toBe(500);
    expect(mockSubscriptionsCreate).not.toHaveBeenCalled();
  });

  it('replaces an existing subscription doc rather than creating a second one', async () => {
    const freePlan = await Plan.create(freePlanBody);
    const paidPlan = await Plan.create(paidPlanBody);
    mockSubscriptionsCreate.mockResolvedValue({ id: 'sub_fake_456', status: 'created' });

    await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: freePlan._id.toString() });

    await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: paidPlan._id.toString() });

    const docs = await Subscription.find({ organizationId: ctx.organizationId });
    expect(docs).toHaveLength(1);
    expect(docs[0].planId.toString()).toBe(paidPlan._id.toString());
  });

  it('cannot cancel the free plan', async () => {
    const freePlan = await Plan.create(freePlanBody);
    await Subscription.create({
      organizationId: ctx.organizationId,
      planId: freePlan._id,
      status: 'active',
    });

    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
  });

  it('cancels a paid subscription at cycle end, keeping access until then', async () => {
    const paidPlan = await Plan.create(paidPlanBody);
    await Subscription.create({
      organizationId: ctx.organizationId,
      planId: paidPlan._id,
      status: 'active',
      razorpaySubscriptionId: 'sub_fake_789',
    });
    mockSubscriptionsCancel.mockResolvedValue({ id: 'sub_fake_789', status: 'active' });

    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription.cancelAtPeriodEnd).toBe(true);
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_fake_789', true);

    // status itself only flips to 'cancelled' once the webhook lands, not here
    expect(res.body.subscription.status).toBe('active');
  });

  it('rejects cancel from a non-owner (employee)', async () => {
    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('a brand-new organization gets an active Free subscription automatically', async () => {
    await Plan.create(freePlanBody);

    const signupToken = makeToken({
      userId: new Types.ObjectId().toString(),
      role: 'customer',
    });

    // organization creation requires a user document to exist and be updatable —
    // this mirrors how the organizations module itself is tested elsewhere.
    const { User } = await import('../src/modules/users/user.model');
    const jwt = (await import('jsonwebtoken')).default;
    const decoded = jwt.decode(signupToken) as { userId: string };
    await User.create({
      _id: decoded.userId,
      name: 'New Owner',
      email: `${decoded.userId}@example.com`,
      password: 'hashedpw',
      role: 'customer',
    });

    const orgRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${signupToken}`)
      .send({ name: 'Brand New Co' });

    expect(orgRes.status).toBe(201);

    const sub = await Subscription.findOne({ organizationId: orgRes.body.data.organization.id });
    expect(sub).not.toBeNull();
    expect(sub?.status).toBe('active');
  });

  it('is idempotent: re-checking-out the plan you already have does not touch Razorpay', async () => {
    const freePlan = await Plan.create(freePlanBody);
    await Subscription.create({ organizationId: ctx.organizationId, planId: freePlan._id, status: 'active' });

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: freePlan._id.toString() });

    expect(res.status).toBe(200);
    expect(mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
  });

  it('cancels the previous Razorpay subscription immediately when switching paid → free (no proration)', async () => {
    const freePlan = await Plan.create(freePlanBody);
    const paidPlan = await Plan.create(paidPlanBody);
    await Subscription.create({
      organizationId: ctx.organizationId,
      planId: paidPlan._id,
      status: 'active',
      razorpaySubscriptionId: 'sub_old_paid',
    });
    mockSubscriptionsCancel.mockResolvedValue({ id: 'sub_old_paid', status: 'cancelled' });

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: freePlan._id.toString() });

    expect(res.status).toBe(200);
    // `false` = cancelled immediately, not at cycle end — no proration means
    // no reason to let a subscription for a plan you've already left keep running.
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_old_paid', false);

    const sub = await Subscription.findOne({ organizationId: ctx.organizationId });
    expect(sub?.razorpaySubscriptionId).toBeUndefined();
  });

  it('cancels the previous Razorpay subscription immediately when switching between two paid plans', async () => {
    const oldPlan = await Plan.create(paidPlanBody);
    const newPlan = await Plan.create({
      ...paidPlanBody,
      slug: 'business',
      razorpayPlanId: 'plan_fake_business_monthly',
    });
    await Subscription.create({
      organizationId: ctx.organizationId,
      planId: oldPlan._id,
      status: 'active',
      razorpaySubscriptionId: 'sub_old_starter',
    });
    mockSubscriptionsCancel.mockResolvedValue({ id: 'sub_old_starter', status: 'cancelled' });
    mockSubscriptionsCreate.mockResolvedValue({ id: 'sub_new_business', status: 'created' });

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: newPlan._id.toString() });

    expect(res.status).toBe(201);
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_old_starter', false);
    expect(mockSubscriptionsCreate).toHaveBeenCalled();

    const sub = await Subscription.findOne({ organizationId: ctx.organizationId });
    expect(sub?.razorpaySubscriptionId).toBe('sub_new_business');
    expect(sub?.planId.toString()).toBe(newPlan._id.toString());
  });

  it('does not fail checkout just because the previous Razorpay cancel call errors', async () => {
    const freePlan = await Plan.create(freePlanBody);
    const paidPlan = await Plan.create(paidPlanBody);
    await Subscription.create({
      organizationId: ctx.organizationId,
      planId: paidPlan._id,
      status: 'active',
      razorpaySubscriptionId: 'sub_already_gone',
    });
    mockSubscriptionsCancel.mockRejectedValue(new Error('subscription already cancelled on Razorpay'));

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: freePlan._id.toString() });

    // The org explicitly asked to switch to Free — a Razorpay-side error on
    // the OLD subscription shouldn't trap them on their old plan.
    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('active');
  });

  it('starts a trial when the plan has trialDays set, passing start_at to Razorpay', async () => {
    const trialPlan = await Plan.create({ ...paidPlanBody, trialDays: 30 });
    mockSubscriptionsCreate.mockResolvedValue({ id: 'sub_trial_1', status: 'created' });

    const before = Math.floor(Date.now() / 1000);
    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: trialPlan._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.subscription.status).toBe('trialing');
    expect(res.body.subscription.trialEndsAt).toBeTruthy();

    const call = mockSubscriptionsCreate.mock.calls[0][0];
    expect(call.start_at).toBeGreaterThanOrEqual(before + 29 * 24 * 60 * 60);
    expect(call.start_at).toBeLessThanOrEqual(before + 31 * 24 * 60 * 60);
  });

  it('does not pass start_at for a plan with no trial (trialDays: 0)', async () => {
    const paidPlan = await Plan.create({ ...paidPlanBody, trialDays: 0 });
    mockSubscriptionsCreate.mockResolvedValue({ id: 'sub_no_trial', status: 'created' });

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: paidPlan._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.subscription.status).toBe('created');
    expect(res.body.subscription.trialEndsAt).toBeNull();

    const call = mockSubscriptionsCreate.mock.calls[0][0];
    expect(call.start_at).toBeUndefined();
  });
});
