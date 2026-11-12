import { AppError } from '@/types';
import type { User } from '@/types/user';
import type { Component } from '@/types/component';
import type { PurchaseRequest } from '@/types/request';
import { logger } from '@/utils/logger';

/**
 * Локальная «база данных» на localStorage с контролем версии схемы.
 * Фото в неё не попадают (см. photoStore) — хранится только признак hasPhoto.
 */

/** Версия схемы. При изменении структуры данных увеличьте и добавьте миграцию. */
export const SCHEMA_VERSION = 1;

const DB_KEY = 'autoparts.db';
const SESSION_KEY = 'autoparts.session';

/** Пользователь в хранилище: публичный профиль + bcrypt-хэш пароля. */
export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: User['role'];
  createdAt: string;
  updatedAt: string;
  passwordHash: string;
}

/** Запчасть в хранилище: без фото, но с признаком его наличия в IndexedDB. */
export type StoredComponent = Omit<Component, 'photo'> & { hasPhoto: boolean };

/** Текущая сессия браузера. */
export interface Session {
  sessionId: string;
  userId: string;
  createdAt: string;
}

export interface DatabaseShape {
  schemaVersion: number;
  users: StoredUser[];
  sessions: Session[];
  components: StoredComponent[];
  requests: PurchaseRequest[];
}

function createEmptyDb(): DatabaseShape {
  return { schemaVersion: SCHEMA_VERSION, users: [], sessions: [], components: [], requests: [] };
}

let cache: DatabaseShape | null = null;

/** Загружает БД из localStorage (с кэшем в памяти). При несовместимой версии — сброс. */
export function loadDb(): DatabaseShape {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      cache = createEmptyDb();
      return cache;
    }
    const parsed = JSON.parse(raw) as DatabaseShape;
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      logger.warn('localDb', `Найдена несовместимая версия схемы (${parsed.schemaVersion}). Данные будут сброшены.`);
      localStorage.removeItem(DB_KEY);
      cache = createEmptyDb();
      return cache;
    }
    cache = {
      schemaVersion: SCHEMA_VERSION,
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      components: parsed.components ?? [],
      requests: parsed.requests ?? [],
    };
    return cache;
  } catch (error) {
    logger.error('localDb', 'Не удалось прочитать базу данных, создаём новую', error);
    cache = createEmptyDb();
    return cache;
  }
}

/** Сохраняет БД в localStorage. */
export function saveDb(): void {
  if (!cache) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch (error) {
    logger.error('localDb', 'Ошибка записи в localStorage', error);
    throw new AppError('STORAGE', 'Не удалось сохранить данные: переполнено хранилище браузера.');
  }
}

/** Читает текущую сессию браузера. */
export function getCurrentSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/** Перезаписывает текущую сессию (null — выйти). */
export function setCurrentSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    logger.warn('localDb', 'Не удалось обновить сессию', error);
  }
}

/** Возвращает публичный профиль пользователя текущей сессии (без хэша пароля). */
export function getSessionUser(): User | null {
  const session = getCurrentSession();
  if (!session) return null;
  const user = loadDb().users.find((u) => u.id === session.userId);
  if (!user) return null;
  const { passwordHash: _hash, ...publicUser } = user;
  return publicUser;
}

/** Полностью сбрасывает данные приложения (для отладки). */
export function resetDatabase(): void {
  cache = null;
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
}
