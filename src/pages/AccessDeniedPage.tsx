import { Box, Button, Typography } from '@mui/material';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { Link } from 'react-router-dom';

/** Страница 403: роль не позволяет открыть раздел. */
export function AccessDeniedPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 2, textAlign: 'center' }}>
      <BlockOutlinedIcon sx={{ fontSize: 56, color: 'error.main' }} />
      <Typography variant="h5" fontWeight={700}>
        Доступ запрещён
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460 }}>
        У вашей роли нет прав для этого раздела. Обратитесь к администратору,
        если считаете, что доступ должен быть предоставлен.
      </Typography>
      <Button component={Link} to="/catalog" variant="contained">
        Вернуться в каталог
      </Button>
    </Box>
  );
}
