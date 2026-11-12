import { AppError } from '@/types';
import type { CreateRequestInput, PurchaseRequest, RequestListQuery, RequestStatus } from '@/types/request';
import type { RequestRepository } from './requestRepository';
import { getSessionUser, loadDb, saveDb } from '@/services/storage/localDb';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Локальная реализация RequestRepository.
 * Роли: обычный пользователь видит только свои запросы и может отменить
 * свой новый запрос; moderator/admin видят все и меняют статусы; удаление — admin.
 */
export class LocalRequestRepository implements RequestRepository {
  async list(query: RequestListQuery = {}): Promise<PurchaseRequest[]> {
    const me = getSessionUser();
    if (!me) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');

    let items = [...loadDb().requests];
    // Обычный пользователь не может видеть чужие запросы ни при каких параметрах.
    if (me.role === 'user') {
      items = items.filter((r) => r.userId === me.id);
    } else if (query.userId) {
      items = items.filter((r) => r.userId === query.userId);
    }
    if (query.status) {
      items = items.filter((r) => r.status === query.status);
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }

  async create(data: CreateRequestInput): Promise<PurchaseRequest> {
    const me = getSessionUser();
    if (!me) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');
    if (!Number.isInteger(data.quantity) || data.quantity < 1) {
      throw new AppError('VALIDATION', 'Количество должно быть целым числом не меньше 1.');
    }
    const component = loadDb().components.find((c) => c.id === data.componentId);
    if (!component) throw new AppError('NOT_FOUND', 'Запчасть не найдена.');
    if (component.status === 'archived') {
      throw new AppError('VALIDATION', 'Нельзя оставить запрос для архивной позиции.');
    }

    const now = new Date().toISOString();
    const request: PurchaseRequest = {
      id: uuidv4(),
      componentId: component.id,
      componentName: component.name,
      componentArticle: component.article,
      userId: me.id,
      userName: me.name,
      quantity: data.quantity,
      comment: data.comment?.trim() || undefined,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
    loadDb().requests.push(request);
    saveDb();
    logger.info('requests', 'Создан запрос на закупку', { requestId: request.id });
    return request;
  }

  async updateStatus(id: string, status: RequestStatus): Promise<void> {
    const me = getSessionUser();
    if (!me) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');
    const request = loadDb().requests.find((r) => r.id === id);
    if (!request) throw new AppError('NOT_FOUND', 'Запрос не найден.');

    if (me.role === 'user') {
      // Пользователь может только отменить собственный новый запрос.
      if (request.userId !== me.id) throw new AppError('FORBIDDEN', 'Недостаточно прав для этого действия.');
      if (status !== 'cancelled') throw new AppError('FORBIDDEN', 'Пользователь может только отменить запрос.');
      if (request.status !== 'new') {
        throw new AppError('VALIDATION', 'Отменить можно только запрос в статусе «Новая».');
      }
    } else if (me.role !== 'moderator' && me.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Недостаточно прав для этого действия.');
    }

    request.status = status;
    request.updatedAt = new Date().toISOString();
    saveDb();
    logger.info('requests', 'Статус запроса изменён', { requestId: id, status });
  }

  async delete(id: string): Promise<void> {
    const me = getSessionUser();
    if (!me) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');
    if (me.role !== 'admin') throw new AppError('FORBIDDEN', 'Удалять запросы может только администратор.');
    const db = loadDb();
    const exists = db.requests.some((r) => r.id === id);
    if (!exists) throw new AppError('NOT_FOUND', 'Запрос не найден.');
    db.requests = db.requests.filter((r) => r.id !== id);
    saveDb();
    logger.info('requests', 'Запрос удалён', { requestId: id });
  }
}
