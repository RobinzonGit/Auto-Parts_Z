import type { CreateRequestInput, PurchaseRequest, RequestListQuery, RequestStatus } from '@/types/request';

/**
 * Репозиторий запросов на закупку.
 * Права доступа (свой список / весь список / смена статуса) проверяются внутри реализации.
 */
export interface RequestRepository {
  list(query?: RequestListQuery): Promise<PurchaseRequest[]>;
  create(data: CreateRequestInput): Promise<PurchaseRequest>;
  updateStatus(id: string, status: RequestStatus): Promise<void>;
  delete(id: string): Promise<void>;
}
