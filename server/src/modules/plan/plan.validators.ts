import { z } from 'zod';

// -1 = unlimited, otherwise a non-negative integer cap
const limitValue = z.number().int().min(-1);

const limitsSchema = z.object({
  firms: limitValue,
  products: limitValue,
  employees: limitValue,
});

const featuresSchema = z
  .object({
    reports: z.boolean().default(false),
    analytics: z.boolean().default(false),
    customBranding: z.boolean().default(false),
    apiAccess: z.boolean().default(false),
    auditLogs: z.boolean().default(false),
    prioritySupport: z.boolean().default(false),
  })
  .partial();

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'),
    billingCycle: z.enum(['monthly', 'yearly']),
    price: z.number().int().min(0, 'Price cannot be negative'),
    currency: z.string().trim().length(3).default('INR'),
    limits: limitsSchema,
    features: featuresSchema.optional(),
    trialDays: z.number().int().min(0).max(365).default(0),
    // omit for the free plan — it never syncs to Razorpay
    razorpayPlanId: z.string().trim().min(1).optional(),
    isActive: z.boolean().default(true),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    price: z.number().int().min(0).optional(),
    limits: limitsSchema.partial().optional(),
    features: featuresSchema.optional(),
    trialDays: z.number().int().min(0).max(365).optional(),
    razorpayPlanId: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const planIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
