import { z } from 'zod';
import type { SearchEngine } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { showSnackbar } from '@/features/search/notifications';

/**
 * Zod-схема формы веб-поиска (кнопка-облачко).
 * Достаточно заполнить наименование И(ИЛИ) артикул.
 */
export const webSearchSchema = z
  .object({
    name: z.string().trim().max(120, 'Максимум 120 символов').default(''),
    article: z.string().trim().max(60, 'Максимум 60 символов').default(''),
    engine: z.enum(['google', 'yandex']),
  })
  .superRefine((values, ctx) => {
    if (!values.name && !values.article) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите наименование и(или) артикул',
        path: ['name'],
      });
    }
  });

export type WebSearchFormValues = z.infer<typeof webSearchSchema>;

/** Доступные поисковые системы для формы. */
export const SEARCH_ENGINE_OPTIONS: Array<{ value: SearchEngine; label: string }> = [
  { value: 'google', label: 'Google' },
  { value: 'yandex', label: 'Яндекс' },
];

/**
 * Защита на уровне логики: выполняет действие только для администратора.
 * Вызывается из диалога поверх скрытия кнопки (защита от подделки DOM).
 */
export function assertAdminForWebSearch(): boolean {
  const user = useAuthStore.getState().user;
  if (user?.role === 'admin') return true;
  showSnackbar('Поиск в интернете доступен только администратору.', 'error');
  return false;
}
