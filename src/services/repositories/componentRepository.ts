import type { Paginated } from '@/types/common';
import type {
  Component,
  ComponentListQuery,
  CreateComponentInput,
  UpdateComponentInput,
} from '@/types/component';

/**
 * Репозиторий запчастей (CRUD + поиск + импорт).
 * UI работает только через этот интерфейс — реализация (localStorage или Firebase) скрыта.
 */
export interface ComponentRepository {
  list(query?: ComponentListQuery): Promise<Paginated<Component>>;
  get(id: string): Promise<Component | null>;
  create(data: CreateComponentInput): Promise<Component>;
  update(id: string, patch: UpdateComponentInput): Promise<Component>;
  delete(id: string): Promise<void>;
  /** Импорт: пакетное создание позиций. Возвращает созданные записи. */
  bulkCreate(items: CreateComponentInput[]): Promise<Component[]>;
}
