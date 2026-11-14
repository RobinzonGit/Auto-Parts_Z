import { toIso, tryDeletePhoto, uploadPhoto, cleanForFirestore } from './helpers';
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
//import { toIso, tryDeletePhoto, uploadPhoto } from './helpers';
import type { ComponentRepository } from '../repositories/componentRepository';
import type {
  Component,
  ComponentListQuery,
  CreateComponentInput,
  UpdateComponentInput,
} from '@/types/component';
import type { Paginated } from '@/types/common';

const COLLECTION = 'components';

function photoPath(id: string): string {
  return `components/${id}/photo`;
}

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
    photoUrl: (data.photoUrl as string | null) ?? null,
    hasPhoto: Boolean(data.hasPhoto ?? data.photoUrl),
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

    const photo = (data as { photo?: File | Blob | string | null }).photo;

    let photoUrl: string | null = null;
    if (photo) {
      photoUrl = await uploadPhoto(photoPath(newRef.id), photo);
    }

    const payload: Record<string, unknown> = {
      ...data,
      photoUrl,
      hasPhoto: Boolean(photoUrl),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    delete payload.photo;

    //await setDoc(newRef, payload);
    await setDoc(newRef, cleanForFirestore(payload));

    // Дочитываем — получим серверный Timestamp → ISO-строка в маппинге.
    const created = await this.get(newRef.id);
    if (!created) throw new Error('Не удалось прочитать созданную запчасть');
    return created;
  }

  async update(id: string, patch: UpdateComponentInput): Promise<Component> {
    const ref = doc(db, COLLECTION, id);

    const p = patch as unknown as {
      photo?: File | Blob | string | null;
      [k: string]: unknown;
    };

    const firestorePatch: Record<string, unknown> = {
      ...patch,
      updatedAt: serverTimestamp(),
    };

    if ('photo' in p) {
      if (p.photo === null) {
        await tryDeletePhoto(photoPath(id));
        firestorePatch.photoUrl = null;
        firestorePatch.hasPhoto = false;
      } else if (p.photo) {
        firestorePatch.photoUrl = await uploadPhoto(photoPath(id), p.photo);
        firestorePatch.hasPhoto = true;
      }
    }
    delete firestorePatch.photo;

    //await updateDoc(ref, firestorePatch);
    await updateDoc(ref, cleanForFirestore(firestorePatch));

    const updated = await this.get(id);
    if (!updated) throw new Error('Запчасть не найдена после обновления');
    return updated;
  }

  async delete(id: string): Promise<void> {
    await tryDeletePhoto(photoPath(id));
    await deleteDoc(doc(db, COLLECTION, id));
  }

  async bulkCreate(items: CreateComponentInput[]): Promise<Component[]> {
    const created: Component[] = [];
    for (const item of items) created.push(await this.create(item));
    return created;
  }
}