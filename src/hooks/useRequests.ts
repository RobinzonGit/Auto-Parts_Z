import { useRequestsStore } from '@/store/requestsStore';

/** Обёртка над requestsStore (мои запросы и админ-раздел запросов). */
export function useRequests() {
  const { items, loading, error, fetch, create, updateStatus, remove } = useRequestsStore();
  return { items, loading, error, fetch, create, updateStatus, remove };
}
