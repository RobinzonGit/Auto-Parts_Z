import { useState } from 'react';
import { Alert, Box, Chip, IconButton, MenuItem, TextField } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { Role, User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { repositories } from '@/services';
import { formatDate } from '@/utils/format';
import { ROLE_LABELS } from '@/utils/labels';
import { logger } from '@/utils/logger';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const ROLES: Role[] = ['user', 'moderator', 'admin'];

/** Администрирование: пользователи, роли и удаление аккаунтов (только admin). */
export function AdminUsersPage() {
  const { users, loading, reload } = useUsers();
  const { user: currentUser } = useAuth();
  const showSnackbar = useUiStore((s) => s.showSnackbar);
  const reloadCurrentUser = useAuthStore((s) => s.reloadUser);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [changingUserId, setChangingUserId] = useState<string | null>(null);

  const handleRoleChange = async (target: User, role: Role): Promise<void> => {
    if (target.role === role) return;
    setChangingUserId(target.id);
    try {
      // updateRole в FirebaseAuthRepository делает updateDoc(doc(db, 'users', uid), { role })
      await repositories.auth.updateRole(target.id, role);
      showSnackbar(
        `Роль пользователя ${target.name} изменена на «${ROLE_LABELS[role]}»`,
      );

      // Если админ по какой-то причине изменил себе роль (кнопка disabled,
      // но на случай race condition), обновляем и свой профиль.
      if (currentUser?.id === target.id) {
        await reloadCurrentUser();
      }

      await reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось изменить роль.';
      showSnackbar(message, 'error');
      logger.warn('adminUsers', 'Ошибка смены роли', error);
    } finally {
      setChangingUserId(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      // deleteUser удаляет документ users/{uid} из Firestore.
      // Пользователь в Firebase Auth остаётся — для полного удаления
      // нужна Cloud Function с Admin SDK. Об этом честно сообщаем.
      await repositories.auth.deleteUser(deleteTarget.id);
      showSnackbar(
        `Профиль ${deleteTarget.name} удалён. Аккаунт в Firebase Auth остаётся — для полного удаления нужна Cloud Function.`,
        'warning',
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось удалить пользователя.';
      showSnackbar(message, 'error');
    } finally {
      setDeleteTarget(null);
      await reload();
    }
  };

  const columns: DataTableColumn<User>[] = [
    {
      id: 'name',
      label: 'Пользователь',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {row.name}
          {currentUser?.id === row.id && (
            <Chip size="small" label="Вы" color="info" />
          )}
        </Box>
      ),
    },
    { id: 'email', label: 'Email' },
    {
      id: 'role',
      label: 'Роль',
      render: (row) => {
        const isSelf = currentUser?.id === row.id;
        return (
          <TextField
            size="small"
            select
            value={row.role}
            onChange={(e) => void handleRoleChange(row, e.target.value as Role)}
            disabled={isSelf || changingUserId === row.id}
            sx={{ minWidth: 160 }}
            helperText={
              isSelf
                ? 'Собственную роль менять нельзя'
                : changingUserId === row.id
                  ? 'Сохранение...'
                  : undefined
            }
          >
            {ROLES.map((role) => (
              <MenuItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </MenuItem>
            ))}
          </TextField>
        );
      },
    },
    { id: 'createdAt', label: 'Создан', render: (row) => formatDate(row.createdAt) },
    {
      id: 'actions',
      label: 'Действия',
      align: 'right',
      render: (row) => (
        <IconButton
          size="small"
          color="error"
          disabled={currentUser?.id === row.id}
          onClick={() => setDeleteTarget(row)}
          aria-label="Удалить пользователя"
        >
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Пользователи"
        subtitle={`Всего: ${users.length}. Изменение ролей и удаление — только администратор.`}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Роли хранятся в Firestore (поле <code>role</code> в коллекции{' '}
        <code>users</code>). Изменения вступают в силу после перезагрузки
        страницы у пользователя, чью роль изменили.
      </Alert>

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(row) => row.id}
        loading={loading}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Удалить пользователя?"
        message={`Профиль «${deleteTarget?.name ?? ''}» (${deleteTarget?.email ?? ''}) будет удалён из Firestore. Запись в Firebase Auth останется — для её удаления нужна Cloud Function.`}
        confirmText="Удалить профиль"
        danger
      />
    </>
  );
}