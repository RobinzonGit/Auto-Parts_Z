import type { SearchEngine, WebSearchParams } from '@/types';

/**
 * Кнопка-облачко «Поиск в интернете» — вспомогательные функции.
 * Формирует URL внешнего поиска Google или Яндекс по наименованию
 * и(или) артикулу и открывает результат в новой вкладке.
 */

interface EngineConfig {
  label: string;
  baseUrl: string;
  queryParam: string;
}

const ENGINES: Record<SearchEngine, EngineConfig> = {
  google: { label: 'Google', baseUrl: 'https://www.google.com/search', queryParam: 'q' },
  yandex: { label: 'Яндекс', baseUrl: 'https://yandex.ru/search/', queryParam: 'text' },
};

/** Подписи для UI. */
export function getEngineLabel(engine: SearchEngine): string {
  return ENGINES[engine].label;
}

/** Ключ localStorage для запоминания последней выбранной поисковой системы. */
const LAST_ENGINE_KEY = 'autoparts.webSearch.engine';

/** Чистит строку от управляющих символов и лишних пробелов, ограничивает длину. */
function sanitize(value: string | undefined, maxLength: number): string {
  if (!value) return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Собирает поисковый запрос: наименование и(или) артикул. */
export function buildSearchQuery(params: Pick<WebSearchParams, 'name' | 'article'>): string {
  const name = sanitize(params.name, 120);
  const article = sanitize(params.article, 60);
  return [name, article].filter(Boolean).join(' ');
}

/**
 * Строит URL поиска. Возвращает null, если запрос пустой.
 * Примеры:
 *   Google — https://www.google.com/search?q=Колодки%20BP-4521
 *   Яндекс — https://yandex.ru/search/?text=Колодки%20BP-4521
 */
export function buildSearchUrl(engine: SearchEngine, params: Pick<WebSearchParams, 'name' | 'article'>): string | null {
  const query = buildSearchQuery(params);
  if (!query) return null;
  const config = ENGINES[engine];
  return `${config.baseUrl}?${config.queryParam}=${encodeURIComponent(query)}`;
}

/**
 * Открывает поиск в новой вкладке (noopener/noreferrer — вкладка не получает
 * доступ к странице приложения). Возвращает false, если запрос пуст.
 */
export function openWebSearch(engine: SearchEngine, params: Pick<WebSearchParams, 'name' | 'article'>): boolean {
  const url = buildSearchUrl(engine, params);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/** Сохраняет выбранную поисковую систему между сеансами. */
export function saveLastEngine(engine: SearchEngine): void {
  try {
    localStorage.setItem(LAST_ENGINE_KEY, engine);
  } catch {
    /* localStorage недоступен — не критично */
  }
}

/** Возвращает последнюю выбранную поисковую систему (по умолчанию — Google). */
export function loadLastEngine(): SearchEngine {
  try {
    const value = localStorage.getItem(LAST_ENGINE_KEY);
    if (value === 'google' || value === 'yandex') return value;
  } catch {
    /* игнорируем */
  }
  return 'google';
}
