import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import BlockIcon from '@mui/icons-material/Block';

interface StatusBadgeProps {
  isLegacy?: boolean;
  isAvailable?: boolean;
  size?: 'small' | 'medium';
  sx?: any;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  isLegacy,
  isAvailable,
  size = 'medium',
  sx,
}) => {
  const theme = useTheme();
  const isSmall = size === 'small';

  if (isAvailable && !isLegacy) return null;

  const label = isLegacy ? 'Limited' : 'Out of Stock';
  const color = isLegacy ? theme.palette.warning.main : theme.palette.error.main;
  const Icon = isLegacy ? HistoryIcon : BlockIcon;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: alpha(color, 0.9),
        color: '#fff',
        px: isSmall ? 0.8 : 1.2,
        py: isSmall ? 0.2 : 0.4,
        borderRadius: 1.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(4px)',
        border: '1px solid',
        borderColor: alpha('#fff', 0.2),
        ...sx,
      }}
    >
      <Icon sx={{ fontSize: isSmall ? '0.7rem' : '0.9rem' }} />
      <Typography
        variant="caption"
        sx={{
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontSize: isSmall ? '0.55rem' : '0.65rem',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default StatusBadge;
