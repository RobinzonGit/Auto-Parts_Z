import { useMemo } from 'react';
import type { Role, User } from '@/types';
import { useAuthStore } from '@/store/authStore';

/**
 * Удобная обёртка над authStore: флаги ролей, используемые в UI.
 * Пример: const { isAdmin, user } = useAuth();
 */
export function useAuth(): {
  user: User | null;
  isAuthenticated: boolean;
  role: Role | null;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
} {
  const user = useAuthStore((s) => s.user);
  return useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      role: user?.role ?? null,
      isAdmin: user?.role === 'admin',
      isModerator: user?.role === 'moderator',
      isStaff: user?.role === 'admin' || user?.role === 'moderator',
    }),
    [user],
  );
}

/** Проверка наличия роли у пользователя (для условного рендера). */
export function hasRole(user: User | null, roles: Role[]): boolean {
  return user !== null && roles.includes(user.role);
}
