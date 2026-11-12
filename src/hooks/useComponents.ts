import { useComponentsStore } from '@/store/componentsStore';

/** Обёртка над componentsStore для страниц (каталог, карточка, админ-раздел). */
export function useComponents() {
  const {
    items,
    total,
    page,
    pageSize,
    search,
    status,
    loading,
    error,
    fetchPage,
    getById,
    create,
    update,
    remove,
    importItems,
  } = useComponentsStore();

  return { items, total, page, pageSize, search, status, loading, error, fetchPage, getById, create, update, remove, importItems };
}
