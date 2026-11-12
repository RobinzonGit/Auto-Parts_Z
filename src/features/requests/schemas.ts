import { z } from 'zod';
import { numberInput } from '@/features/common/schemas';

/** Схема запроса на закупку. */
export const createRequestSchema = z.object({
  quantity: numberInput({ integer: true, min: 1, max: 1000 }),
  comment: z.string().trim().max(500, 'Максимум 500 символов').optional().or(z.literal('')),
});

export type CreateRequestFormValues = z.infer<typeof createRequestSchema>;
