import { create } from 'zustand';
import type { LoginInput, RegisterInput, UpdateProfileInput, User } from '@/types';
import { repositories, initStorage } from '@/services';
import { useUiStore } from './uiStore';
import { logger } from '@/utils/logger';
import { toErrorMessage } from '@/utils/errors';

export type AuthStatus = 'idle' | 'loading' | 'ready';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  init: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: UpdateProfileInput) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  /** Перечитать пользователя из репозитория (после смены роли и т.п.). */
  reloadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: 'idle',
  error: null,

  init: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      initStorage();
      const user = repositories.auth.getCurrentUser();
      set({ user, status: 'ready' });
    } catch (error) {
      logger.error('authStore', 'Ошибка инициализации хранилища', error);
      set({ user: null, status: 'ready' });
    }
  },

  login: async (input) => {
    set({ error: null, status: 'loading' });
    try {
      const user = await repositories.auth.login(input);
      set({ user, status: 'ready' });
      useUiStore.getState().showSnackbar(`Добро пожаловать, ${user.name}!`);
    } catch (error) {
      const message = toErrorMessage(error);
      set({ error: message, status: 'ready' });
      logger.warn('authStore', 'Ошибка входа', error);
      throw error;
    }
  },

  register: async (input) => {
    set({ error: null, status: 'loading' });
    try {
      const user = await repositories.auth.register(input);
      set({ user, status: 'ready' });
      useUiStore.getState().showSnackbar('Регистрация выполнена. Добро пожаловать!');
    } catch (error) {
      const message = toErrorMessage(error);
      set({ error: message, status: 'ready' });
      logger.warn('authStore', 'Ошибка регистрации', error);
      throw error;
    }
  },

  logout: async () => {
    await repositories.auth.logout();
    set({ user: null, error: null });
    useUiStore.getState().showSnackbar('Вы вышли из аккаунта', 'info');
  },

  updateProfile: async (patch) => {
    const current = get().user;
    if (!current) throw new Error('Пользователь не авторизован');
    const updated = await repositories.auth.updateProfile(current.id, patch);
    set({ user: updated });
    useUiStore.getState().showSnackbar('Профиль обновлён');
  },

  changePassword: async (oldPassword, newPassword) => {
    const current = get().user;
    if (!current) throw new Error('Пользователь не авторизован');
    await repositories.auth.changePassword(current.id, oldPassword, newPassword);
    useUiStore.getState().showSnackbar('Пароль изменён');
  },

  /**
   * Перечитывает текущего пользователя. Нужен, если роль изменили
   * извне (например, другой админ) и нужно обновить UI без перезагрузки.
   * Также используется после смены собственной роли.
   */
  reloadUser: async () => {
    const current = get().user;
    if (!current) return;
    try {
      const users = await repositories.auth.listUsers();
      const fresh = users.find((u) => u.id === current.id);
      if (fresh) set({ user: fresh });
    } catch (error) {
      logger.warn('authStore', 'Не удалось перечитать пользователя', error);
    }
  },

  clearError: () => set({ error: null }),
}));