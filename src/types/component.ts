/** Статус запчасти. */
export type ComponentStatus = 'active' | 'archived' | 'out_of_stock';

/** Позиция склада. */
export interface Component {
  id: string;
  name: string;
  article: string;
  /** Закупочная цена (видна только staff). */
  purchasePrice: number;
  /** Наценка в процентах. */
  markupPercent: number;
  /**
   * Цена продажи. По умолчанию рассчитывается как
   * purchasePrice * (1 + markupPercent / 100), но может быть переопределена вручную.
   */
  price: number;
  /** Фото в формате data URL (base64). В IndexedDB хранится отдельно, см. photoStore. */
  photo?: string;
  /** Адрес ячейки склада, например «A-01-02». */
  warehouseCell: string;
  quantity: number;
  /** Внешняя ссылка для поиска позиции (только http/https). */
  searchUrl?: string;
  note?: string;
  status: ComponentStatus;
  createdAt: string;
  updatedAt: string;
}

/** Данные создания запчасти. */
export interface CreateComponentInput {
  name: string;
  article: string;
  purchasePrice: number;
  markupPercent: number;
  /** Если не указана — рассчитывается из закупки и наценки. */
  price?: number;
  photo?: string;
  warehouseCell: string;
  quantity: number;
  searchUrl?: string;
  note?: string;
  status?: ComponentStatus;
}

/** Данные изменения запчасти. */
export type UpdateComponentInput = Partial<CreateComponentInput>;

/** Параметры выборки списка запчастей. */
export interface ComponentListQuery {
  search?: string;
  status?: ComponentStatus;
  page?: number;
  pageSize?: number;
}
