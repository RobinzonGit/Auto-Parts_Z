import { useEffect, useState } from 'react';
import { Box, Button, IconButton, MenuItem, Stack, TextField } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { PurchaseRequest, RequestStatus } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLOR } from '@/utils/labels';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { StatusChip } from '@/components/StatusChip';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const STATUS_VALUES: RequestStatus[] = ['new', 'in_progress', 'completed', 'cancelled'];

/** Администрирование: все запросы на закупку (moderator/admin). */
export function AdminRequestsPage() {
  const { isAdmin } = useAuth();
  const { items, loading, fetch, updateStatus, remove } = useRequests();
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequest | null>(null);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const filtered = statusFilter === 'all' ? items : items.filter((r) => r.status === statusFilter);

  const columns: DataTableColumn<PurchaseRequest>[] = [
    { id: 'createdAt', label: 'Дата', render: (row) => formatDateTime(row.createdAt) },
    {
      id: 'userName',
      label: 'Пользователь',
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{row.userName}</Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
            {row.componentName} · арт. {row.componentArticle}
          </Box>
        </Box>
      ),
    },
    { id: 'quantity', label: 'Кол-во', align: 'right' },
    { id: 'comment', label: 'Комментарий', render: (row) => row.comment ?? '—' },
    {
      id: 'status',
      label: 'Статус',
      render: (row) => (
        <TextField
          size="small"
          select
          value={row.status}
          onChange={(e) => void updateStatus(row.id, e.target.value as RequestStatus)}
          sx={{ minWidth: 160 }}
        >
          {STATUS_VALUES.map((status) => (
            <MenuItem key={status} value={status}>
              {REQUEST_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      id: 'actions',
      label: 'Действия',
      align: 'right',
      render: (row) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
          <StatusChip label={REQUEST_STATUS_LABELS[row.status]} color={REQUEST_STATUS_COLOR[row.status]} />
          {isAdmin && (
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)} aria-label="Удалить запрос">
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Запросы на закупку" subtitle={`Всего: ${items.length}. Смена статусов — модератор и администратор, удаление — администратор.`} />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          select
          label="Статус"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">Все статусы</MenuItem>
          {STATUS_VALUES.map((status) => (
            <MenuItem key={status} value={status}>
              {REQUEST_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </TextField>
        <Button onClick={() => void fetch()}>Обновить</Button>
      </Stack>

      <DataTable columns={columns} rows={filtered} rowKey={(row) => row.id} loading={loading} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteTarget(null);
          try {
            await remove(deleteTarget.id);
          } catch {
            /* ошибка в снекбаре */
          }
        }}
        title="Удалить запрос?"
        message={`Запрос «${deleteTarget?.componentName ?? ''}» от ${deleteTarget?.userName ?? ''} будет удалён без возможности восстановления.`}
        confirmText="Удалить"
        danger
      />
    </>
  );
}
