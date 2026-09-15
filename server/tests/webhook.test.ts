import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { Types } from 'mongoose';
import app from '../src/app';
import { Plan } from '../src/modules/plan/plan.model';
import { Subscription } from '../src/modules/subscription/subscription.model';
import { Payment } from '../src/modules/payment/payment.model';
import { Invoice } from '../src/modules/invoice/invoice.model';
import { WebhookEvent } from '../src/modules/webhook/webhookEvent.model';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET as string;

function signedPost(bodyObj: object, opts?: { signature?: string; eventId?: string; skipSignature?: boolean }) {
  const raw = JSON.stringify(bodyObj);
  const signature =
    opts?.signature ?? crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');

  const req = request(app).post('/api/webhooks/razorpay').set('Content-Type', 'application/json');

  if (!opts?.skipSignature) {
    req.set('X-Razorpay-Signature', signature);
  }
  if (opts?.eventId !== undefined) {
    req.set('x-razorpay-event-id', opts.eventId);
  }

  return req.send(raw);
}

function chargedEventBody(overrides: {
  eventId: string;
  razorpaySubscriptionId: string;
  organizationId: string;
  paymentId?: string;
  currentEnd?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    entity: 'event',
    account_id: 'acc_test',
    event: 'subscription.charged',
    contains: ['subscription', 'payment'],
    payload: {
      subscription: {
        entity: {
          id: overrides.razorpaySubscriptionId,
          status: 'active',
          current_start: now,
          current_end: overrides.currentEnd ?? now + 30 * 24 * 60 * 60,
          notes: { organizationId: overrides.organizationId },
        },
      },
      payment: {
        entity: {
          id: overrides.paymentId ?? 'pay_test_1',
          amount: 99900,
          currency: 'INR',
          status: 'captured',
          method: 'card',
          notes: { organizationId: overrides.organizationId },
        },
      },
    },
    created_at: now,
  };
}

describe('Razorpay webhook handler', () => {
  let organizationId: string;
  let paidPlanId: string;

  beforeEach(async () => {
    organizationId = new Types.ObjectId().toString();
    const plan = await Plan.create({
      name: 'Starter',
      slug: 'starter',
      billingCycle: 'monthly',
      price: 99900,
      currency: 'INR',
      limits: { firms: 3, products: 500, employees: 10 },
      razorpayPlanId: 'plan_test_starter',
    });
    paidPlanId = plan._id.toString();
  });

  it('rejects a request with no signature header at all', async () => {
    const body = chargedEventBody({
      eventId: 'evt_1',
      razorpaySubscriptionId: 'sub_1',
      organizationId,
    });
    const res = await signedPost(body, { skipSignature: true, eventId: 'evt_1' });
    expect(res.status).toBe(400);
  });

  it('rejects a request with a tampered/invalid signature', async () => {
    const body = chargedEventBody({
      eventId: 'evt_2',
      razorpaySubscriptionId: 'sub_2',
      organizationId,
    });
    const res = await signedPost(body, { signature: 'not-the-real-signature', eventId: 'evt_2' });
    expect(res.status).toBe(400);

    // and no side effects happened
    const sub = await Subscription.findOne({ razorpaySubscriptionId: 'sub_2' });
    expect(sub).toBeNull();
  });

  it('activates a subscription and records a payment + invoice on subscription.charged', async () => {
    await Subscription.create({
      organizationId,
      planId: paidPlanId,
      status: 'created',
      razorpaySubscriptionId: 'sub_3',
    });

    const body = chargedEventBody({
      eventId: 'evt_3',
      razorpaySubscriptionId: 'sub_3',
      organizationId,
      paymentId: 'pay_3',
    });

    const res = await signedPost(body, { eventId: 'evt_3' });

    expect(res.status).toBe(200);

    const sub = await Subscription.findOne({ razorpaySubscriptionId: 'sub_3' });
    expect(sub?.status).toBe('active');
    expect(sub?.currentPeriodEnd).toBeTruthy();

    const payment = await Payment.findOne({ razorpayPaymentId: 'pay_3' });
    expect(payment).not.toBeNull();
    expect(payment?.status).toBe('captured');
    expect(payment?.amount).toBe(99900);

    const invoice = await Invoice.findOne({ subscriptionId: sub!._id });
    expect(invoice).not.toBeNull();
    expect(invoice?.status).toBe('paid');
    expect(invoice?.amount).toBe(99900);
  });

  it('treats a retried delivery of the same event id as a no-op', async () => {
    await Subscription.create({
      organizationId,
      planId: paidPlanId,
      status: 'created',
      razorpaySubscriptionId: 'sub_4',
    });

    const body = chargedEventBody({
      eventId: 'evt_4',
      razorpaySubscriptionId: 'sub_4',
      organizationId,
      paymentId: 'pay_4',
    });

    const first = await signedPost(body, { eventId: 'evt_4' });
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBeFalsy();

    const second = await signedPost(body, { eventId: 'evt_4' });
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);

    const events = await WebhookEvent.find({ eventId: 'evt_4' });
    expect(events).toHaveLength(1);

    const payments = await Payment.find({ razorpayPaymentId: 'pay_4' });
    expect(payments).toHaveLength(1);
  });

  it('flips status to active on subscription.activated', async () => {
    await Subscription.create({
      organizationId,
      planId: paidPlanId,
      status: 'created',
      razorpaySubscriptionId: 'sub_5',
    });

    const body = {
      entity: 'event',
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: { id: 'sub_5', status: 'active', notes: { organizationId } },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const res = await signedPost(body, { eventId: 'evt_5' });
    expect(res.status).toBe(200);

    const sub = await Subscription.findOne({ razorpaySubscriptionId: 'sub_5' });
    expect(sub?.status).toBe('active');
  });

  it('marks a subscription cancelled on subscription.cancelled', async () => {
    await Subscription.create({
      organizationId,
      planId: paidPlanId,
      status: 'active',
      razorpaySubscriptionId: 'sub_6',
      cancelAtPeriodEnd: true,
    });

    const body = {
      entity: 'event',
      event: 'subscription.cancelled',
      payload: {
        subscription: { entity: { id: 'sub_6', status: 'cancelled', notes: { organizationId } } },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const res = await signedPost(body, { eventId: 'evt_6' });
    expect(res.status).toBe(200);

    const sub = await Subscription.findOne({ razorpaySubscriptionId: 'sub_6' });
    expect(sub?.status).toBe('cancelled');
  });

  it('records a failed payment on payment.failed without touching subscription status', async () => {
    await Subscription.create({
      organizationId,
      planId: paidPlanId,
      status: 'active',
      razorpaySubscriptionId: 'sub_7',
    });

    const body = {
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_7',
            amount: 99900,
            currency: 'INR',
            status: 'failed',
            method: 'card',
            notes: { organizationId },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const res = await signedPost(body, { eventId: 'evt_7' });
    expect(res.status).toBe(200);

    const payment = await Payment.findOne({ razorpayPaymentId: 'pay_7' });
    expect(payment?.status).toBe('failed');

    const sub = await Subscription.findOne({ razorpaySubscriptionId: 'sub_7' });
    expect(sub?.status).toBe('active'); // untouched by a failed payment
  });

  it('does not error on an event type it does not recognize', async () => {
    const body = {
      entity: 'event',
      event: 'refund.processed',
      payload: {},
      created_at: Math.floor(Date.now() / 1000),
    };

    const res = await signedPost(body, { eventId: 'evt_8' });
    expect(res.status).toBe(200);
  });
});
