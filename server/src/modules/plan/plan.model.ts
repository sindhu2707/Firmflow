import { Schema, model, Types, Document } from 'mongoose';

export type BillingCycle = 'monthly' | 'yearly';

// -1 means unlimited. Everything else is a hard cap enforced by checkPlanLimit.
export interface IPlanLimits {
  firms: number;
  products: number;
  employees: number;
}

export interface IPlanFeatures {
  reports: boolean;
  analytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  auditLogs: boolean;
  prioritySupport: boolean;
}

export interface IPlan extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string; // 'free' | 'starter' | 'business' | 'enterprise' — stable identifier, not shown to users
  billingCycle: BillingCycle;
  price: number; // in paise. 0 for the free plan.
  currency: string; // ISO 4217, e.g. 'INR'
  limits: IPlanLimits;
  features: IPlanFeatures;
  trialDays: number; // 0 = no trial. Free plan should always be 0 (nothing to trial).
  razorpayPlanId?: string; // absent for the free plan — it never touches Razorpay
  isActive: boolean; // deactivated plans stay for historical subscriptions but drop out of pricing pages
  createdAt: Date;
  updatedAt: Date;
}

const planLimitsSchema = new Schema<IPlanLimits>(
  {
    firms: { type: Number, required: true, default: 1 },
    products: { type: Number, required: true, default: 20 },
    employees: { type: Number, required: true, default: 2 },
  },
  { _id: false }
);

const planFeaturesSchema = new Schema<IPlanFeatures>(
  {
    reports: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    auditLogs: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
  },
  { _id: false }
);

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    limits: { type: planLimitsSchema, required: true },
    features: { type: planFeaturesSchema, required: true, default: () => ({}) },
    trialDays: { type: Number, required: true, default: 0, min: 0 },
    razorpayPlanId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// one plan document per (tier, billing cycle) combination
planSchema.index({ slug: 1, billingCycle: 1 }, { unique: true });

export const Plan = model<IPlan>('Plan', planSchema);
