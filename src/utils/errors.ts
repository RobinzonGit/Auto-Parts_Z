import { AppError } from '@/types';

/** Преобразует произвольную ошибку в понятное пользователю сообщение. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Неизвестная ошибка. Попробуйте ещё раз.';
}
