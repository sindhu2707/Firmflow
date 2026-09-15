import { Schema, model, Document } from 'mongoose';

// Every event Razorpay has successfully delivered and we've acted on.
// Razorpay uses at-least-once delivery and retries on any non-2xx or slow
// response, so the same event can arrive more than once — this table is
// what makes re-processing a no-op instead of a double-charge or duplicate invoice.
export interface IWebhookEvent extends Document {
  eventId: string; // the `x-razorpay-event-id` header value — stable across retries of the same event
  eventType: string; // e.g. 'subscription.charged' — kept for debugging/audit only
  processedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
});

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
