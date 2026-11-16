
export type ComponentStatus = 'active' | 'archived' | 'out_of_stock';

/**
 * Доменная модель запчасти.
 * Фото хранится как base64 data URL прямо в документе Firestore.
 */
export interface Component {
  id: string;
  name: string;
  article: string;
  purchasePrice: number;
  markupPercent: number;
  price: number;
  warehouseCell: string;
  quantity: number;
  note: string;
  status: ComponentStatus;
  /** base64 data URL или null, если фото нет. */
  photo: string | null;
  hasPhoto: boolean;
  searchUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Данные для создания запчасти.
 * Обязательные поля — те, без которых запись бессмысленна.
 * Остальные опциональны: Zod-схема формы их не требует,
 * а репозиторий подставит '' / 0 / null через `??`.
 */
export interface CreateComponentInput {
  name: string;
  article: string;
  purchasePrice: number;
  markupPercent: number;
  price: number;
  warehouseCell: string;
  quantity: number;
  status: ComponentStatus;
  /** base64 data URL или null. */
  photo?: string | null;
  note?: string;
  searchUrl?: string;
}

/**
 * Данные для обновления запчасти.
 * Все поля опциональны — обновляем только то, что пришло.
 * `photo` отсутствует в объекте, если пользователь не менял фото.
 */
export interface UpdateComponentInput {
  name?: string;
  article?: string;
  purchasePrice?: number;
  markupPercent?: number;
  price?: number;
  warehouseCell?: string;
  quantity?: number;
  note?: string;
  status?: ComponentStatus;
  /** base64 data URL или null (удалить фото). Поле отсутствует, если фото не менялось. */
  photo?: string | null;
  searchUrl?: string;
}

export interface ComponentListQuery {
  search?: string;
  status?: ComponentStatus;
  page?: number;
  pageSize?: number;
}
