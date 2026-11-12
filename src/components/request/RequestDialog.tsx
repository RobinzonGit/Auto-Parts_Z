import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import type { Component } from '@/types';
import { createRequestSchema, type CreateRequestFormValues } from '@/features/requests/schemas';
import { useRequestsStore } from '@/store/requestsStore';
import { FormTextField } from '@/components/FormTextField';

interface RequestDialogProps {
  open: boolean;
  onClose: () => void;
  component: Component | null;
}

/** Диалог «Запросить закупку» для позиции каталога. */
export function RequestDialog({ open, onClose, component }: RequestDialogProps) {
  const create = useRequestsStore((s) => s.create);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateRequestFormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: { quantity: 1 as unknown as number, comment: '' },
  });

  useEffect(() => {
    if (open) reset({ quantity: 1 as unknown as number, comment: '' });
  }, [open, reset]);

  const onSubmit = async (values: CreateRequestFormValues): Promise<void> => {
    if (!component) return;
    try {
      await create({ componentId: component.id, quantity: values.quantity, comment: values.comment || undefined });
      onClose();
    } catch {
      /* ошибка показана в снекбаре */
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Запрос на закупку</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          {component && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {component.name} · артикул {component.article}
            </Typography>
          )}
          <Stack spacing={2}>
            <FormTextField name="quantity" control={control} label="Количество" type="number" inputProps={{ min: 1 }} />
            <FormTextField name="comment" control={control} label="Комментарий (необязательно)" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Отправить запрос
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
