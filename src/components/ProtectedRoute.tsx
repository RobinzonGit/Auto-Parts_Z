import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  /** Разрешённые роли; undefined — любая авторизованная. */
  allowRoles?: Role[];
  children: ReactNode;
}

/**
 * Защита маршрутов (первый уровень «defense in depth», второй — в репозиториях).
 * Неавторизованных отправляет на /login, при нехватке роли показывает 403.
 */
export function ProtectedRoute({ allowRoles, children }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status !== 'ready') {
    return <LoadingScreen />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allowRoles && !allowRoles.includes(user.role)) {
    return <AccessDeniedPage />;
  }
  return <>{children}</>;
}
