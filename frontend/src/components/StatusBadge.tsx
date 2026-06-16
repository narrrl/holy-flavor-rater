import React from 'react';
import { Box, Typography, alpha, useTheme, type SxProps, type Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  isLegacy?: boolean;
  isAvailable?: boolean;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

const sizeMap = {
  small: { px: 0.85, py: 0.3, dot: 5, font: '0.55rem', gap: 0.5 },
  medium: { px: 1.1, py: 0.45, dot: 6, font: '0.65rem', gap: 0.6 },
} as const;

const StatusBadge: React.FC<StatusBadgeProps> = ({
  isLegacy,
  isAvailable,
  size = 'medium',
  sx,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  if (isAvailable && !isLegacy) return null;

  const dims = sizeMap[size];
  const accent = isLegacy ? theme.palette.warning.main : theme.palette.error.main;
  const label = isLegacy
    ? t('status.limited', { defaultValue: 'Limited' })
    : t('status.outOfStock', { defaultValue: 'Out of Stock' });

  const isLight = theme.palette.mode === 'light';
  const surface = alpha(theme.palette.background.paper, isLight ? 0.85 : 0.55);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dims.gap,
        bgcolor: surface,
        backdropFilter: theme.tokens.glass.blur,
        WebkitBackdropFilter: theme.tokens.glass.blur,
        color: 'text.primary',
        px: dims.px,
        py: dims.py,
        borderRadius: theme.tokens.radius.pill + 'px',
        border: '1px solid',
        borderColor: alpha(accent, 0.4),
        boxShadow: `0 2px 8px ${alpha(accent, 0.18)}`,
        ...sx,
      }}
    >
      <Box
        sx={{
          width: dims.dot,
          height: dims.dot,
          borderRadius: '50%',
          bgcolor: accent,
          boxShadow: `0 0 0 2px ${alpha(accent, 0.2)}`,
          flexShrink: 0,
        }}
      />
      <Typography
        component="span"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: dims.font,
          lineHeight: 1,
          color: 'text.primary',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default StatusBadge;
