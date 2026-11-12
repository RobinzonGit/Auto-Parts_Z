import { z } from 'zod';
import { emailSchema, nameSchema, passwordSchema } from '@/features/common/schemas';

/** Схема входа. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** Схема регистрации с подтверждением пароля. */
export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Схема редактирования профиля (имя). */
export const profileSchema = z.object({
  name: nameSchema,
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

/** Схема смены пароля. */
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
