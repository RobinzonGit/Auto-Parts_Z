import { createTheme, type Theme } from '@mui/material/styles';
import type { PaletteOptions, ThemeOptions } from '@mui/material/styles';

/** Режимы темы приложения. */
export type ThemeMode = 'light' | 'dark';

/** Светлая палитра: глубокий синий (primary) + янтарный (secondary). */
const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: { main: '#1e40af' },
  secondary: { main: '#f59e0b' },
  error: { main: '#d32f2f' },
  background: { default: '#f4f6fa', paper: '#ffffff' },
};

/** Тёмная палитра: индиго (primary) + тёплый оранжевый (secondary). */
const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: { main: '#7986cb' },
  secondary: { main: '#ffb74d' },
  error: { main: '#ef5350' },
  background: { default: '#111318', paper: '#1a1d24' },
};

const baseOptions: ThemeOptions = {
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'].join(
      ',',
    ),
    button: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, textTransform: 'none' } },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiCard: { defaultProps: { elevation: 0 } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700 } } },
  },
};

/** Собирает тему MUI для указанного режима. */
export function buildTheme(mode: ThemeMode): Theme {
  return createTheme({
    ...baseOptions,
    palette: mode === 'light' ? lightPalette : darkPalette,
  });
}
