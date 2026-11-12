import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import { useAuth } from '@/hooks/useAuth';
import { WebSearchDialog } from './WebSearchDialog';

interface WebSearchButtonProps {
  /** Предзаполнение диалога из контекста (карточка запчасти, строка таблицы). */
  initialName?: string;
  initialArticle?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Кнопка-облачко «Поиск в интернете» — ТОЛЬКО для администратора.
 * Для остальных ролей кнопка не рендерится; в диалоге есть вторая проверка роли.
 */
export function WebSearchButton({ initialName, initialArticle, size = 'medium' }: WebSearchButtonProps) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  // Доступ строго ограничен ролью admin.
  if (!isAdmin) return null;

  return (
    <>
      <Tooltip title="Поиск в интернете по наименованию и(или) артикулу (Google / Яндекс)">
        <IconButton
          color="primary"
          size={size}
          aria-label="Поиск в интернете"
          onClick={() => setOpen(true)}
        >
          <CloudOutlinedIcon />
        </IconButton>
      </Tooltip>

      <WebSearchDialog
        open={open}
        onClose={() => setOpen(false)}
        initialName={initialName}
        initialArticle={initialArticle}
      />
    </>
  );
}
