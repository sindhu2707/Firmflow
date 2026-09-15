import { Schema, model, Types, Document } from 'mongoose';

// Not exposed via its own API route (yet) — this is an internal audit trail
// of every payment attempt Razorpay told us about, mainly so a support
// question ("did this charge go through?") never depends on trusting
// Razorpay's dashboard alone.
export interface IPayment extends Document {
  organizationId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  razorpayPaymentId: string;
  razorpaySubscriptionId?: string;
  amount: number; // paise
  currency: string;
  status: 'captured' | 'failed';
  method?: string; // card, upi, netbanking, etc. — whatever Razorpay reports
  eventType: string; // which webhook event produced this row, e.g. 'subscription.charged'
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    razorpayPaymentId: { type: String, required: true, unique: true },
    razorpaySubscriptionId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    status: { type: String, enum: ['captured', 'failed'], required: true },
    method: { type: String },
    eventType: { type: String, required: true },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
