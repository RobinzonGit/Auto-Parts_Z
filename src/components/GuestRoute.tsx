import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from './LoadingScreen';

interface GuestRouteProps {
  children: ReactNode;
}

/** Маршрут для гостей: авторизованных возвращает в каталог. */
export function GuestRoute({ children }: GuestRouteProps) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status !== 'ready') {
    return <LoadingScreen />;
  }
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/catalog';
    return <Navigate to={from} replace />;
  }
  return <>{children}</>;
}
