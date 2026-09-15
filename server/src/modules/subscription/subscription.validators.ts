import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    planId: z.string().min(1, 'planId is required'),
  }),
});
