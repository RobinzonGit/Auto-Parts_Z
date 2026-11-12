import { useEffect, useMemo } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { buildTheme } from '@/theme/theme';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from '@/components/LoadingScreen';

/** Корневой компонент: тема, глобальные стили, роутер и восстановление сессии. */
export default function App() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => buildTheme(mode), [mode]);

  const init = useAuthStore((s) => s.init);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void init();
  }, [init]);

  // Не показываем маршруты, пока не восстановлена сессия (иначе мигает форма входа).
  if (status !== 'ready') {
    return <LoadingScreen message="Инициализация склада…" />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
