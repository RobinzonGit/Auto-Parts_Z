import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/** Цена в формате RUB: «2 405,00 ₽». */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Дата и время: «05.02.2026 14:30». */
export function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), 'dd.MM.yyyy HH:mm', { locale: ru });
  } catch {
    return iso;
  }
}

/** Только дата: «05.02.2026». */
export function formatDate(iso: string): string {
  try {
    return format(new Date(iso), 'dd.MM.yyyy', { locale: ru });
  } catch {
    return iso;
  }
}
