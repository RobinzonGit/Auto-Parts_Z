import { AppError } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Обёртка над IndexedDB для хранения фото запчастей (data URL).
 * Структурированные данные лежат в localStorage, «тяжёлые» фото — в IndexedDB,
 * чтобы не упереться в квоту localStorage (~5 МБ).
 */

const DB_NAME = 'autoparts-photos';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

/** Открывает (и при необходимости создаёт) базу фото. */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть IndexedDB'));
  });
}

/** Выполняет операцию с хранилищем фото в отдельной транзакции. */
async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ошибка IndexedDB'));
    tx.oncomplete = () => db.close();
  });
}

/** Возвращает фото (data URL) по id запчасти или undefined. */
export async function getPhoto(id: string): Promise<string | undefined> {
  try {
    const value = await withStore<string | undefined>('readonly', (store) => store.get(id) as IDBRequest<string | undefined>);
    return typeof value === 'string' ? value : undefined;
  } catch (error) {
    logger.warn('photoStore', 'Не удалось прочитать фото из IndexedDB', error);
    return undefined;
  }
}

/** Сохраняет фото (data URL) по id запчасти. */
export async function putPhoto(id: string, dataUrl: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(dataUrl, id));
  } catch (error) {
    logger.error('photoStore', 'Не удалось сохранить фото в IndexedDB', error);
    throw new AppError('STORAGE', 'Не удалось сохранить фото в браузере.');
  }
}

/** Удаляет фото по id запчасти. */
export async function deletePhoto(id: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(id));
  } catch (error) {
    logger.warn('photoStore', 'Не удалось удалить фото из IndexedDB', error);
  }
}
