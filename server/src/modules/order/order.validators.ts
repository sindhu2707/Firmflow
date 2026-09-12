import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    customerId: z.string().min(1).optional(), // optional: customer ordering for themselves omits this
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().min(1),
        })
      )
      .min(1, 'Order must have at least one item'),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'fulfilled', 'cancelled']),
  }),
});

export const orderIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const listOrdersQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'confirmed', 'fulfilled', 'cancelled']).optional(),
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 20)),
  }),
});