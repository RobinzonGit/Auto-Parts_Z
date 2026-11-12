import { AppError } from '@/types';
import type { LoginInput, RegisterInput, Role, UpdateProfileInput, User } from '@/types/user';
import type { AuthRepository } from './authRepository';
import { getCurrentSession, getSessionUser, loadDb, saveDb, setCurrentSession, type Session, type StoredUser } from '@/services/storage/localDb';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * Локальная реализация AuthRepository на localStorage.
 * Пароли хранятся только в виде bcrypt-хэша, в открытом виде — никогда.
 */

const BCRYPT_ROUNDS = 10;

function toPublicUser(user: StoredUser): User {
  const { passwordHash: _hash, ...publicUser } = user;
  return publicUser;
}

/** Проверка прав текущей сессии; возвращает пользователя. */
function requireRole(roles: Role[]): User {
  const user = getSessionUser();
  if (!user) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');
  if (!roles.includes(user.role)) throw new AppError('FORBIDDEN', 'Недостаточно прав для этого действия.');
  return user;
}

/** Создаёт новую сессию и записывает её текущей для браузера. */
function startSession(db: ReturnType<typeof loadDb>, userId: string): Session {
  const session: Session = { sessionId: uuidv4(), userId, createdAt: new Date().toISOString() };
  db.sessions.push(session);
  setCurrentSession(session);
  return session;
}

export class LocalAuthRepository implements AuthRepository {
  async register(data: RegisterInput): Promise<User> {
    const db = loadDb();
    const email = data.email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      throw new AppError('CONFLICT', 'Пользователь с таким email уже зарегистрирован.');
    }
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: uuidv4(),
      email,
      name: data.name.trim(),
      role: 'user',
      createdAt: now,
      updatedAt: now,
      passwordHash: bcrypt.hashSync(data.password, BCRYPT_ROUNDS),
    };
    db.users.push(user);
    startSession(db, user.id);
    saveDb();
    logger.info('auth', 'Зарегистрирован новый пользователь', { userId: user.id, email });
    return toPublicUser(user);
  }

  async login(data: LoginInput): Promise<User> {
    const db = loadDb();
    const email = data.email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !bcrypt.compareSync(data.password, user.passwordHash)) {
      // Единое сообщение — не раскрываем, существует ли аккаунт.
      throw new AppError('UNAUTHORIZED', 'Неверный email или пароль.');
    }
    startSession(db, user.id);
    saveDb();
    logger.info('auth', 'Вход выполнен', { userId: user.id });
    return toPublicUser(user);
  }

  async logout(): Promise<void> {
    const session = getCurrentSession();
    if (!session) return;
    const db = loadDb();
    db.sessions = db.sessions.filter((s) => s.sessionId !== session.sessionId);
    setCurrentSession(null);
    saveDb();
    logger.info('auth', 'Выход выполнен');
  }

  getCurrentUser(): User | null {
    return getSessionUser();
  }

  async updateProfile(userId: string, patch: UpdateProfileInput): Promise<User> {
    const me = getSessionUser();
    if (!me) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');
    if (me.id !== userId && me.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Можно редактировать только собственный профиль.');
    }
    const user = loadDb().users.find((u) => u.id === userId);
    if (!user) throw new AppError('NOT_FOUND', 'Пользователь не найден.');
    user.name = patch.name.trim();
    user.updatedAt = new Date().toISOString();
    saveDb();
    return toPublicUser(user);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const me = getSessionUser();
    if (!me) throw new AppError('UNAUTHORIZED', 'Требуется авторизация.');
    if (me.id !== userId) throw new AppError('FORBIDDEN', 'Можно менять только собственный пароль.');
    const user = loadDb().users.find((u) => u.id === userId);
    if (!user) throw new AppError('NOT_FOUND', 'Пользователь не найден.');
    if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
      throw new AppError('VALIDATION', 'Неверный текущий пароль.');
    }
    user.passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
    user.updatedAt = new Date().toISOString();
    saveDb();
    logger.info('auth', 'Пароль изменён', { userId });
  }

  async listUsers(): Promise<User[]> {
    requireRole(['moderator', 'admin']);
    return loadDb().users.map(toPublicUser);
  }

  async updateRole(userId: string, role: Role): Promise<void> {
    const me = requireRole(['admin']);
    if (userId === me.id) {
      throw new AppError('VALIDATION', 'Нельзя изменить собственную роль.');
    }
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new AppError('NOT_FOUND', 'Пользователь не найден.');
    if (user.role === 'admin' && role !== 'admin') {
      const admins = db.users.filter((u) => u.role === 'admin');
      if (admins.length <= 1) {
        throw new AppError('VALIDATION', 'Нельзя понизить последнего администратора.');
      }
    }
    user.role = role;
    user.updatedAt = new Date().toISOString();
    saveDb();
    logger.info('auth', 'Роль изменена', { userId, role });
  }

  async deleteUser(userId: string): Promise<void> {
    const me = requireRole(['admin']);
    if (userId === me.id) {
      throw new AppError('VALIDATION', 'Нельзя удалить собственный аккаунт.');
    }
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new AppError('NOT_FOUND', 'Пользователь не найден.');
    if (user.role === 'admin' && db.users.filter((u) => u.role === 'admin').length <= 1) {
      throw new AppError('VALIDATION', 'Нельзя удалить последнего администратора.');
    }
    db.users = db.users.filter((u) => u.id !== userId);
    db.sessions = db.sessions.filter((s) => s.userId !== userId);
    saveDb();
    logger.info('auth', 'Пользователь удалён', { userId });
  }
}
