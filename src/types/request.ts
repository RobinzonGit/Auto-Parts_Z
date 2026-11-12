/** Статус запроса на закупку. */
export type RequestStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Запрос на закупку.
 * Имена запчасти и пользователя сохраняются снапшотом (denormalized),
 * чтобы история оставалась понятной даже после удаления/переименования.
 */
export interface PurchaseRequest {
  id: string;
  componentId: string;
  componentName: string;
  componentArticle: string;
  userId: string;
  userName: string;
  quantity: number;
  comment?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

/** Данные создания запроса. */
export interface CreateRequestInput {
  componentId: string;
  quantity: number;
  comment?: string;
}

/** Параметры выборки запросов. */
export interface RequestListQuery {
  userId?: string;
  status?: RequestStatus;
}
