import type { LoginInput, RegisterInput, Role, UpdateProfileInput, User } from '@/types/user';

/**
 * Репозиторий аутентификации и пользователей.
 * Все методы асинхронные, чтобы при переходе на Firebase не менять слой UI.
 */
export interface AuthRepository {
  register(data: RegisterInput): Promise<User>;
  login(data: LoginInput): Promise<User>;
  logout(): Promise<void>;
  /** Синхронное чтение текущей сессии (быстрое восстановление UI при загрузке). */
  getCurrentUser(): User | null;
  updateProfile(userId: string, patch: UpdateProfileInput): Promise<User>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
  listUsers(): Promise<User[]>;
  updateRole(userId: string, role: Role): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}
