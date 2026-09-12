import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    sku: z.string().trim().min(1, 'SKU is required').max(64),
    description: z.string().trim().max(2000).optional(),
    price: z.number().int('Price must be an integer (cents)').min(0),
    stock: z.number().int('Stock must be an integer').min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      sku: z.string().trim().min(1).max(64).optional(),
      description: z.string().trim().max(2000).optional(),
      price: z.number().int('Price must be an integer (cents)').min(0).optional(),
      stock: z.number().int('Stock must be an integer').min(0).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    isActive: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    search: z.string().trim().max(200).optional(),
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