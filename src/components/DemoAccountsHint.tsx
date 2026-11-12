import { useState, type ReactNode } from 'react';
import { Alert, Button, Collapse, IconButton, Typography } from '@mui/material';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';

/**
 * Раскрывающаяся подсказка с тестовыми учётными записями на странице входа.
 * Только для MVP: в боевом окружении блок следует убрать.
 */
export const DEMO_ACCOUNTS: Array<{ email: string; password: string; role: string }> = [
  { email: 'admin@autoparts.local', password: 'Admin123!', role: 'Администратор' },
  { email: 'moderator@autoparts.local', password: 'Moder123!', role: 'Модератор' },
  { email: 'user@autoparts.local', password: 'User123!', role: 'Пользователь' },
];

interface DemoAccountsHintProps {
  onPick: (email: string, password: string) => void;
}

export function DemoAccountsHint({ onPick }: DemoAccountsHintProps): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="small" onClick={() => setOpen((v) => !v)} sx={{ alignSelf: 'flex-start' }}>
        Тестовые аккаунты {open ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />}
      </Button>
      <Collapse in={open}>
        <Alert severity="info" sx={{ width: '100%', mt: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Демо-данные создаются при первом запуске:
          </Typography>
          {DEMO_ACCOUNTS.map((account) => (
            <Typography key={account.email} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <b>{account.role}:</b> {account.email} / {account.password}
              <IconButton size="small" onClick={() => onPick(account.email, account.password)} aria-label="Заполнить форму">
                <ExpandMoreOutlinedIcon fontSize="inherit" sx={{ transform: 'rotate(-90deg)' }} />
              </IconButton>
            </Typography>
          ))}
        </Alert>
      </Collapse>
    </>
  );
}
