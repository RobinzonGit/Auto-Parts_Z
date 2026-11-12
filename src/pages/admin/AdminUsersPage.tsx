import { Box, Chip, IconButton, MenuItem, TextField } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { Role, User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useUiStore } from '@/store/uiStore';
import { repositories } from '@/services';
import { formatDate } from '@/utils/format';
import { ROLE_LABELS } from '@/utils/labels';
import { logger } from '@/utils/logger';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState } from 'react';

const ROLES: Role[] = ['user', 'moderator', 'admin'];

/** Администрирование: пользователи, роли и удаление аккаунтов (только admin). */
export function AdminUsersPage() {
  const { users, loading, reload } = useUsers();
  const { user: currentUser } = useAuth();
  const showSnackbar = useUiStore((s) => s.showSnackbar);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const handleRoleChange = async (target: User, role: Role): Promise<void> => {
    try {
      await repositories.auth.updateRole(target.id, role);
      showSnackbar(`Роль пользователя ${target.name} изменена на «${ROLE_LABELS[role]}»`);
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось изменить роль.';
      showSnackbar(message, 'error');
      logger.warn('adminUsers', 'Ошибка смены роли', error);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await repositories.auth.deleteUser(deleteTarget.id);
      showSnackbar(`Пользователь ${deleteTarget.name} удалён`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить пользователя.';
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
          {currentUser?.id === row.id && <Chip size="small" label="Вы" color="info" />}
        </Box>
      ),
    },
    { id: 'email', label: 'Email' },
    {
      id: 'role',
      label: 'Роль',
      render: (row) => (
        <TextField
          size="small"
          select
          value={row.role}
          onChange={(e) => void handleRoleChange(row, e.target.value as Role)}
          disabled={currentUser?.id === row.id}
          sx={{ minWidth: 160 }}
          helperText={currentUser?.id === row.id ? 'Собственную роль менять нельзя' : undefined}
        >
          {ROLES.map((role) => (
            <MenuItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </MenuItem>
          ))}
        </TextField>
      ),
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
      <PageHeader title="Пользователи" subtitle={`Всего: ${users.length}. Изменение ролей и удаление — только администратор.`} />
      <DataTable columns={columns} rows={users} rowKey={(row) => row.id} loading={loading} />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Удалить пользователя?"
        message={`Аккаунт «${deleteTarget?.name ?? ''}» (${deleteTarget?.email ?? ''}) будет удалён без возможности восстановления.`}
        confirmText="Удалить"
        danger
      />
    </>
  );
}
