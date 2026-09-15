import { Schema, model, Types, Document } from 'mongoose';

// 'created'   — a Razorpay subscription was opened but checkout hasn't been completed/confirmed yet
// 'trialing'  — checkout completed with a delayed first charge (see Plan.trialDays); usable now, not billed yet
// 'active'    — usable right now (includes the Free plan, which skips Razorpay entirely)
// 'past_due'  — a renewal charge failed; grace period, still usable until you decide otherwise
// 'cancelled' — no longer usable
export type SubscriptionStatus = 'created' | 'trialing' | 'active' | 'past_due' | 'cancelled';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  razorpaySubscriptionId?: string; // absent for the Free plan
  currentPeriodEnd?: Date; // undefined for the Free plan (never expires on its own)
  trialEndsAt?: Date; // set when checkout used a plan's trialDays; the date the first real charge is expected
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true, // one subscription doc per org — upgrades/downgrades update this doc, they don't create a new one
      index: true,
    },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: {
      type: String,
      enum: ['created', 'trialing', 'active', 'past_due', 'cancelled'],
      required: true,
      default: 'created',
    },
    razorpaySubscriptionId: { type: String },
    currentPeriodEnd: { type: Date },
    trialEndsAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
