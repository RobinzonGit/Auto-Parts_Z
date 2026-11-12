import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { FormTextField } from '@/components/FormTextField';
import {
  assertAdminForWebSearch,
  SEARCH_ENGINE_OPTIONS,
  webSearchSchema,
  type WebSearchFormValues,
} from '@/features/search/schemas';
import {
  buildSearchQuery,
  getEngineLabel,
  loadLastEngine,
  openWebSearch,
  saveLastEngine,
} from '@/utils/webSearch';

interface WebSearchDialogProps {
  open: boolean;
  onClose: () => void;
  /** Предзаполнение из карточки/строки таблицы. */
  initialName?: string;
  initialArticle?: string;
}

/**
 * Диалог «Поиск в интернете» (кнопка-облачко, доступна только администратору).
 * Ищет по наименованию и(или) артикулу в выбранной поисковой системе
 * (Google или Яндекс) и открывает результат в новой вкладке.
 */
export function WebSearchDialog({ open, onClose, initialName = '', initialArticle = '' }: WebSearchDialogProps) {
  const { control, handleSubmit, watch, reset } = useForm<WebSearchFormValues>({
    resolver: zodResolver(webSearchSchema),
    defaultValues: {
      name: initialName,
      article: initialArticle,
      engine: loadLastEngine(),
    },
  });

  // При каждом открытии диалога подставляем актуальные значения.
  useEffect(() => {
    if (open) {
      reset({
        name: initialName,
        article: initialArticle,
        engine: loadLastEngine(),
      });
    }
  }, [open, initialName, initialArticle, reset]);

  const engine = watch('engine');
  const previewQuery = buildSearchQuery({ name: watch('name'), article: watch('article') });

  const onSubmit = async (values: WebSearchFormValues): Promise<void> => {
    // Защита на уровне логики: кнопка скрыта для не-админов, но проверяем и здесь.
    if (!assertAdminForWebSearch()) return;
    const opened = openWebSearch(values.engine, { name: values.name, article: values.article });
    if (opened) {
      saveLastEngine(values.engine);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudOutlinedIcon color="primary" />
        Поиск в интернете
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Запрос откроется в новой вкладке выбранной поисковой системы.
          </Typography>

          <Stack spacing={2}>
            <FormTextField
              name="name"
              control={control}
              label="Наименование запчасти"
              placeholder="Например, Колодки тормозные передние"
              autoFocus
            />
            <FormTextField name="article" control={control} label="Артикул" placeholder="Например, BP-4521" />

            <FormControl>
              <FormLabel sx={{ fontSize: 13 }}>Поисковая система</FormLabel>
              <Controller
                name="engine"
                control={control}
                render={({ field }) => (
                  <RadioGroup row value={field.value} onChange={(_event, value) => field.onChange(value)}>
                    {SEARCH_ENGINE_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio />}
                        label={option.label}
                      />
                    ))}
                  </RadioGroup>
                )}
              />
            </FormControl>

            {previewQuery && (
              <Typography variant="body2" sx={{ px: 1.5, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                Запрос: <b>«{previewQuery}»</b> — {getEngineLabel(engine)}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" startIcon={<OpenInNewOutlinedIcon />} disabled={!previewQuery}>
            Открыть в {getEngineLabel(engine)}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
