import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import type { Component } from '@/types';
import { componentFormSchema, COMPONENT_STATUSES, type ComponentFormValues } from '@/features/components/schemas';
import { useComponentsStore } from '@/store/componentsStore';
import { calcPrice, isManualPrice } from '@/utils/calc';
import { processPhotoFile } from '@/utils/image';
import { COMPONENT_STATUS_LABELS } from '@/utils/labels';
import { FormTextField } from '@/components/FormTextField';
import { MenuItem } from '@mui/material';

interface ComponentFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** null — создание новой позиции. */
  initial?: Component | null;
}

/** Диалог создания/редактирования запчасти: фото, авторасчёт цены, ручное переопределение. */
export function ComponentFormDialog({ open, onClose, initial = null }: ComponentFormDialogProps) {
  const { create, update } = useComponentsStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualPrice, setManualPrice] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const defaults = useMemo<ComponentFormValues>(
    () => ({
      name: initial?.name ?? '',
      article: initial?.article ?? '',
      purchasePrice: initial?.purchasePrice ?? ('' as unknown as number),
      markupPercent: initial?.markupPercent ?? ('' as unknown as number),
      price: initial?.price ?? ('' as unknown as number),
      warehouseCell: initial?.warehouseCell ?? '',
      quantity: initial?.quantity ?? ('' as unknown as number),
      searchUrl: initial?.searchUrl ?? '',
      note: initial?.note ?? '',
      status: initial?.status ?? 'active',
      photo: initial?.photo,
    }),
    [initial],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: defaults,
  });

  // При открытии/смене редактируемой записи — сброс формы.
  useEffect(() => {
    if (open) {
      reset(defaults);
      setPhoto(initial?.photo);
      setManualPrice(initial ? isManualPrice(initial.price, initial.purchasePrice, initial.markupPercent) : false);
    }
  }, [open, initial, defaults, reset]);

  const purchasePrice = watch('purchasePrice');
  const markupPercent = watch('markupPercent');

  // Автопересчёт цены, пока пользователь не переопределил её вручную.
  useEffect(() => {
    if (!manualPrice && typeof purchasePrice === 'number' && typeof markupPercent === 'number') {
      setValue('price', calcPrice(purchasePrice, markupPercent), { shouldValidate: false });
    }
  }, [purchasePrice, markupPercent, manualPrice, setValue]);

  const onSubmit = async (values: ComponentFormValues): Promise<void> => {
    setSaving(true);
    try {
      if (initial) {
        await update(initial.id, { ...values, photo });
      } else {
        await create({ ...values, photo });
      }
      onClose();
    } catch {
      // Ошибка уже показана в снекбаре.
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const dataUrl = await processPhotoFile(file);
      setPhoto(dataUrl);
    } catch (error) {
      // processPhotoFile бросает AppError с понятным сообщением.
      const message = error instanceof Error ? error.message : 'Не удалось обработать изображение.';
      alert(message);
    }
  };

  const computedPrice =
    typeof purchasePrice === 'number' && typeof markupPercent === 'number' ? calcPrice(purchasePrice, markupPercent) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Редактирование запчасти' : 'Новая запчасть'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {photo ? (
                <Avatar src={photo} variant="rounded" sx={{ width: 72, height: 72 }} />
              ) : (
                <Avatar variant="rounded" sx={{ width: 72, height: 72, bgcolor: 'action.hover' }}>
                  <ImageOutlinedIcon color="disabled" />
                </Avatar>
              )}
              <Stack direction="row" spacing={1}>
                <input
                  hidden
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleFileChange(e.target.files?.[0])}
                />
                <Button variant="outlined" size="small" onClick={() => fileInputRef.current?.click()}>
                  Загрузить фото
                </Button>
                {photo && (
                  <Tooltip title="Удалить фото">
                    <IconButton onClick={() => setPhoto(undefined)} aria-label="Удалить фото">
                      <CloudOffOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Только изображения, до 2 МБ.
                <br />
                Файл будет сжат автоматически.
              </Typography>
            </Box>

            <FormTextField name="name" control={control} label="Наименование" />
            <FormTextField name="article" control={control} label="Артикул" />

            <Stack direction="row" spacing={2}>
              <FormTextField
                name="purchasePrice"
                control={control}
                label="Закупочная цена, ₽"
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
              />
              <FormTextField
                name="markupPercent"
                control={control}
                label="Наценка, %"
                type="number"
                inputProps={{ step: '1', min: 0, max: 100 }}
              />
            </Stack>

            <Box>
              <FormTextField
                name="price"
                control={control}
                label="Цена продажи, ₽"
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
                onChangeCapture={() => setManualPrice(true)}
                helperText={
                  manualPrice
                    ? 'Цена задана вручную (отличается от расчётной).'
                    : computedPrice !== null
                      ? `Расчётная цена: ${computedPrice.toFixed(2)} ₽`
                      : 'По умолчанию: закупка × (1 + наценка / 100).'
                }
                InputProps={{
                  endAdornment: manualPrice ? (
                    <Tooltip title="Сбросить к расчётной цене">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setManualPrice(false);
                          if (computedPrice !== null) setValue('price', computedPrice);
                        }}
                        aria-label="Сбросить к расчётной цене"
                      >
                        <RestartAltOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  ) : undefined,
                }}
              />
              {manualPrice && (
                <Chip size="small" color="warning" variant="outlined" label="Ручная цена" sx={{ mt: 0.5 }} />
              )}
            </Box>

            <Stack direction="row" spacing={2}>
              <FormTextField name="warehouseCell" control={control} label="Ячейка склада" />
              <FormTextField name="quantity" control={control} label="Количество" type="number" inputProps={{ min: 0 }} />
            </Stack>

            <FormTextField name="searchUrl" control={control} label="Ссылка поставщика (http/https)" />
            <FormTextField name="note" control={control} label="Примечание" multiline minRows={2} />

            {/* <FormTextField name="status" control={control} label="Статус" select>
              {COMPONENT_STATUSES.map((status) => (
                <Box component="option" key={status} value={status}>
                  {COMPONENT_STATUS_LABELS[status]}
                </Box> */}
            <FormTextField name="status" control={control} label="Статус" select>
              {COMPONENT_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {COMPONENT_STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </FormTextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {initial ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
