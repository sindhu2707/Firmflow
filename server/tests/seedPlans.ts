/**
 * Seeds the subscription_plans collection from the blueprint's pricing table.
 *
 * Run with: npx tsx src/scripts/seedPlans.ts
 *
 * razorpayPlanId is left blank here on purpose — create the matching plan for
 * each paid (slug, billingCycle) pair on the Razorpay dashboard first
 * (Test Mode while building), then fill RAZORPAY_PLAN_* env vars below, or
 * patch each plan afterwards via PATCH /api/plans/:id as super_admin.
 * The free plan never gets a razorpayPlanId — it's never charged.
 */
import mongoose from 'mongoose';
import { env } from "../config/env";
import { Plan } from '../modules/plan/plan.model';

type SeedPlan = {
  name: string;
  slug: string;
  billingCycle: 'monthly' | 'yearly';
  price: number; // paise
  limits: { firms: number; products: number; employees: number };
  features: Partial<{
    reports: boolean;
    analytics: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    auditLogs: boolean;
    prioritySupport: boolean;
  }>;
  trialDays?: number;
  razorpayPlanId?: string;
};

const UNLIMITED = -1;

const plans: SeedPlan[] = [
  {
    name: 'Free',
    slug: 'free',
    billingCycle: 'monthly',
    price: 0,
    limits: { firms: 1, products: 20, employees: 2 },
    features: {},
  },
  {
    name: 'Starter',
    slug: 'starter',
    billingCycle: 'monthly',
    price: 99900, // ₹999/mo
    limits: { firms: 3, products: 500, employees: 10 },
    features: {},
    trialDays: 30,
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER_MONTHLY,
  },
  {
    name: 'Starter',
    slug: 'starter',
    billingCycle: 'yearly',
    price: 999900, // ~2 months free vs monthly
    limits: { firms: 3, products: 500, employees: 10 },
    features: {},
    trialDays: 30,
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER_YEARLY,
  },
  {
    name: 'Business',
    slug: 'business',
    billingCycle: 'monthly',
    price: 299900, // ₹2,999/mo
    limits: { firms: UNLIMITED, products: UNLIMITED, employees: UNLIMITED },
    features: { reports: true, analytics: true },
    trialDays: 30,
    razorpayPlanId: process.env.RAZORPAY_PLAN_BUSINESS_MONTHLY,
  },
  {
    name: 'Business',
    slug: 'business',
    billingCycle: 'yearly',
    price: 2999900,
    limits: { firms: UNLIMITED, products: UNLIMITED, employees: UNLIMITED },
    features: { reports: true, analytics: true },
    trialDays: 30,
    razorpayPlanId: process.env.RAZORPAY_PLAN_BUSINESS_YEARLY,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    billingCycle: 'monthly',
    price: 999900, // ₹9,999/mo — adjust to your actual pricing
    limits: { firms: UNLIMITED, products: UNLIMITED, employees: UNLIMITED },
    features: {
      reports: true,
      analytics: true,
      customBranding: true,
      apiAccess: true,
      auditLogs: true,
      prioritySupport: true,
    },
    trialDays: 30,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ENTERPRISE_MONTHLY,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    billingCycle: 'yearly',
    price: 9999900,
    limits: { firms: UNLIMITED, products: UNLIMITED, employees: UNLIMITED },
    features: {
      reports: true,
      analytics: true,
      customBranding: true,
      apiAccess: true,
      auditLogs: true,
      prioritySupport: true,
    },
    trialDays: 30,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ENTERPRISE_YEARLY,
  },
];

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB — seeding plans...');

  for (const p of plans) {
    const result = await Plan.findOneAndUpdate(
      { slug: p.slug, billingCycle: p.billingCycle },
      { $set: p },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${result.name} (${result.billingCycle}) — ${result._id}`);
  }

  console.log(`Done. Seeded ${plans.length} plan documents.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
