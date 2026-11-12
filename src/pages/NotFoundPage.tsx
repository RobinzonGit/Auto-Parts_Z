import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

/** Страница 404. */
export function NotFoundPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 2 }}>
      <Typography variant="h1" fontWeight={800} color="primary">
        404
      </Typography>
      <Typography variant="h6">Страница не найдена</Typography>
      <Button component={Link} to="/catalog" variant="contained">
        Перейти в каталог
      </Button>
    </Box>
  );
}
