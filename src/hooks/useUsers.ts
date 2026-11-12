import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/types';
import { repositories } from '@/services';
import { logger } from '@/utils/logger';

/** Список пользователей для админ-раздела (чтение через AuthRepository). */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await repositories.auth.listUsers();
      setUsers(list);
    } catch (err) {
      logger.error('useUsers', 'Не удалось загрузить пользователей', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { users, loading, error, reload };
}
