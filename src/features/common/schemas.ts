import { z } from 'zod';

/** Email с нормализацией к нижнему регистру. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Введите email')
  .email('Некорректный email')
  .max(120, 'Слишком длинный email')
  .transform((value) => value.toLowerCase());

/** Пароль: минимум 8 символов, латинские буквы и цифры. */
export const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .max(72, 'Максимум 72 символа')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: 'Пароль должен содержать латинские буквы и цифры',
  });

/** Имя пользователя. */
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Минимум 2 символа')
  .max(80, 'Максимум 80 символов');

/**
 * Числовое поле ввода: принимает строку из <input type="number"> (в т.ч. с запятой
 * в качестве десятичного разделителя) и возвращает число; пустая строка = undefined.
 */
export function numberInput(options: { integer?: boolean; min?: number; max?: number } = {}) {
  const { integer = false, min, max } = options;
  let inner = z.number({
    required_error: 'Введите число',
    invalid_type_error: integer ? 'Введите целое число' : 'Введите число',
  });
  if (integer) inner = inner.int('Введите целое число');
  if (min !== undefined) inner = inner.min(min, `Минимум ${min}`);
  if (max !== undefined) inner = inner.max(max, `Максимум ${max}`);
  return z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) return undefined;
      if (typeof v === 'number') return v;
      return Number(String(v).trim().replace(',', '.'));
    },
    inner,
  );
}

/**
 * Необязательная внешняя ссылка: допускает пустую строку и undefined,
 * непустое значение должно быть http/https URL.
 */
export const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, 'Слишком длинная ссылка')
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), {
    message: 'Допустимы только ссылки http(s)://',
  })
  .transform((v) => (v === '' ? undefined : v))
  .optional();
