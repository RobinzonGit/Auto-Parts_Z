import { AppError } from '@/types';
import type {
  Component,
  ComponentListQuery,
  CreateComponentInput,
  UpdateComponentInput,
} from '@/types/component';
import type { Paginated } from '@/types/common';
import type { ComponentRepository } from './componentRepository';
import { loadDb, saveDb, getSessionUser, type StoredComponent } from '@/services/storage/localDb';
import { deletePhoto, getPhoto, putPhoto } from '@/services/storage/photoStore';
import { calcPrice } from '@/utils/calc';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Локальная реализация ComponentRepository.
 * CRUD доступен только moderator/admin (двойная защита: маршрут + репозиторий).
 * Метаданные — в localStorage, фото — в IndexedDB (photoStore).
 */

/** Добавляет photo (data URL) к записи из хранилища. */
async function hydratePhoto(record: StoredComponent): Promise<Component> {
  if (!record.hasPhoto) {
    const { hasPhoto: _f, ...component } = record;
    return component;
  }
  const photo = await getPhoto(record.id);
  const { hasPhoto: _f, ...component } = record;
  return photo ? { ...component, photo } : component;
}

/** Проверка прав staff (модератор или администратор). */
function requireStaff(): void {
  const user = getSessionUser();
  if (!user) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');
  if (user.role !== 'moderator' && user.role !== 'admin') {
    throw new AppError('FORBIDDEN', 'Изменять запчасти могут только модератор и администратор.');
  }
}

/** Валидация внешней ссылки на уровне данных (страховка после Zod-валидации в форме). */
function assertValidSearchUrl(searchUrl?: string): void {
  if (searchUrl && !/^https?:\/\//i.test(searchUrl)) {
    throw new AppError('VALIDATION', 'Ссылка для поиска должна начинаться с http:// или https://');
  }
}

export class LocalComponentRepository implements ComponentRepository {
  async list(query: ComponentListQuery = {}): Promise<Paginated<Component>> {
    const db = loadDb();
    const search = (query.search ?? '').trim().toLowerCase();

    let items = [...db.components];
    if (search) {
      items = items.filter((c) =>
        [c.name, c.article, c.warehouseCell, c.note ?? ''].some((field) => field.toLowerCase().includes(search)),
      );
    }
    if (query.status) {
      items = items.filter((c) => c.status === query.status);
    }
    items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const total = items.length;
    const slice = items.slice((page - 1) * pageSize, page * pageSize);
    const hydrated = await Promise.all(slice.map(hydratePhoto));
    return { items: hydrated, total, page, pageSize };
  }

  async get(id: string): Promise<Component | null> {
    const record = loadDb().components.find((c) => c.id === id);
    if (!record) return null;
    return hydratePhoto(record);
  }

  async create(data: CreateComponentInput): Promise<Component> {
    requireStaff();
    const created = await this.addOne(data);
    logger.info('components', 'Запчасть создана', { id: created.id, name: created.name });
    return created;
  }

  async update(id: string, patch: UpdateComponentInput): Promise<Component> {
    requireStaff();
    const db = loadDb();
    const record = db.components.find((c) => c.id === id);
    if (!record) throw new AppError('NOT_FOUND', 'Запчасть не найдена.');

    const nextPrice =
      patch.price !== undefined ? patch.price : calcPrice(record.purchasePrice, record.markupPercent);

    if ('photo' in patch) {
      // Явная передача ключа photo: значение undefined означает «удалить фото».
      if (patch.photo) {
        await putPhoto(id, patch.photo);
        record.hasPhoto = true;
      } else {
        await deletePhoto(id);
        record.hasPhoto = false;
      }
    }

    record.name = (patch.name ?? record.name).trim();
    record.article = (patch.article ?? record.article).trim();
    record.purchasePrice = patch.purchasePrice ?? record.purchasePrice;
    record.markupPercent = patch.markupPercent ?? record.markupPercent;
    record.price = nextPrice;
    record.warehouseCell = (patch.warehouseCell ?? record.warehouseCell).trim();
    record.quantity = patch.quantity ?? record.quantity;
    record.searchUrl = patch.searchUrl !== undefined ? patch.searchUrl || undefined : record.searchUrl;
    record.note = patch.note !== undefined ? patch.note || undefined : record.note;
    record.status = patch.status ?? record.status;
    assertValidSearchUrl(record.searchUrl);
    record.updatedAt = new Date().toISOString();
    saveDb();
    logger.info('components', 'Запчасть обновлена', { id });
    return hydratePhoto(record);
  }

  async delete(id: string): Promise<void> {
    requireStaff();
    const db = loadDb();
    const exists = db.components.some((c) => c.id === id);
    if (!exists) throw new AppError('NOT_FOUND', 'Запчасть не найдена.');
    db.components = db.components.filter((c) => c.id !== id);
    await deletePhoto(id);
    saveDb();
    logger.info('components', 'Запчасть удалена', { id });
  }

  async bulkCreate(items: CreateComponentInput[]): Promise<Component[]> {
    requireStaff();
    const created: Component[] = [];
    for (const item of items) {
      created.push(await this.addOne(item));
    }
    logger.info('components', `Импортировано позиций: ${created.length}`);
    return created;
  }

  /** Внутреннее добавление записи без повторной проверки прав. */
  private async addOne(data: CreateComponentInput): Promise<Component> {
    const db = loadDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    assertValidSearchUrl(data.searchUrl);

    const record: StoredComponent = {
      id,
      name: data.name.trim(),
      article: data.article.trim(),
      purchasePrice: data.purchasePrice,
      markupPercent: data.markupPercent,
      price: data.price ?? calcPrice(data.purchasePrice, data.markupPercent),
      warehouseCell: data.warehouseCell.trim(),
      quantity: data.quantity,
      searchUrl: data.searchUrl?.trim() || undefined,
      note: data.note?.trim() || undefined,
      status: data.status ?? 'active',
      createdAt: now,
      updatedAt: now,
      hasPhoto: false,
    };
    if (data.photo) {
      await putPhoto(id, data.photo);
      record.hasPhoto = true;
    }
    db.components.push(record);
    saveDb();
    return hydratePhoto(record);
  }
}
