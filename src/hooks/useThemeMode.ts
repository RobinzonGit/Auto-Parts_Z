import { useUiStore } from '@/store/uiStore';

/** Доступ к режиму темы и переключателю (значок солнце/луна в AppBar). */
export function useThemeMode(): { mode: 'light' | 'dark'; toggleMode: () => void } {
  const mode = useUiStore((s) => s.mode);
  const toggleMode = useUiStore((s) => s.toggleMode);
  return { mode, toggleMode };
}
