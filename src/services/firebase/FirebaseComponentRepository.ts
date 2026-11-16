import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';
import { toIso, cleanForFirestore } from './helpers';
import type { ComponentRepository } from '../repositories/componentRepository';
import type {
  Component,
  ComponentListQuery,
  CreateComponentInput,
  UpdateComponentInput,
} from '@/types/component';
import type { Paginated } from '@/types/common';

const COLLECTION = 'components';

/**
 * Лимит Firestore на размер документа — 1 МБ.
 * Base64 раздувает файл примерно на 33%, поэтому держим запас:
 * ~900 000 символов base64 ≈ 675 КБ бинарных данных.
 */
const MAX_PHOTO_BASE64_LENGTH = 900_000;

function mapComponent(id: string, data: Record<string, unknown>): Component {
  return {
    id,
    name: (data.name as string) ?? '',
    article: (data.article as string) ?? '',
    purchasePrice: Number(data.purchasePrice ?? 0),
    markupPercent: Number(data.markupPercent ?? 0),
    price: Number(data.price ?? 0),
    warehouseCell: (data.warehouseCell as string) ?? '',
    quantity: Number(data.quantity ?? 0),
    note: (data.note as string) ?? '',
    status: data.status as Component['status'],
    // Фото хранится прямо в документе как base64-строка.
    // Поле в типе Component должно называться `photo`.
    photo: (data.photo as string | null) ?? null,
    hasPhoto: Boolean(data.photo),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  } as Component;
}

export class FirebaseComponentRepository implements ComponentRepository {
  async list(query?: ComponentListQuery): Promise<Paginated<Component>> {
    const snap = await getDocs(collection(db, COLLECTION));
    let items = snap.docs.map((d) =>
      mapComponent(d.id, d.data() as Record<string, unknown>)
    );

    if (query?.search) {
      const q = query.search.toLowerCase().trim();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.article.toLowerCase().includes(q) ||
          c.warehouseCell.toLowerCase().includes(q)
      );
    }

    if (query?.status) {
      items = items.filter((c) => c.status === query.status);
    }

    const total = items.length;
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    } as Paginated<Component>;
  }

  async get(id: string): Promise<Component | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists()
      ? mapComponent(snap.id, snap.data() as Record<string, unknown>)
      : null;
  }

  async create(data: CreateComponentInput): Promise<Component> {
    const newRef = doc(collection(db, COLLECTION));

    // Ожидаем, что photo — base64 data URL, полученный через processPhotoFile.
    const photo = (data as { photo?: string | null }).photo ?? null;

    if (photo && photo.length > MAX_PHOTO_BASE64_LENGTH) {
      throw new Error(
        'Фото слишком большое для Firestore (лимит ~1 МБ на документ). ' +
          'Сожмите изображение или уменьшите разрешение.'
      );
    }

    const payload: Record<string, unknown> = {
      ...data,
      photo,
      hasPhoto: Boolean(photo),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    // На случай, если в data пришло лишнее поле photoUrl.
    delete payload.photoUrl;

    await setDoc(newRef, cleanForFirestore(payload));

    const created = await this.get(newRef.id);
    if (!created) throw new Error('Не удалось прочитать созданную запчасть');
    return created;
  }

  async update(id: string, patch: UpdateComponentInput): Promise<Component> {
    const ref = doc(db, COLLECTION, id);

    const p = patch as unknown as { photo?: string | null };

    const firestorePatch: Record<string, unknown> = {
      ...patch,
      updatedAt: serverTimestamp(),
    };

    if ('photo' in p) {
      // p.photo может быть undefined — обрабатываем это явно.
      if (p.photo === null || p.photo === '' || p.photo === undefined) {
        firestorePatch.photo = null;
        firestorePatch.hasPhoto = false;
      } else {
        if (p.photo.length > MAX_PHOTO_BASE64_LENGTH) {
          throw new Error(
            'Фото слишком большое для Firestore (лимит ~1 МБ на документ). ' +
              'Сожмите изображение или уменьшите разрешение.'
          );
        }
        firestorePatch.photo = p.photo;
        firestorePatch.hasPhoto = true;
      }
    }

    await updateDoc(ref, cleanForFirestore(firestorePatch));

    const updated = await this.get(id);
    if (!updated) throw new Error('Запчасть не найдена после обновления');
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Фото хранится в самом документе — удаляем только документ.
    // Никаких обращений к Storage, поэтому CORS/права Storage
    // больше не могут заблокировать удаление.
    await deleteDoc(doc(db, COLLECTION, id));
  }

  async bulkCreate(items: CreateComponentInput[]): Promise<Component[]> {
    const created: Component[] = [];
    for (const item of items) created.push(await this.create(item));
    return created;
  }
}