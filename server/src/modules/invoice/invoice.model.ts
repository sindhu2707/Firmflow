import { Schema, model, Types, Document } from 'mongoose';

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  planId: Types.ObjectId;
  razorpayInvoiceId?: string; // absent if Razorpay didn't include an invoice entity on this event
  razorpayPaymentId?: string;
  amount: number; // paise
  currency: string;
  status: 'paid' | 'issued';
  periodStart?: Date;
  periodEnd?: Date;
  pdfUrl?: string; // Razorpay-hosted invoice page (short_url) — we don't generate our own PDF yet
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    razorpayInvoiceId: { type: String },
    razorpayPaymentId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    status: { type: String, enum: ['paid', 'issued'], required: true, default: 'paid' },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
