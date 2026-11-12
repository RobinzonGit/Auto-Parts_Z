import type { ComponentStatus, RequestStatus, Role } from '@/types';
import type { AlertColor } from '@mui/material/Alert';

/** Допустимые цвета Chip/Alert в приложении. */
export type StatusColor = AlertColor | 'default' | 'primary' | 'secondary';

/** Русские подписи ролей. */
export const ROLE_LABELS: Record<Role, string> = {
  user: 'Пользователь',
  moderator: 'Модератор',
  admin: 'Администратор',
};

/** Цвет чипа роли. */
export const ROLE_CHIP_COLOR: Record<Role, StatusColor> = {
  user: 'default',
  moderator: 'secondary',
  admin: 'primary',
};

/** Русские подписи статусов запчасти. */
export const COMPONENT_STATUS_LABELS: Record<ComponentStatus, string> = {
  active: 'Активна',
  archived: 'В архиве',
  out_of_stock: 'Нет в наличии',
};

/** Цвет чипа статуса запчасти. */
export const COMPONENT_STATUS_COLOR: Record<ComponentStatus, StatusColor> = {
  active: 'success',
  archived: 'default',
  out_of_stock: 'error',
};

/** Русские подписи статусов запроса. */
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Выполнена',
  cancelled: 'Отменена',
};

/** Цвет чипа статуса запроса. */
export const REQUEST_STATUS_COLOR: Record<RequestStatus, StatusColor> = {
  new: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'default',
};
