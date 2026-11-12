import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  ImageList,
  ImageListItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import type { Component } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useComponentsStore } from '@/store/componentsStore';
import { useUiStore } from '@/store/uiStore';
import { calcPrice, isManualPrice } from '@/utils/calc';
import { formatDateTime } from '@/utils/format';
import { COMPONENT_STATUS_LABELS, COMPONENT_STATUS_COLOR } from '@/utils/labels';
import { PageHeader } from '@/components/PageHeader';
import { StatusChip } from '@/components/StatusChip';
import { PriceText } from '@/components/PriceText';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ComponentFormDialog } from '@/components/component/ComponentFormDialog';
import { RequestDialog } from '@/components/request/RequestDialog';
import { WebSearchButton } from '@/components/web-search/WebSearchButton';

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Box>
  );
}

/** Карточка запчасти: детали, фото, кнопка-облачко (админ), CRUD для staff. */
export function ComponentPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const getById = useComponentsStore((s) => s.getById);
  const remove = useComponentsStore((s) => s.remove);
  const update = useComponentsStore((s) => s.update);
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  const [component, setComponent] = useState<Component | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const reload = useCallback(async () => {
    const loaded = await getById(id);
    if (!loaded) setNotFound(true);
    else setComponent(loaded);
  }, [id, getById]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (notFound) {
    return (
      <Alert severity="warning" action={<Button component={RouterLink} to="/catalog">В каталог</Button>}>
        Запчасть не найдена — возможно, она была удалена.
      </Alert>
    );
  }
  if (!component) return null;

  const manual = isManualPrice(component.price, component.purchasePrice, component.markupPercent);
  const computed = calcPrice(component.purchasePrice, component.markupPercent);

  const handleResetPrice = async (): Promise<void> => {
    try {
      await update(component.id, { price: computed });
      await reload();
      showSnackbar('Цена сброшена к расчётной');
    } catch {
      /* ошибка в снекбаре */
    }
  };

  return (
    <>
      <PageHeader
        title={component.name}
        subtitle={`Артикул: ${component.article} · Обновлено ${formatDateTime(component.updatedAt)}`}
        actions={
          <>
            <Tooltip title="Назад в каталог">
              <IconButton component={RouterLink} to="/catalog" aria-label="Назад">
                <ArrowBackOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Button startIcon={<ShoppingCartOutlinedIcon />} onClick={() => setRequestOpen(true)}>
              Запросить закупку
            </Button>
            {/* Кнопка-облачко: поиск в интернете, только администратор */}
            <WebSearchButton initialName={component.name} initialArticle={component.article} />
            {isStaff && (
              <>
                <Button startIcon={<EditOutlinedIcon />} onClick={() => setEditOpen(true)}>
                  Редактировать
                </Button>
                <Tooltip title="Удалить запчасть">
                  <IconButton color="error" onClick={() => setDeleteOpen(true)} aria-label="Удалить">
                    <DeleteOutlinedIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              {component.photo ? (
                <ImageList sx={{ m: 0 }} cols={1} rowHeight={320}>
                  <ImageListItem>
                    <img src={component.photo} alt={component.name} style={{ borderRadius: 12, objectFit: 'cover', height: 320 }} />
                  </ImageListItem>
                </ImageList>
              ) : (
                <Box
                  sx={{
                    height: 320,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageOutlinedIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <StatusChip label={COMPONENT_STATUS_LABELS[component.status]} color={COMPONENT_STATUS_COLOR[component.status]} />
                <PriceText component={component} showManualWarning={isStaff} />
                {manual && isStaff && (
                  <Tooltip title="Сбросить к расчётной: закупка × (1 + наценка / 100)">
                    <Button size="small" startIcon={<RestartAltOutlinedIcon />} onClick={() => void handleResetPrice()}>
                      Сбросить к расчётной ({computed.toFixed(2)} ₽)
                    </Button>
                  </Tooltip>
                )}
              </Stack>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <DetailItem label="Ячейка склада" value={component.warehouseCell} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailItem
                    label="Количество"
                    value={component.quantity > 0 ? component.quantity : <Box component="span" sx={{ color: 'error.main' }}>0</Box>}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailItem label="Цена продажи" value={<PriceText component={component} />} />
                </Grid>
                {isStaff && (
                  <>
                    <Grid item xs={6} sm={4}>
                      <DetailItem label="Закупочная цена" value={component.purchasePrice.toFixed(2)} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <DetailItem label="Наценка" value={`${component.markupPercent}%`} />
                    </Grid>
                  </>
                )}
                <Grid item xs={6} sm={4}>
                  <DetailItem label="Создано" value={formatDateTime(component.createdAt)} />
                </Grid>
              </Grid>

              {component.note && (
                <>
                  <Divider />
                  <DetailItem label="Примечание" value={component.note} />
                </>
              )}

              {component.searchUrl && (
                <>
                  <Divider />
                  <Button
                    href={component.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<OpenInNewOutlinedIcon />}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Открыть ссылку для поиска
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ComponentFormDialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          void reload();
        }}
        initial={component}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleteOpen(false);
          try {
            await remove(component.id);
            navigate('/catalog');
          } catch {
            /* ошибка в снекбаре */
          }
        }}
        title="Удалить запчасть?"
        message={`«${component.name}» (артикул ${component.article}) будет удалена без возможности восстановления.`}
        confirmText="Удалить"
        danger
      />
      <RequestDialog open={requestOpen} onClose={() => setRequestOpen(false)} component={component} />
    </>
  );
}
