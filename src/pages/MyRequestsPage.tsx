import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import type { PurchaseRequest, RequestStatus } from '@/types';
import { useRequests } from '@/hooks/useRequests';
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLOR } from '@/utils/labels';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { StatusChip } from '@/components/StatusChip';
import { EmptyState } from '@/components/EmptyState';

const STATUS_VALUES: RequestStatus[] = ['new', 'in_progress', 'completed', 'cancelled'];

/** Мои запросы на закупку (для роли user — только собственные). */
export function MyRequestsPage() {
  const { items, loading, fetch, updateStatus } = useRequests();
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const filtered = statusFilter === 'all' ? items : items.filter((r) => r.status === statusFilter);

  const columns: DataTableColumn<PurchaseRequest>[] = [
    { id: 'createdAt', label: 'Дата', render: (row) => formatDateTime(row.createdAt) },
    {
      id: 'componentName',
      label: 'Запчасть',
      render: (row) => (
        <Box>
          <Box component={RouterLink} to={`/components/${row.componentId}`} sx={{ fontWeight: 600, textDecoration: 'none', color: 'primary.main' }}>
            {row.componentName}
          </Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>арт. {row.componentArticle}</Box>
        </Box>
      ),
    },
    { id: 'quantity', label: 'Кол-во', align: 'right' },
    { id: 'comment', label: 'Комментарий', render: (row) => row.comment ?? '—' },
    {
      id: 'status',
      label: 'Статус',
      render: (row) => <StatusChip label={REQUEST_STATUS_LABELS[row.status]} color={REQUEST_STATUS_COLOR[row.status]} />,
    },
    {
      id: 'actions',
      label: 'Действия',
      align: 'right',
      render: (row) =>
        row.status === 'new' ? (
          <Button
            size="small"
            color="error"
            onClick={() => {
              void updateStatus(row.id, 'cancelled');
            }}
          >
            Отменить
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Мои запросы на закупку" subtitle={`Всего запросов: ${items.length}`} />

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
      </Stack>

      {filtered.length === 0 && !loading ? (
        <EmptyState
          title="Запросов пока нет"
          description="Найдите нужную запчасть в каталоге и нажмите «Запросить закупку»."
          action={
            <Button component={RouterLink} to="/catalog" variant="contained" sx={{ mt: 2 }}>
              В каталог
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(row) => row.id} loading={loading} />
      )}
    </>
  );
}
