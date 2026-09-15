import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { Subscription } from '../subscription/subscription.model';
import { Payment } from '../payment/payment.model';
import { Invoice } from '../invoice/invoice.model';
import { WebhookEvent } from './webhookEvent.model';

// Razorpay's recurring-payments webhook payload shape. Only the fields we
// actually read are typed — Razorpay sends more, we ignore the rest.
interface RazorpayWebhookPayload {
  event: string;
  created_at: number;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: RazorpayPaymentEntity };
    invoice?: { entity: RazorpayInvoiceEntity };
  };
}

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  current_start?: number; // unix seconds
  current_end?: number;
  notes?: Record<string, string>;
}

interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  notes?: Record<string, string>;
}

interface RazorpayInvoiceEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  short_url?: string;
}

function toDate(unixSeconds?: number): Date | undefined {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000) : undefined;
}

// Finds the local subscription a webhook event is about. Prefers the direct
// razorpaySubscriptionId match; falls back to the organizationId we stamped
// into `notes` at checkout time (Razorpay copies subscription notes onto its
// generated payments/invoices), for the rare event shape that omits the
// subscription entity but includes a payment entity.
async function resolveSubscription(payload: RazorpayWebhookPayload['payload']) {
  const razorpaySubscriptionId = payload.subscription?.entity?.id;
  if (razorpaySubscriptionId) {
    const sub = await Subscription.findOne({ razorpaySubscriptionId });
    if (sub) return sub;
  }

  const organizationId =
    payload.payment?.entity?.notes?.organizationId ?? payload.subscription?.entity?.notes?.organizationId;
  if (organizationId) {
    return Subscription.findOne({ organizationId });
  }

  return null;
}

export async function handleRazorpayWebhook(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const eventId = req.headers['x-razorpay-event-id'] as string | undefined;
  // express.raw() (mounted on this route only, ahead of the global JSON
  // parser — see app.ts) hands us the exact bytes Razorpay signed. Don't
  // JSON.parse before verifying, or a re-serialized body won't match the HMAC.
  const rawBody = req.body as Buffer;

  if (!env.razorpay.webhookSecret) {
    logger.error('Received a Razorpay webhook but RAZORPAY_WEBHOOK_SECRET is not set — rejecting.');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  if (!signature) {
    res.status(400).json({ error: 'Missing X-Razorpay-Signature header' });
    return;
  }

  const isValid = Razorpay.validateWebhookSignature(
    rawBody.toString(),
    signature,
    env.razorpay.webhookSecret
  );
  if (!isValid) {
    logger.warn('Razorpay webhook signature verification failed — possible spoofed request.');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const event: RazorpayWebhookPayload = JSON.parse(rawBody.toString());

  // Razorpay always sends x-razorpay-event-id per their docs, but if it's
  // ever absent, fall back to a composite key rather than skipping dedup entirely.
  const dedupeKey = eventId ?? `${event.event}:${event.created_at}`;

  try {
    await WebhookEvent.create({ eventId: dedupeKey, eventType: event.event });
  } catch (err: any) {
    if (err?.code === 11000) {
      // Already processed this exact event — Razorpay retried a delivery
      // (slow response, timeout, or a non-2xx on a previous attempt). No-op.
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    throw err;
  }

  // The event is now durably marked as received before we touch any business
  // data. If something below throws, Razorpay will NOT retry (we already
  // returned success semantics for this event id) — that trade-off favors
  // "never double-charge/double-invoice" over "never miss a state update".
  // Any failure here should be loud in your logs/monitoring, not silent.
  try {
    await processEvent(event);
  } catch (err) {
    logger.error({ err, event: event.event }, 'Failed to process Razorpay webhook after recording it');
  }

  // Always acknowledge fast — Razorpay times out slow responses at 5s and
  // treats that as a delivery failure, triggering a retry we don't want
  // once we've already recorded the event.
  res.status(200).json({ received: true });
}

async function processEvent(event: RazorpayWebhookPayload) {
  const { payload } = event;

  switch (event.event) {
    case 'subscription.authenticated':
    case 'subscription.activated': {
      const sub = await resolveSubscription(payload);
      if (!sub) break;
      sub.status = 'active';
      const entity = payload.subscription?.entity;
      if (entity?.current_end) sub.currentPeriodEnd = toDate(entity.current_end);
      await sub.save();
      break;
    }

    case 'subscription.charged': {
      const sub = await resolveSubscription(payload);
      if (!sub) break;

      const subEntity = payload.subscription?.entity;
      const paymentEntity = payload.payment?.entity;
      const invoiceEntity = payload.invoice?.entity;

      sub.status = 'active';
      if (subEntity?.current_end) sub.currentPeriodEnd = toDate(subEntity.current_end);
      await sub.save();

      if (paymentEntity) {
        // upsert, not create — a retried delivery for the same event is
        // already blocked by WebhookEvent, but this guards against Razorpay
        // sending the same payment id across two distinct events too.
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: paymentEntity.id },
          {
            organizationId: sub.organizationId,
            subscriptionId: sub._id,
            razorpayPaymentId: paymentEntity.id,
            razorpaySubscriptionId: subEntity?.id,
            amount: paymentEntity.amount,
            currency: paymentEntity.currency,
            status: 'captured',
            method: paymentEntity.method,
            eventType: event.event,
          },
          { upsert: true }
        );
      }

      await Invoice.findOneAndUpdate(
        invoiceEntity ? { razorpayInvoiceId: invoiceEntity.id } : { razorpayPaymentId: paymentEntity?.id },
        {
          organizationId: sub.organizationId,
          subscriptionId: sub._id,
          planId: sub.planId,
          razorpayInvoiceId: invoiceEntity?.id,
          razorpayPaymentId: paymentEntity?.id,
          amount: invoiceEntity?.amount ?? paymentEntity?.amount ?? 0,
          currency: invoiceEntity?.currency ?? paymentEntity?.currency ?? 'INR',
          status: 'paid',
          periodStart: toDate(subEntity?.current_start),
          periodEnd: toDate(subEntity?.current_end),
          pdfUrl: invoiceEntity?.short_url,
        },
        { upsert: true }
      );
      break;
    }

    case 'subscription.pending':
    case 'subscription.halted': {
      const sub = await resolveSubscription(payload);
      if (!sub) break;
      sub.status = 'past_due';
      await sub.save();
      break;
    }

    case 'subscription.cancelled':
    case 'subscription.completed': {
      const sub = await resolveSubscription(payload);
      if (!sub) break;
      sub.status = 'cancelled';
      await sub.save();
      break;
    }

    case 'payment.failed': {
      const sub = await resolveSubscription(payload);
      const paymentEntity = payload.payment?.entity;
      if (sub && paymentEntity) {
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: paymentEntity.id },
          {
            organizationId: sub.organizationId,
            subscriptionId: sub._id,
            razorpayPaymentId: paymentEntity.id,
            razorpaySubscriptionId: sub.razorpaySubscriptionId,
            amount: paymentEntity.amount,
            currency: paymentEntity.currency,
            status: 'failed',
            method: paymentEntity.method,
            eventType: event.event,
          },
          { upsert: true }
        );
      }
      break;
    }

    default:
      // Unhandled event types are expected — Razorpay adds new ones over
      // time, and we only subscribed to the ones above on the dashboard.
      logger.info({ event: event.event }, 'Received an unhandled Razorpay webhook event type');
  }
}
