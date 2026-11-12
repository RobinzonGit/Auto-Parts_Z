import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { Component, ComponentStatus } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useComponents } from '@/hooks/useComponents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { parseImportContent, IMPORT_TEMPLATE, type ImportParseResult } from '@/features/components/importUtils';
import { COMPONENT_STATUS_LABELS, COMPONENT_STATUS_COLOR } from '@/utils/labels';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { StatusChip } from '@/components/StatusChip';
import { PriceText } from '@/components/PriceText';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ComponentFormDialog } from '@/components/component/ComponentFormDialog';
import { WebSearchButton } from '@/components/web-search/WebSearchButton';

const STATUS_FILTERS: ComponentStatus[] = ['active', 'archived', 'out_of_stock'];

/** Администрирование: управление запчастями (CRUD, импорт) — moderator/admin. */
export function AdminComponentsPage() {
  const { isAdmin, isStaff } = useAuth();
  const { items, total, page, pageSize, loading, fetchPage, remove, importItems } = useComponents();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [statusInput, setStatusInput] = useState<ComponentStatus | 'all'>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Component | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Component | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportParseResult | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetchPage({ page: 1, search: debouncedSearch, status: statusInput });
  }, [debouncedSearch, statusInput, fetchPage]);

  const handleImportFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const text = await file.text();
    setImportPreview(parseImportContent(file.name, text));
  };

  const handleImportConfirm = async (): Promise<void> => {
    if (!importPreview) return;
    const rows = importPreview.rows
      .filter((r) => r.data)
      .map((r) => r.data as NonNullable<typeof r.data>);
    try {
      await importItems(rows);
    } catch {
      /* ошибка в снекбаре */
    } finally {
      setImportOpen(false);
      setImportPreview(null);
    }
  };

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
            <ImageOutlinedIcon color="disabled" sx={{ fontSize: 20 }} />
          </Avatar>
        ),
    },
    {
      id: 'name',
      label: 'Наименование',
      render: (row) => (
        <Box component={RouterLink} to={`/components/${row.id}`} sx={{ fontWeight: 600, textDecoration: 'none', color: 'primary.main' }}>
          {row.name}
        </Box>
      ),
    },
    { id: 'article', label: 'Артикул' },
    { id: 'warehouseCell', label: 'Ячейка' },
    { id: 'quantity', label: 'Кол-во', align: 'right' },
    { id: 'purchasePrice', label: 'Закупка, ₽', align: 'right', render: (row) => row.purchasePrice.toFixed(2) },
    { id: 'markupPercent', label: 'Наценка, %', align: 'right' },
    { id: 'price', label: 'Цена', align: 'right', render: (row) => <PriceText component={row} showManualWarning /> },
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
          <Tooltip title="Редактировать">
            <IconButton size="small" onClick={() => setEditTarget(row)} aria-label="Редактировать">
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)} aria-label="Удалить">
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isAdmin && <WebSearchButton size="small" initialName={row.name} initialArticle={row.article} />}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Управление запчастями"
        subtitle={`Позиций: ${total}`}
        actions={
          <>
            <WebSearchButton />
            <Button startIcon={<UploadFileOutlinedIcon />} onClick={() => { setImportPreview(null); setImportOpen(true); }}>
              Импорт
            </Button>
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              onClick={() => { setEditTarget(null); setFormOpen(true); }}
            >
              Добавить
            </Button>
          </>
        }
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
          onChange={(e) => setStatusInput(e.target.value as ComponentStatus | 'all')}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Все статусы</MenuItem>
          {STATUS_FILTERS.map((status) => (
            <MenuItem key={status} value={status}>
              {COMPONENT_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

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

      <ComponentFormDialog
        open={formOpen || editTarget !== null}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        initial={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          try {
            await remove(target.id);
          } catch {
            /* ошибка в снекбаре */
          }
        }}
        title="Удалить запчасть?"
        message={`«${deleteTarget?.name ?? ''}» (артикул ${deleteTarget?.article ?? ''}) будет удалена без возможности восстановления.`}
        confirmText="Удалить"
        danger
      />

      {/* Диалог импорта CSV/JSON */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Импорт запчастей из файла</DialogTitle>
        <DialogContent>
          {isStaff && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Поддерживаются CSV (разделитель «,» или «;») и JSON. Первая строка CSV — заголовки:
                name (наименование,название), article (артикул), purchasePrice (закупка,ценазакупки,цена закупки),
                markupPercent (наценка,маржа,наценка,процент наценки), warehouseCell (ячейка,склад',место), quantity (количество,кол-во,колво),комментарии, searchUrl, status.
              </Alert>
              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {IMPORT_TEMPLATE}
                </Typography>
              </Box>
              <input
                hidden
                ref={importFileRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={(e) => void handleImportFile(e.target.files?.[0])}
              />
              <Button variant="outlined" onClick={() => importFileRef.current?.click()} startIcon={<UploadFileOutlinedIcon />}>
                Выбрать файл (.csv / .json)
              </Button>

              {importPreview && (
                <Box sx={{ mt: 2 }}>
                  {importPreview.validCount > 0 ? (
                    <Alert severity="success" sx={{ mb: 1 }}>
                      Готово к импорту: {importPreview.validCount} позиций.
                    </Alert>
                  ) : (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      Валидных строк не найдено.
                    </Alert>
                  )}
                  {importPreview.errorCount > 0 && (
                    <Alert severity="warning">
                      Ошибок: {importPreview.errorCount}. Проблемные строки будут пропущены:
                      <Box component="ul" sx={{ m: 1, pl: 2 }}>
                        {importPreview.rows
                          .filter((r) => r.errors)
                          .slice(0, 8)
                          .map((r) => (
                            <li key={r.row}>
                              Строка {r.row}: {Object.values(r.errors ?? {}).join('; ')}
                            </li>
                          ))}
                      </Box>
                    </Alert>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Закрыть</Button>
          <Button
            variant="contained"
            disabled={!importPreview || importPreview.validCount === 0}
            onClick={() => void handleImportConfirm()}
          >
            Импортировать
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
