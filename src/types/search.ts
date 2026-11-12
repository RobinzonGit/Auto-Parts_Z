/**
 * Поисковые системы для кнопки-облачка «Поиск в интернете».
 * Доступно только роли admin.
 */
export type SearchEngine = 'google' | 'yandex';

/** Параметры веб-поиска: запчасть ищут по наименованию и(или) артикулу. */
export interface WebSearchParams {
  name?: string;
  article?: string;
  engine: SearchEngine;
}
