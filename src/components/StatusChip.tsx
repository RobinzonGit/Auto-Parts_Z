import type { ReactNode } from 'react';
import { Chip } from '@mui/material';

interface StatusChipProps {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  size?: 'small' | 'medium';
  children?: ReactNode;
}

/** Чип статуса/роли с русскими подписями из utils/labels. */
export function StatusChip({ label, color, size = 'small' }: StatusChipProps) {
  return <Chip label={label} color={color} size={size} variant={color === 'default' ? 'outlined' : 'filled'} />;
}
