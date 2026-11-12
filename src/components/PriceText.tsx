import { Box, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { Component } from '@/types';
import { formatPrice } from '@/utils/format';
import { isManualPrice } from '@/utils/calc';

interface PriceTextProps {
  component: Component;
  /** Показывать значок «цена задана вручную» (для staff). */
  showManualWarning?: boolean;
}

/** Цена продажи; если она отличается от расчётной — предупреждающий значок. */
export function PriceText({ component, showManualWarning = false }: PriceTextProps) {
  const manual = isManualPrice(component.price, component.purchasePrice, component.markupPercent);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography component="span" fontWeight={600}>
        {formatPrice(component.price)}
      </Typography>
      {manual && showManualWarning && (
        <Tooltip title="Цена задана вручную и отличается от расчётной (закупка × (1 + наценка))">
          <InfoOutlinedIcon fontSize="small" color="warning" />
        </Tooltip>
      )}
    </Box>
  );
}
