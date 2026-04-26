import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';

interface RatingBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  sx?: any;
}

const sizeMap = {
  small: {
    px: 1,
    py: 0.25,
    score: '0.75rem',
    suffix: '0.55rem',
    gap: 0.25,
  },
  medium: {
    px: 1.25,
    py: 0.4,
    score: '0.95rem',
    suffix: '0.625rem',
    gap: 0.35,
  },
  large: {
    px: 1.75,
    py: 0.6,
    score: '1.4rem',
    suffix: '0.7rem',
    gap: 0.5,
  },
} as const;

const RatingBadge: React.FC<RatingBadgeProps> = ({ score, size = 'medium', sx }) => {
  const theme = useTheme();
  const dims = sizeMap[size];
  const isLarge = size === 'large';
  const numeric = typeof score === 'number';
  const display = numeric ? (isLarge ? score.toFixed(1) : score.toFixed(0)) : score;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: dims.gap,
        px: dims.px,
        py: dims.py,
        borderRadius: theme.tokens.radius.pill + 'px',
        background: theme.tokens.accent.gradient,
        color: theme.palette.primary.contrastText,
        boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.28)}, inset 0 1px 0 ${alpha('#ffffff', 0.2)}`,
        minWidth: 'fit-content',
        lineHeight: 1,
        ...sx,
      }}
    >
      <Box
        component="span"
        sx={{
          fontWeight: 800,
          lineHeight: 1,
          fontSize: dims.score,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          display: 'inline-block',
        }}
      >
        {display}
      </Box>
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          lineHeight: 1,
          fontSize: dims.suffix,
          opacity: 0.75,
          letterSpacing: '0.02em',
          display: 'inline-block',
          mt: '1px',
        }}
      >
        / 10
      </Box>
    </Box>
  );
};

export default RatingBadge;
