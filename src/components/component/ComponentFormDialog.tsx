import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import type { Component } from '@/types';
import {
  componentFormSchema,
  COMPONENT_STATUSES,
  type ComponentFormValues,
} from '@/features/components/schemas';
import { useComponentsStore } from '@/store/componentsStore';
import { calcPrice, isManualPrice } from '@/utils/calc';
import { processPhotoFile } from '@/utils/image';
import { COMPONENT_STATUS_LABELS } from '@/utils/labels';
import { FormTextField } from '@/components/FormTextField';

interface ComponentFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** null — создание новой позиции. */
  initial?: Component | null;
}

/**
 * Диалог создания/редактирования запчасти.
 * Фото хранится как base64-строка и передаётся в репозиторий
 * ТОЛЬКО если пользователь его действительно изменил.
 */
export function ComponentFormDialog({
  open,
  onClose,
  initial = null,
}: ComponentFormDialogProps) {
  const { create, update } = useComponentsStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [manualPrice, setManualPrice] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  // Флаг: менял ли пользователь фото в этой сессии редактирования.
  const [photoChanged, setPhotoChanged] = useState(false);
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
      photo: initial?.photo ?? undefined,
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
    if (!open) return;
    reset(defaults);
    setPhoto(initial?.photo ?? undefined);
    setPhotoChanged(false);
    setManualPrice(
      initial
        ? isManualPrice(
            initial.price,
            initial.purchasePrice,
            initial.markupPercent,
          )
        : false,
    );
  }, [open, initial, defaults, reset]);

  const purchasePriceRaw = watch('purchasePrice');
  const markupPercentRaw = watch('markupPercent');

  // MUI TextField с type="number" отдаёт строку — приводим к числу.
  const purchasePrice = Number(purchasePriceRaw);
  const markupPercent = Number(markupPercentRaw);

  const bothNumbers =
    Number.isFinite(purchasePrice) &&
    Number.isFinite(markupPercent) &&
    String(purchasePriceRaw).trim() !== '' &&
    String(markupPercentRaw).trim() !== '';

  const computedPrice = bothNumbers
    ? calcPrice(purchasePrice, markupPercent)
    : null;

  // Автопересчёт цены, пока пользователь не включил ручной режим.
  useEffect(() => {
    if (manualPrice) return;
    if (!bothNumbers) return;
    const next = calcPrice(purchasePrice, markupPercent);
    setValue('price', Number(next.toFixed(2)), {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [purchasePrice, markupPercent, bothNumbers, manualPrice, setValue]);

  const onSubmit = async (values: ComponentFormValues): Promise<void> => {
    setSaving(true);
    try {
      // Передаём photo только если его меняли. Иначе поле отсутствует
      // в патче, и репозиторий не трогает старое фото в Firestore.
      const payload = {
        ...values,
        ...(photoChanged ? { photo: photo ?? null } : {}),
      };

      if (initial) {
        await update(initial.id, payload);
      } else {
        // При создании photo передаём всегда — там его ещё нет.
        await create({ ...values, photo: photo ?? null });
      }
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения запчасти:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Не удалось сохранить запчасть. Попробуйте ещё раз.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const dataUrl = await processPhotoFile(file);
      setPhoto(dataUrl);
      setPhotoChanged(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось обработать изображение.';
      alert(message);
    }
  };

  const handleRemovePhoto = (): void => {
    setPhoto(undefined);
    setPhotoChanged(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initial ? 'Редактирование запчасти' : 'Новая запчасть'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {photo ? (
                <Avatar
                  src={photo}
                  variant="rounded"
                  sx={{ width: 72, height: 72 }}
                />
              ) : (
                <Avatar
                  variant="rounded"
                  sx={{ width: 72, height: 72, bgcolor: 'action.hover' }}
                >
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
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Загрузить фото
                </Button>
                {photo && (
                  <Tooltip title="Удалить фото">
                    <IconButton
                      onClick={handleRemovePhoto}
                      aria-label="Удалить фото"
                    >
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
              {/* Поле цены через Controller: различаем программный setValue
                  и реальный ввод пользователя. */}
              <Controller
                name="price"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      setManualPrice(true);
                      const raw = e.target.value;
                      field.onChange(
                        raw === '' ? ('' as unknown as number) : Number(raw),
                      );
                    }}
                    label="Цена продажи, ₽"
                    type="number"
                    fullWidth
                    error={Boolean(fieldState.error)}
                    helperText={
                      fieldState.error?.message ??
                      (manualPrice
                        ? 'Цена задана вручную (отличается от расчётной).'
                        : computedPrice !== null
                          ? `Расчётная цена: ${computedPrice.toFixed(2)} ₽`
                          : 'По умолчанию: закупка × (1 + наценка / 100).')
                    }
                    inputProps={{ step: '0.01', min: 0 }}
                    InputProps={{
                      endAdornment: manualPrice ? (
                        <Tooltip title="Сбросить к расчётной цене">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setManualPrice(false);
                              if (computedPrice !== null) {
                                setValue(
                                  'price',
                                  Number(computedPrice.toFixed(2)),
                                  {
                                    shouldValidate: true,
                                    shouldDirty: false,
                                  },
                                );
                              }
                            }}
                            aria-label="Сбросить к расчётной цене"
                          >
                            <RestartAltOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                      ) : undefined,
                    }}
                  />
                )}
              />
              {manualPrice && (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label="Ручная цена"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>

            <Stack direction="row" spacing={2}>
              <FormTextField
                name="warehouseCell"
                control={control}
                label="Ячейка склада"
              />
              <FormTextField
                name="quantity"
                control={control}
                label="Количество"
                type="number"
                inputProps={{ min: 0 }}
              />
            </Stack>

            <FormTextField
              name="searchUrl"
              control={control}
              label="Ссылка поставщика (http/https)"
            />
            <FormTextField
              name="note"
              control={control}
              label="Примечание"
              multiline
              minRows={2}
            />

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
            {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}