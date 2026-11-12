import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { GuestRoute } from '@/components/GuestRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { ComponentPage } from '@/pages/ComponentPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { MyRequestsPage } from '@/pages/MyRequestsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminRequestsPage } from '@/pages/admin/AdminRequestsPage';
import { AdminComponentsPage } from '@/pages/admin/AdminComponentsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** Маршруты приложения. Публичны только /login и /register, остальное — за ProtectedRoute. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/catalog" replace /> },
      {
        path: 'catalog',
        element: (
          <ProtectedRoute>
            <CatalogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'components/:id',
        element: (
          <ProtectedRoute>
            <ComponentPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-requests',
        element: (
          <ProtectedRoute>
            <MyRequestsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute allowRoles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/requests',
        element: (
          <ProtectedRoute allowRoles={['moderator', 'admin']}>
            <AdminRequestsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/components',
        element: (
          <ProtectedRoute allowRoles={['moderator', 'admin']}>
            <AdminComponentsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: 'login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: 'register',
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
]);
