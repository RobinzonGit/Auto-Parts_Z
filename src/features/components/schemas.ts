import { z } from 'zod';
import type { ComponentStatus } from '@/types';
import { numberInput, optionalUrlSchema } from '@/features/common/schemas';

export const COMPONENT_STATUSES: ComponentStatus[] = ['active', 'archived', 'out_of_stock'];

/** Схема формы создания/редактирования запчасти. */
export const componentFormSchema = z.object({
  name: z.string().trim().min(2, 'Минимум 2 символа').max(120, 'Максимум 120 символов'),
  article: z.string().trim().min(1, 'Укажите артикул').max(60, 'Максимум 60 символов'),
  purchasePrice: numberInput({ min: 0, max: 10_000_000 }),
  markupPercent: numberInput({ min: 0, max: 100 }),
  price: numberInput({ min: 0, max: 20_000_000 }),
  warehouseCell: z.string().trim().min(1, 'Укажите ячейку склада').max(30, 'Максимум 30 символов'),
  quantity: numberInput({ integer: true, min: 0, max: 100_000 }),
  searchUrl: optionalUrlSchema,
  note: z.string().trim().max(500, 'Максимум 500 символов').optional().or(z.literal('')),
  status: z.enum(['active', 'archived', 'out_of_stock']),
  /** Фото — data URL; файл проверяется отдельно (см. utils/image.ts). */
  photo: z.string().optional(),
});

export type ComponentFormValues = z.infer<typeof componentFormSchema>;

/** Схема строки импорта (CSV/JSON уже нормализованы в числа). */
export const componentImportRowSchema = z.object({
  name: z.string().trim().min(2, 'Минимум 2 символа').max(120, 'Максимум 120 символов'),
  article: z.string().trim().min(1, 'Укажите артикул').max(60, 'Максимум 60 символов'),
  purchasePrice: z.number().min(0, 'Не может быть отрицательной').max(10_000_000),
  markupPercent: z.number().min(0, 'Не может быть отрицательной').max(100, 'Максимум 100'),
  warehouseCell: z.string().trim().min(1, 'Укажите ячейку').max(30),
  quantity: z.number().int().min(0).max(100_000),
  searchUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), { message: 'Только http(s):// ссылки' })
    .optional(),
  note: z.string().trim().max(500).optional(),
  status: z.enum(['active', 'archived', 'out_of_stock']).optional(),
});

export type ComponentImportRow = z.infer<typeof componentImportRowSchema>;
