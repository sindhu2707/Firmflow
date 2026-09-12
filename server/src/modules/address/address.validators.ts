import { z } from 'zod';

const addressBody = {
  label: z.string().trim().max(50).optional(),
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(100),
  isDefault: z.boolean().optional(),
};

export const createAddressSchema = z.object({
  body: z.object(addressBody),
});

export const updateAddressSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object(
      Object.fromEntries(
        Object.entries(addressBody).map(([k, v]) => [k, v.optional()])
      ) as { [K in keyof typeof addressBody]: z.ZodOptional<(typeof addressBody)[K]> }
    )
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
});

export const addressIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});