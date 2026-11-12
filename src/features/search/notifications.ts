import { useUiStore } from '@/store/uiStore';

/** Изолированный хелпер уведомлений, чтобы схемы не зависели от React-контекста. */
export function showSnackbar(message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success'): void {
  useUiStore.getState().showSnackbar(message, severity);
}
