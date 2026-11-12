/** Коды ошибок приложения — используются в UI для показа сообщений. */
export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'STORAGE'
  | 'UNKNOWN';

/**
 * Ошибка домена с машиночитаемым кодом.
 * Все репозитории выбрасывают именно её, чтобы слои UI показывали понятный текст.
 */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/** Результат постраничного списка. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
