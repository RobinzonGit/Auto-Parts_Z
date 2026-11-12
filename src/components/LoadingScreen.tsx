import { Box, CircularProgress, Typography } from '@mui/material';

/** Полноэкранный индикатор загрузки (восстановление сессии, инициализация). */
export function LoadingScreen({ message = 'Загрузка…' }: { message?: string }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={44} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
