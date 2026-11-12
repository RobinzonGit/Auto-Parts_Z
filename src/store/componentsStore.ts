import { create } from 'zustand';
import type { Component, ComponentStatus, CreateComponentInput, UpdateComponentInput } from '@/types';
import { repositories } from '@/services';
import { useUiStore } from './uiStore';
import { logger } from '@/utils/logger';
import { toErrorMessage } from '@/utils/errors';

export type StatusFilter = ComponentStatus | 'all';

interface ComponentsState {
  items: Component[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: StatusFilter;
  loading: boolean;
  error: string | null;
  /** Загружает страницу списка с учётом переданных (или сохранённых) параметров. */
  fetchPage: (params?: { page?: number; search?: string; status?: StatusFilter; pageSize?: number }) => Promise<void>;
  getById: (id: string) => Promise<Component | null>;
  create: (input: CreateComponentInput) => Promise<void>;
  update: (id: string, patch: UpdateComponentInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  importItems: (rows: CreateComponentInput[]) => Promise<number>;
}

/** Состояние каталога запчастей: список, фильтры, CRUD и импорт. */
export const useComponentsStore = create<ComponentsState>()((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  search: '',
  status: 'all',
  loading: false,
  error: null,

  fetchPage: async (params) => {
    const { page, pageSize, search, status } = get();
    const nextPage = params?.page ?? page;
    const nextSearch = params?.search ?? search;
    const nextStatus = params?.status ?? status;
    const nextPageSize = params?.pageSize ?? pageSize;
    set({ loading: true, error: null, page: nextPage, search: nextSearch, status: nextStatus, pageSize: nextPageSize });
    try {
      const result = await repositories.components.list({
        page: nextPage,
        pageSize: nextPageSize,
        search: nextSearch || undefined,
        status: nextStatus === 'all' ? undefined : nextStatus,
      });
      set({ items: result.items, total: result.total });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ error: message });
      logger.error('componentsStore', 'Ошибка загрузки списка', error);
      useUiStore.getState().showSnackbar(message, 'error');
    } finally {
      set({ loading: false });
    }
  },

  getById: async (id) => {
    try {
      return await repositories.components.get(id);
    } catch (error) {
      logger.error('componentsStore', 'Ошибка загрузки запчасти', error);
      return null;
    }
  },

  create: async (input) => {
    try {
      await repositories.components.create(input);
      useUiStore.getState().showSnackbar('Запчасть добавлена');
      await get().fetchPage({ page: 1 });
    } catch (error) {
      const message = toErrorMessage(error);
      logger.warn('componentsStore', 'Ошибка создания', error);
      useUiStore.getState().showSnackbar(message, 'error');
      throw error;
    }
  },

  update: async (id, patch) => {
    try {
      await repositories.components.update(id, patch);
      useUiStore.getState().showSnackbar('Изменения сохранены');
      await get().fetchPage();
    } catch (error) {
      const message = toErrorMessage(error);
      logger.warn('componentsStore', 'Ошибка обновления', error);
      useUiStore.getState().showSnackbar(message, 'error');
      throw error;
    }
  },

  remove: async (id) => {
    try {
      await repositories.components.delete(id);
      useUiStore.getState().showSnackbar('Запчасть удалена');
      await get().fetchPage();
    } catch (error) {
      const message = toErrorMessage(error);
      logger.warn('componentsStore', 'Ошибка удаления', error);
      useUiStore.getState().showSnackbar(message, 'error');
      throw error;
    }
  },

  importItems: async (rows) => {
    try {
      const created = await repositories.components.bulkCreate(rows);
      useUiStore.getState().showSnackbar(`Импортировано позиций: ${created.length}`);
      await get().fetchPage({ page: 1 });
      return created.length;
    } catch (error) {
      const message = toErrorMessage(error);
      logger.warn('componentsStore', 'Ошибка импорта', error);
      useUiStore.getState().showSnackbar(message, 'error');
      throw error;
    }
  },
}));
