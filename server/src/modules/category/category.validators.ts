import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(1).max(100),
  }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});