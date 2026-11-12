import { create } from 'zustand';
import type { CreateRequestInput, PurchaseRequest, RequestStatus } from '@/types';
import { repositories } from '@/services';
import { useUiStore } from './uiStore';
import { logger } from '@/utils/logger';
import { toErrorMessage } from '@/utils/errors';

interface RequestsState {
  items: PurchaseRequest[];
  loading: boolean;
  error: string | null;
  /** Загружает запросы (для роли user репозиторий сам ограничивает список своими). */
  fetch: () => Promise<void>;
  create: (input: CreateRequestInput) => Promise<void>;
  updateStatus: (id: string, status: RequestStatus) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Состояние запросов на закупку. */
export const useRequestsStore = create<RequestsState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const items = await repositories.requests.list();
      set({ items });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ error: message });
      logger.error('requestsStore', 'Ошибка загрузки запросов', error);
    } finally {
      set({ loading: false });
    }
  },

  create: async (input) => {
    try {
      await repositories.requests.create(input);
      useUiStore.getState().showSnackbar('Запрос на закупку отправлен');
      await get().fetch();
    } catch (error) {
      const message = toErrorMessage(error);
      logger.warn('requestsStore', 'Ошибка создания запроса', error);
      useUiStore.getState().showSnackbar(message, 'error');
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    try {
      await repositories.requests.updateStatus(id, status);
      useUiStore.getState().showSnackbar('Статус запроса обновлён');
      await get().fetch();
    } catch (error) {
      const message = toErrorMessage(error);
      logger.warn('requestsStore', 'Ошибка смены статуса', error);
      useUiStore.getState().showSnackbar(message, 'error');
      throw error;
    }
  },

  remove: async (id) => {
    try {
      await repositories.requests.delete(id);
      useUiStore.getState().showSnackbar('Запрос удалён');
      await get().fetch();
    } catch (error) {
      const message = toErrorMessage(error);
      logger.warn('requestsStore', 'Ошибка удаления запроса', error);
      useUiStore.getState().showSnackbar(message, 'error');
      throw error;
    }
  },
}));
