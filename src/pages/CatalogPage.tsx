import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import type { Component } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useComponents } from '@/hooks/useComponents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { COMPONENT_STATUS_LABELS, COMPONENT_STATUS_COLOR } from '@/utils/labels';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { StatusChip } from '@/components/StatusChip';
import { PriceText } from '@/components/PriceText';
import { EmptyState } from '@/components/EmptyState';
import { RequestDialog } from '@/components/request/RequestDialog';
import { WebSearchButton } from '@/components/web-search/WebSearchButton';

/** Каталог запчастей: поиск, фильтр статуса, запросы на закупку. */
export function CatalogPage() {
  const { isStaff } = useAuth();
  const { items, total, page, pageSize, loading, fetchPage } = useComponents();

  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<'all' | 'active' | 'archived' | 'out_of_stock'>('all');
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [requestTarget, setRequestTarget] = useState<Component | null>(null);

  useEffect(() => {
    void fetchPage({ page: 1, search: debouncedSearch, status: statusInput });
  }, [debouncedSearch, statusInput, fetchPage]);

  const columns: DataTableColumn<Component>[] = [
    {
      id: 'photo',
      label: 'Фото',
      width: 72,
      render: (row) =>
        row.photo ? (
          <Avatar src={row.photo} variant="rounded" sx={{ width: 44, height: 44 }} />
        ) : (
          <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: 'action.hover' }}>
            <ImageOutlinedIcon color="disabled" />
          </Avatar>
        ),
    },
    {
      id: 'name',
      label: 'Наименование',
      render: (row) => (
        <Box>
          <Box component={RouterLink} to={`/components/${row.id}`} sx={{ fontWeight: 600, textDecoration: 'none', color: 'primary.main' }}>
            {row.name}
          </Box>
          {row.note && (
            <Box sx={{ fontSize: 12, color: 'text.secondary', display: 'block' }}>{row.note}</Box>
          )}
        </Box>
      ),
    },
    { id: 'article', label: 'Артикул' },
    { id: 'warehouseCell', label: 'Ячейка' },
    {
      id: 'quantity',
      label: 'Кол-во',
      align: 'right',
      render: (row) => (row.quantity > 0 ? row.quantity : <Box component="span" sx={{ color: 'error.main' }}>0</Box>),
    },
    {
      id: 'price',
      label: 'Цена',
      align: 'right',
      render: (row) => <PriceText component={row} showManualWarning={isStaff} />,
    },
    {
      id: 'status',
      label: 'Статус',
      render: (row) => <StatusChip label={COMPONENT_STATUS_LABELS[row.status]} color={COMPONENT_STATUS_COLOR[row.status]} />,
    },
    {
      id: 'actions',
      label: 'Действия',
      align: 'right',
      render: (row) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Карточка запчасти">
            <IconButton size="small" component={RouterLink} to={`/components/${row.id}`} aria-label="Открыть">
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Запросить закупку">
            <IconButton size="small" onClick={() => setRequestTarget(row)} aria-label="Запросить закупку">
              <ShoppingCartOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isStaff && <WebSearchButton size="small" initialName={row.name} initialArticle={row.article} />}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Каталог запчастей"
        subtitle={`Позиций: ${total}`}
        actions={<WebSearchButton />}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
        <TextField
          size="small"
          label="Поиск по наименованию, артикулу, ячейке"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: 320, flexGrow: 1, maxWidth: 480 }}
        />
        <TextField
          size="small"
          select
          label="Статус"
          value={statusInput}
          onChange={(e) => setStatusInput(e.target.value as typeof statusInput)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Все статусы</MenuItem>
          {Object.entries(COMPONENT_STATUS_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {items.length === 0 && !loading && total === 0 ? (
        <EmptyState
          title="Запчастей не найдено"
          description="Измените условия поиска или фильтр статуса. Добавление позиций доступно модератору и администратору в разделе «Запчасти»."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          loading={loading}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: (newPage) => void fetchPage({ page: newPage }),
            onPageSizeChange: (newPageSize) => void fetchPage({ page: 1, pageSize: newPageSize }),
          }}
        />
      )}

      <RequestDialog open={requestTarget !== null} onClose={() => setRequestTarget(null)} component={requestTarget} />
    </>
  );
}
