import { create } from 'zustand';
import type { AlertColor } from '@mui/material/Alert';
import type { ThemeMode } from '@/theme/theme';

/** Ключ localStorage для выбранного режима темы. */
const THEME_KEY = 'autoparts.theme';

/** Определяет стартовый режим: сохранённый выбор, иначе системная настройка. */
function detectInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage недоступен — игнорируем */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface UiState {
  mode: ThemeMode;
  toggleMode: () => void;
  snackbar: SnackbarState;
  showSnackbar: (message: string, severity?: AlertColor) => void;
  hideSnackbar: () => void;
}

/** Глобальное UI-состояние: тема и снекбар уведомлений. */
export const useUiStore = create<UiState>()((set, get) => ({
  mode: detectInitialMode(),
  toggleMode: () => {
    const next: ThemeMode = get().mode === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* игнорируем */
    }
    set({ mode: next });
  },
  snackbar: { open: false, message: '', severity: 'success' },
  showSnackbar: (message, severity = 'success') => set({ snackbar: { open: true, message, severity } }),
  hideSnackbar: () => set((s) => ({ snackbar: { ...s.snackbar, open: false } })),
}));
